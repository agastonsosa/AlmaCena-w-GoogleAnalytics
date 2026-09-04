"""AlmaCena: authenticated kitchen inventory and atomic production."""
import hashlib
import ipaddress
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse

import cloudinary.uploader
from flask import Flask, g, jsonify, request, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, get_jwt_identity, jwt_required
from flask_mail import Mail, Message
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException
from api.models import db, User, MateriasPrimas, UserMateriasPrimas, Receta, UserReceta, IngredientesReceta, UserProductoFinal, RevokedToken, ProductionLog
from api.models import RateCounter
from api.rate_storage import KitchenRateStorage  # Registers almacena:// with limits.

app = Flask(__name__)
secret = os.getenv('JWT_SECRET_KEY')
if not secret:
    if os.getenv('FLASK_DEBUG') != '1':
        raise RuntimeError('Set JWT_SECRET_KEY before starting AlmaCena.')
    secret = secrets.token_hex(32)
app.config.update(SECRET_KEY=secret, JWT_SECRET_KEY=secret, JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=2),
    SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL', 'sqlite:///almacena.sqlite').replace('postgres://', 'postgresql://'),
    SQLALCHEMY_TRACK_MODIFICATIONS=False, SQLALCHEMY_ENGINE_OPTIONS={'pool_pre_ping': True},
    MAX_CONTENT_LENGTH=5*1024*1024, MAIL_SERVER=os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
    MAIL_PORT=int(os.getenv('MAIL_PORT', '587')), MAIL_USE_TLS=True, MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
    MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'), MAIL_DEFAULT_SENDER=os.getenv('MAIL_FROM'))
db.init_app(app)
Migrate(app, db, compare_type=True)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)
mail = Mail(app)
def visitor_address():
    # Trust this provider-owned header only inside Vercel's runtime.
    if os.getenv('VERCEL') == '1':
        forwarded = request.headers.get('x-vercel-forwarded-for', '').split(',')[0].strip()
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass
    return get_remote_address()

limiter = Limiter(visitor_address, app=app, default_limits=[],
                  storage_uri=os.getenv('RATELIMIT_STORAGE_URI', 'almacena://' if os.getenv('VERCEL') else 'memory://'), strategy='fixed-window')
CORS(app, origins=os.getenv('FRONTEND_ORIGINS', 'http://127.0.0.1:3000,http://localhost:3000').split(','))
static_dir = Path(__file__).resolve().parent.parent / 'public'

@app.get('/api/config')
def public_config():
    """Expose only public analytics settings, and only on approved hosts."""
    measurement = os.getenv('GA4_MEASUREMENT_ID', '')
    hosts = {h.strip().lower() for h in os.getenv('GA4_ALLOWED_HOSTS', '').split(',') if h.strip()}
    hostname = request.host.split(':')[0].lower()
    enabled = re.fullmatch(r'G-[A-Z0-9]{6,20}', measurement) and hostname in hosts
    return jsonify(ga4_id=measurement if enabled else '')

class InvalidInput(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

@app.errorhandler(InvalidInput)
def invalid(error):
    db.session.rollback()
    return jsonify(message=error.message), error.status

@app.errorhandler(IntegrityError)
def integrity_error(error):
    db.session.rollback()
    return jsonify(message='El registro está duplicado o relacionado con otros datos.'), 409

@app.errorhandler(SQLAlchemyError)
def database_error(error):
    db.session.rollback()
    app.logger.error('Database operation failed: %s', type(error).__name__)
    return jsonify(message='No pudimos completar la operación. Vuelve a intentarlo.'), 503

@app.errorhandler(HTTPException)
def http_error(error):
    if error.code == 429:
        return jsonify(message='Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'), 429
    return jsonify(message='Recurso no encontrado.' if error.code == 404 else error.description), error.code

@app.after_request
def headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if request.path.startswith('/api/') or request.headers.get('Authorization'):
        response.headers['Cache-Control'] = 'no-store'
    return response

@jwt.unauthorized_loader
@jwt.invalid_token_loader
def unauthorized(reason):
    return jsonify(message='Inicia sesión para continuar.'), 401

@jwt.expired_token_loader
@jwt.revoked_token_loader
def expired(header, payload):
    return jsonify(message='Tu sesión ha terminado. Vuelve a entrar.'), 401

@jwt.token_in_blocklist_loader
def blocked(header, payload):
    user = db.session.get(User, int(payload['sub'])) if str(payload.get('sub', '')).isdigit() else None
    return not user or not user.is_active or payload.get('version') != user.auth_version or db.session.get(RevokedToken, payload['jti']) is not None

def protected(fn):
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        g.user = db.session.get(User, int(get_jwt_identity()))
        return fn(*args, **kwargs)
    return wrapped

def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise InvalidInput('Envía un formulario válido.')
    return data

def text(data, key, optional=False, limit=80):
    value = data.get(key, '')
    if not isinstance(value, str) or len(value.strip()) > limit or (not value.strip() and not optional):
        raise InvalidInput(f'Revisa el campo {key}.')
    return value.strip()

def number(data, key, minimum=0, default=None):
    try:
        raw = data.get(key, default)
        if isinstance(raw, bool):
            raise ValueError()
        value = Decimal(str(raw))
        if not value.is_finite() or value < minimum or value > 100000000 or value.as_tuple().exponent < -3:
            raise ValueError()
        return value
    except (ValueError, InvalidOperation, TypeError):
        raise InvalidInput(f'{key}: usa un número válido, mínimo {minimum}, con hasta 3 decimales.')

def ident(data, key):
    value = number(data, key, 1)
    if value != value.to_integral_value():
        raise InvalidInput('El identificador no es válido.')
    return int(value)

def password(data, key='password'):
    value = data.get(key)
    if not isinstance(value, str) or len(value) < 10 or len(value.encode()) > 72:
        raise InvalidInput('La contraseña debe tener al menos 10 caracteres y un máximo de 72 bytes.')
    return value

def check_password(user, value):
    return isinstance(value, str) and len(value.encode()) <= 72 and bcrypt.check_password_hash(user.password, value)

def photo(data):
    value = text(data, 'photo_url', optional=True, limit=500) if data.get('photo_url') else ''
    if value and (urlparse(value).scheme != 'https' or not urlparse(value).hostname):
        raise InvalidInput('La imagen debe tener una dirección HTTPS válida.')
    return value or None

def issue(user):
    return dict(token=create_access_token(identity=str(user.id), additional_claims={'version': user.auth_version}), user=user.serialize())

@app.get('/api/health')
def health():
    return jsonify(status='ok')

@app.post('/api/signup')
@limiter.limit('5 per minute')
def signup():
    data = body()
    email = text(data, 'email').lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise InvalidInput('Introduce un email válido.')
    if User.query.filter(func.lower(User.email) == email).first():
        raise InvalidInput('Ya existe una cuenta con ese email.', 409)
    user = User(email=email, name=text(data, 'name'), last_name=text(data, 'last_name', True), address=text(data, 'address', True),
                password=bcrypt.generate_password_hash(password(data)).decode())
    db.session.add(user)
    db.session.commit()
    return jsonify(issue(user)), 201

@app.post('/api/login')
@limiter.limit('10 per minute')
def login():
    data = body()
    user = User.query.filter(func.lower(User.email) == text(data, 'email').lower()).first()
    if not user or not check_password(user, data.get('password')):
        raise InvalidInput('Email o contraseña incorrectos.', 401)
    if not user.is_active:
        raise InvalidInput('Esta cuenta está desactivada.', 403)
    return jsonify(issue(user))

@app.post('/api/logout')
@protected
def logout():
    token = get_jwt()
    db.session.add(RevokedToken(jti=token['jti'], expires_at=datetime.fromtimestamp(token['exp'], timezone.utc).replace(tzinfo=None)))
    db.session.commit()
    return jsonify(message='Sesión cerrada.')

@app.route('/api/profile', methods=['GET', 'PUT', 'DELETE'])
@protected
def profile():
    user = g.user
    if request.method == 'GET':
        return jsonify(user.serialize())
    data = body()
    if request.method == 'DELETE':
        if not check_password(user, data.get('password')):
            raise InvalidInput('Confirma tu contraseña para desactivar la cuenta.')
        user.is_active = False
        user.auth_version += 1
    else:
        for key in ('name', 'last_name', 'address'):
            if key in data:
                setattr(user, key, text(data, key, optional=key != 'name'))
        if 'photo_url' in data:
            user.photo_url = photo(data)
        if data.get('new_password'):
            if not check_password(user, data.get('current_password')):
                raise InvalidInput('La contraseña actual no es correcta.')
            user.password = bcrypt.generate_password_hash(password(data, 'new_password')).decode()
            user.auth_version += 1
    db.session.commit()
    return jsonify(message='Perfil actualizado.', user=user.serialize())

@app.post('/api/passwordrecovery')
@limiter.limit('3 per minute')
def recovery():
    data = body()
    if not app.config.get('MAIL_USERNAME') or not app.config.get('MAIL_DEFAULT_SENDER'):
        raise InvalidInput('El envío de correo todavía no está configurado. Contacta con quien administra esta cocina.', 503)
    user = User.query.filter(func.lower(User.email) == text(data, 'email').lower()).first()
    if user and user.is_active and not user.is_demo:
        token = secrets.token_urlsafe(32)
        user.reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.reset_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=30)
        origin = os.getenv('FRONTEND_URL', 'http://127.0.0.1:3000').rstrip('/')
        msg = Message('Restablece tu contraseña · AlmaCena', recipients=[user.email],
                      body=f'Este enlace caduca en 30 minutos: {origin}/passwordreset/{token}\nSi no lo solicitaste, ignora este correo.')
        try:
            mail.send(msg)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise InvalidInput('No pudimos enviar el correo. Inténtalo más tarde.', 503)
    return jsonify(message='Si el email corresponde a una cuenta activa, recibirás un enlace de recuperación.')

@app.post('/api/resetpassword/<token>')
@limiter.limit('10 per minute')
def reset_password(token):
    user = User.query.filter_by(reset_token=hashlib.sha256(token.encode()).hexdigest()).first()
    if not user or not user.is_active or not user.reset_expires_at or user.reset_expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise InvalidInput('Este enlace ha caducado o ya se utilizó.', 401)
    user.password = bcrypt.generate_password_hash(password(body(), 'new_password')).decode()
    user.reset_token, user.reset_expires_at = None, None
    user.auth_version += 1
    db.session.commit()
    return jsonify(message='Contraseña actualizada. Ya puedes iniciar sesión.')

def owned_ingredient(mid):
    row = UserMateriasPrimas.query.filter_by(user_id=g.user.id, materias_primas_id=mid).first()
    if not row:
        raise InvalidInput('No encontramos ese ingrediente en tu cocina.', 404)
    return row

def owned_recipe(rid):
    row = UserReceta.query.filter_by(user_id=g.user.id, receta_id=rid).first()
    if not row:
        raise InvalidInput('No encontramos esa receta en tu cocina.', 404)
    return row.receta_relationship

def ingredient_json(row):
    m = row.materias_primas_relationship
    return dict(materia_prima_id=m.id, nombre=m.nombre, clasificacion=m.clasificacion, unidad_medida=m.unidad_medida,
                cantidad_stock=float(row.cantidad_stock), cantidad_stock_minimo=float(row.minimo_stock))

@app.route('/api/dashboard/ingredients', methods=['GET', 'POST', 'PUT', 'DELETE'])
@protected
def ingredients():
    if request.method == 'GET':
        return jsonify([ingredient_json(r) for r in UserMateriasPrimas.query.filter_by(user_id=g.user.id).order_by(UserMateriasPrimas.id.desc())])
    data = body()
    if request.method == 'POST':
        m = MateriasPrimas(nombre=text(data, 'nombre'), clasificacion=text(data, 'clasificacion'), unidad_medida=text(data, 'unidad_medida'))
        row = UserMateriasPrimas(user_id=g.user.id, materias_primas_relationship=m, cantidad_stock=number(data, 'cantidad', default=0), minimo_stock=number(data, 'minimo_stock', default=0))
        db.session.add(row)
    else:
        row = owned_ingredient(ident(data, 'materia_prima_id'))
        m = row.materias_primas_relationship
        used = IngredientesReceta.query.filter_by(materias_primas_id=m.id).first()
        if request.method == 'DELETE':
            if used:
                raise InvalidInput('Este ingrediente se usa en una receta. Retíralo de la receta antes de eliminarlo.', 409)
            db.session.delete(row)
            db.session.flush()
            db.session.delete(m)
        else:
            for key in ('nombre', 'clasificacion', 'unidad_medida'):
                if key in data:
                    if key == 'unidad_medida' and data[key] != m.unidad_medida and used:
                        raise InvalidInput('No puedes cambiar la unidad de un ingrediente usado en recetas.', 409)
                    setattr(m, key, text(data, key))
            if 'cantidad_stock' in data:
                row.cantidad_stock = number(data, 'cantidad_stock')
            if 'minimo_stock' in data:
                row.minimo_stock = number(data, 'minimo_stock')
    db.session.commit()
    return jsonify(message='Ingrediente eliminado.' if request.method == 'DELETE' else 'Ingrediente guardado.'), 201 if request.method == 'POST' else 200

def recipe_json(r):
    items = IngredientesReceta.query.filter_by(receta_id=r.id).all()
    return dict(receta_id=r.id, nombre=r.nombre, rinde=float(r.rinde), unidad_medida=r.unidad_medida, unidad_medida_rinde=r.unidad_medida, photo_url=r.photo_url,
        ingredientes=[dict(materia_prima_id=i.materias_primas_id, nombre=i.materias_primas_id_relationship.nombre,
        unidad_medida=i.materias_primas_id_relationship.unidad_medida, cantidad_necesaria=float(i.cantidad_necesaria)) for i in items])

def save_recipe(r, data):
    if r.id and data.get('unidad_medida') != r.unidad_medida and UserProductoFinal.query.filter_by(receta_id=r.id).first():
        raise InvalidInput('No puedes cambiar la unidad de una receta con producto asociado.', 409)
    r.nombre, r.rinde, r.unidad_medida = text(data, 'nombre'), number(data, 'rinde', Decimal('0.001')), text(data, 'unidad_medida')
    if 'photo_url' in data:
        r.photo_url = photo(data)
    items = data.get('ingredientes')
    if not isinstance(items, list) or not items or len(items) > 100:
        raise InvalidInput('Añade entre 1 y 100 ingredientes a la receta.')
    checked, seen = [], set()
    for item in items:
        if not isinstance(item, dict):
            raise InvalidInput('Revisa los ingredientes.')
        mid = ident(item, 'materia_prima_id')
        owned_ingredient(mid)
        if mid in seen:
            raise InvalidInput('Un ingrediente no puede aparecer dos veces.')
        seen.add(mid)
        checked.append((mid, number(item, 'cantidad_necesaria', Decimal('0.001'))))
    if r.id:
        IngredientesReceta.query.filter_by(receta_id=r.id).delete()
    for mid, qty in checked:
        db.session.add(IngredientesReceta(receta_relationship=r, materias_primas_id=mid, cantidad_necesaria=qty))

@app.route('/api/dashboard/recipes', methods=['GET', 'POST'])
@protected
def recipes():
    if request.method == 'GET':
        return jsonify([recipe_json(r.receta_relationship) for r in UserReceta.query.filter_by(user_id=g.user.id).order_by(UserReceta.id.desc())])
    r = Receta()
    save_recipe(r, body())
    db.session.add(UserReceta(user_id=g.user.id, receta_relationship=r))
    db.session.commit()
    return jsonify(message='Receta creada.', receta_id=r.id), 201

@app.route('/api/dashboard/recipes/<int:rid>', methods=['GET', 'PUT', 'DELETE'])
@protected
def recipe_detail(rid):
    r = owned_recipe(rid)
    if request.method == 'GET':
        return jsonify(recipe_json(r))
    if request.method == 'PUT':
        save_recipe(r, body())
    else:
        if UserProductoFinal.query.filter_by(receta_id=rid).first():
            raise InvalidInput('Elimina primero el producto asociado a esta receta.', 409)
        IngredientesReceta.query.filter_by(receta_id=rid).delete()
        UserReceta.query.filter_by(user_id=g.user.id, receta_id=rid).delete()
        db.session.delete(r)
    db.session.commit()
    return jsonify(message='Receta actualizada.' if request.method == 'PUT' else 'Receta eliminada.')

def product_json(row):
    r = row.receta_relationship
    return dict(id=row.id, receta_id=row.receta_id, nombre=r.nombre, unidad_medida=r.unidad_medida, cantidad_inventario=float(row.cantidad_inventario),
        cantidad_inventario_minimo=float(row.cantidad_inventario_minimo), clasificacion=row.clasificacion, photo_url=r.photo_url)

@app.route('/api/dashboard/products', methods=['GET', 'POST', 'PUT', 'DELETE'])
@protected
def products():
    if request.method == 'GET':
        return jsonify([product_json(r) for r in UserProductoFinal.query.filter_by(user_id=g.user.id).order_by(UserProductoFinal.id.desc())])
    data = body()
    if request.method == 'POST':
        r = owned_recipe(ident(data, 'receta_id'))
        if UserProductoFinal.query.filter_by(user_id=g.user.id, receta_id=r.id).first():
            raise InvalidInput('Esta receta ya tiene un producto. Edita sus existencias.', 409)
        row = UserProductoFinal(user_id=g.user.id, receta_id=r.id)
        db.session.add(row)
    else:
        row = UserProductoFinal.query.filter_by(user_id=g.user.id, id=ident(data, 'id')).first()
        if not row:
            raise InvalidInput('No encontramos ese producto en tu cocina.', 404)
    if request.method == 'DELETE':
        db.session.delete(row)
    else:
        row.cantidad_inventario = number(data, 'cantidad_inventario', default=0)
        row.cantidad_inventario_minimo = number(data, 'cantidad_inventario_minimo', default=0)
        row.clasificacion = text(data, 'clasificacion')
    db.session.commit()
    return jsonify(message='Producto eliminado.' if request.method == 'DELETE' else 'Producto guardado.'), 201 if request.method == 'POST' else 200

@app.post('/api/dashboard/recipes/make')
@protected
def make_recipe():
    data = body()
    rid = ident(data, 'recipe_id')
    batches = ident(data, 'batches') if 'batches' in data else 1
    if batches > 1000:
        raise InvalidInput('El máximo es 1.000 tandas por operación.')
    r = owned_recipe(rid)
    db.session.query(Receta).filter_by(id=rid).with_for_update().one()
    product = UserProductoFinal.query.filter_by(user_id=g.user.id, receta_id=rid).first()
    if not product:
        raise InvalidInput('Crea primero el producto de esta receta para registrar lo elaborado.', 409)
    if product.cantidad_inventario + r.rinde * batches > 100000000:
        raise InvalidInput('Esta elaboración superaría el máximo de existencias permitido.')
    items = IngredientesReceta.query.filter_by(receta_id=rid).order_by(IngredientesReceta.materias_primas_id).all()
    if not items:
        raise InvalidInput('La receta debe tener ingredientes.', 409)
    for item in items:
        required = item.cantidad_necesaria * batches
        updated = UserMateriasPrimas.query.filter(UserMateriasPrimas.user_id == g.user.id,
            UserMateriasPrimas.materias_primas_id == item.materias_primas_id, UserMateriasPrimas.cantidad_stock >= required
        ).update({UserMateriasPrimas.cantidad_stock: UserMateriasPrimas.cantidad_stock - required}, synchronize_session=False)
        if updated != 1:
            raise InvalidInput(f'Stock insuficiente de {item.materias_primas_id_relationship.nombre}. No se modificó el inventario.', 409)
    produced = r.rinde * batches
    UserProductoFinal.query.filter_by(id=product.id, user_id=g.user.id).update(
        {UserProductoFinal.cantidad_inventario: UserProductoFinal.cantidad_inventario + produced}, synchronize_session=False)
    db.session.add(ProductionLog(user_id=g.user.id, recipe_name=r.nombre, quantity=produced, unit=r.unidad_medida, batches=batches))
    db.session.commit()
    return jsonify(message='Elaboración registrada. Inventario actualizado.', produced=float(produced))

@app.get('/api/dashboard')
@protected
def dashboard():
    materials = UserMateriasPrimas.query.filter_by(user_id=g.user.id).all()
    finished = UserProductoFinal.query.filter_by(user_id=g.user.id).all()
    logs = ProductionLog.query.filter_by(user_id=g.user.id).order_by(ProductionLog.id.desc()).limit(12).all()
    return jsonify(user=g.user.serialize(), ingredientes=[ingredient_json(i) for i in materials if i.cantidad_stock <= i.minimo_stock],
        productos_finales=[product_json(p) for p in finished if p.cantidad_inventario <= p.cantidad_inventario_minimo],
        activity=[dict(id=l.id, name=l.recipe_name, quantity=float(l.quantity), unit=l.unit, batches=l.batches, date=l.created_at.isoformat()+'Z') for l in logs])

@app.post('/api/images')
@protected
def upload_image():
    if not os.getenv('CLOUDINARY_URL'):
        raise InvalidInput('Las imágenes todavía no están configuradas. Puedes guardar sin foto.', 503)
    uploaded = request.files.get('image')
    if not uploaded or uploaded.mimetype not in ('image/jpeg', 'image/png', 'image/webp'):
        raise InvalidInput('Elige una imagen JPG, PNG o WebP de hasta 5 MB.')
    try:
        result = cloudinary.uploader.upload(uploaded, folder=f'almacena/{g.user.id}', resource_type='image', transformation=[{'width':1200, 'height':900, 'crop':'limit'}])
        return jsonify(url=result['secure_url'])
    except Exception:
        raise InvalidInput('No pudimos subir la imagen. Puedes guardar sin foto.', 502)

@app.post('/api/demo')
@limiter.limit('5 per minute; 30 per hour')
def demo():
    if os.getenv('ENABLE_DEMO', 'false').lower() != 'true':
        raise InvalidInput('La demo no está habilitada.', 404)
    from api.demo import seed_kitchen
    user = User(name='Alex', last_name='', address='Taller de cocina', email=f'demo-{secrets.token_hex(12)}@example.invalid',
        password=bcrypt.generate_password_hash(secrets.token_urlsafe(32)).decode(), is_demo=True)
    db.session.add(user)
    db.session.flush()
    seed_kitchen(user)
    db.session.commit()
    return jsonify(issue(user)), 201

def purge_demo_kitchens():
    """Remove demo kitchens older than 24h; never real accounts."""
    users = User.query.filter(User.is_demo.is_(True), User.created_at < datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(days=1)).order_by(User.id).limit(500).all()
    for user in users:
        mids = [r.materias_primas_id for r in UserMateriasPrimas.query.filter_by(user_id=user.id)]
        rids = [r.receta_id for r in UserReceta.query.filter_by(user_id=user.id)]
        ProductionLog.query.filter_by(user_id=user.id).delete()
        UserProductoFinal.query.filter_by(user_id=user.id).delete()
        IngredientesReceta.query.filter(IngredientesReceta.receta_id.in_(rids)).delete(synchronize_session=False)
        UserReceta.query.filter_by(user_id=user.id).delete()
        Receta.query.filter(Receta.id.in_(rids)).delete(synchronize_session=False)
        UserMateriasPrimas.query.filter_by(user_id=user.id).delete()
        MateriasPrimas.query.filter(MateriasPrimas.id.in_(mids)).delete(synchronize_session=False)
        db.session.delete(user)
    RevokedToken.query.filter(RevokedToken.expires_at < datetime.now(timezone.utc).replace(tzinfo=None)).delete()
    RateCounter.query.filter(RateCounter.expires_at < time.time()).delete()
    db.session.commit()
    return len(users)

@app.cli.command('cleanup-demo')
def cleanup_demo():
    print(f'{purge_demo_kitchens()} demo kitchens removed.')

@app.get('/api/cron/cleanup')
def scheduled_cleanup():
    secret = os.getenv('CRON_SECRET', '')
    if not secret or not secrets.compare_digest(request.headers.get('Authorization', ''), 'Bearer ' + secret):
        raise InvalidInput('No autorizado.', 401)
    return jsonify(removed=purge_demo_kitchens())

@app.get('/')
def index():
    return send_from_directory(static_dir, 'index.html')

@app.get('/<path:path>')
def static_or_spa(path):
    if path.startswith(('admin', 'api/', 'users', 'reactivate')):
        raise InvalidInput('Recurso no encontrado.', 404)
    if (static_dir / path).is_file():
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.getenv('PORT', 3001)))

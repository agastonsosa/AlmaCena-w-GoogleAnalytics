"""Behavioral integration tests against a disposable SQL database, no live services."""
import hashlib
import os
import re
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

scratch = tempfile.TemporaryDirectory()
test_url = os.getenv('ALMACENA_TEST_DATABASE_URL')
if test_url:
    from sqlalchemy.engine import make_url
    parsed = make_url(test_url)
    if parsed.drivername != 'postgresql' or not re.fullmatch(r'-csearch_path=almacena_qa_[a-f0-9]{16}', parsed.query.get('options', '')):
        raise RuntimeError('PostgreSQL tests require an isolated almacena_qa_* schema.')
os.environ['DATABASE_URL'] = test_url or 'sqlite:///' + str(Path(scratch.name) / 'test.sqlite').replace('\\', '/')
os.environ['JWT_SECRET_KEY'] = 'test-only-secret-not-for-any-deployment-123456789'
os.environ['ENABLE_DEMO'] = 'true'
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from app import app, db, mail, limiter
from api.models import User, ProductionLog, RateCounter
from api.rate_storage import KitchenRateStorage

app.config.update(TESTING=True, MAIL_SUPPRESS_SEND=True, RATELIMIT_ENABLED=False)
limiter.enabled = False

def tearDownModule():
    with app.app_context():
        db.session.remove()
        db.engine.dispose()
    scratch.cleanup()

class KitchenTests(unittest.TestCase):
    def test_shared_rate_counters_persist_between_instances_and_expire(self):
        with app.app_context():
            first, second = KitchenRateStorage('almacena://'), KitchenRateStorage('almacena://')
            self.assertEqual(first.incr('client-login', 60), 1)
            self.assertEqual(second.incr('client-login', 60), 2)
            self.assertEqual(first.get('client-login'), 2)
            record = db.session.get(RateCounter, first.key('client-login'))
            self.assertNotIn('client', record.key)
            record.expires_at = 0
            db.session.commit()
            self.assertEqual(second.get('client-login'), 0)
            self.assertEqual(second.incr('client-login', 60), 1)
            first.clear('client-login')
            self.assertEqual(second.get('client-login'), 0)

    def test_shared_rate_counters_are_atomic(self):
        def increment(_):
            with app.app_context():
                return KitchenRateStorage('almacena://').incr('concurrent-client', 60)
        with ThreadPoolExecutor(max_workers=4) as pool:
            values = list(pool.map(increment, range(12)))
        self.assertEqual(sorted(values), list(range(1, 13)))

    def test_cleanup_requires_secret_and_preserves_real_and_recent_accounts(self):
        client = app.test_client()
        demo = client.post('/api/demo').json
        recent = client.post('/api/demo').json
        with app.app_context():
            expired = User.query.filter_by(id=demo['user']['id']).one()
            expired.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)
            db.session.commit()
        with patch.dict(os.environ, {'CRON_SECRET':'test-scheduler-secret'}):
            self.assertEqual(client.get('/api/cron/cleanup').status_code, 401)
            self.assertEqual(client.get('/api/cron/cleanup?secret=test-scheduler-secret').status_code, 401)
            result = client.get('/api/cron/cleanup', headers={'Authorization':'Bearer test-scheduler-secret'})
            self.assertEqual(result.json, {'removed':1})
        with app.app_context():
            self.assertIsNone(db.session.get(User, demo['user']['id']))
            self.assertIsNotNone(db.session.get(User, recent['user']['id']))

    def test_analytics_configuration_is_public_but_host_restricted(self):
        with patch.dict(os.environ, {'GA4_MEASUREMENT_ID':'G-TEST123456', 'GA4_ALLOWED_HOSTS':'portfolio.example'}):
            local = app.test_client().get('/api/config')
            self.assertEqual(local.json, {'ga4_id':''})
            production = app.test_client().get('/api/config', base_url='https://portfolio.example')
            self.assertEqual(production.json, {'ga4_id':'G-TEST123456'})
            self.assertEqual(production.headers['Cache-Control'], 'no-store')
            preview = app.test_client().get('/api/config', base_url='https://preview.example')
            self.assertEqual(preview.json, {'ga4_id':''})

    def setUp(self):
        self.ctx = app.app_context()
        self.ctx.push()
        db.drop_all()
        db.create_all()
        self.client = app.test_client()
        self.a = self.account('alice')
        self.b = self.account('bob')

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def req(self, method, path, data=None, token=None, status=200, client=None):
        response = (client or self.client).open('/api'+path, method=method, json=data,
            headers={'Authorization':'Bearer '+token} if token else {})
        self.assertEqual(response.status_code, status, response.get_data(as_text=True))
        return response.get_json()

    def account(self, name):
        return self.req('POST','/signup', dict(name=name,email=name+'@example.test',password='Test-password-2026!',address='Same kitchen address'),status=201)['token']

    def ingredient(self, name='Flour', stock=1000, token=None):
        token = token or self.a
        self.req('POST','/dashboard/ingredients',dict(nombre=name,clasificacion='Dry',unidad_medida='g',cantidad=stock,minimo_stock=100),token,201)
        return self.req('GET','/dashboard/ingredients',token=token)[0]['materia_prima_id']

    def recipe(self, items, token=None, name='Bread'):
        return self.req('POST','/dashboard/recipes',dict(nombre=name,rinde=2,unidad_medida='ud',ingredientes=[dict(materia_prima_id=i,cantidad_necesaria=q) for i,q in items]),token or self.a,201)['receta_id']

    def product(self, rid, token=None):
        self.req('POST','/dashboard/products',dict(receta_id=rid,cantidad_inventario=0,cantidad_inventario_minimo=1,clasificacion='Bakery'),token or self.a,201)
        return self.req('GET','/dashboard/products',token=token or self.a)[0]['id']

    def stock(self, mid):
        return next(i['cantidad_stock'] for i in self.req('GET','/dashboard/ingredients',token=self.a) if i['materia_prima_id']==mid)

    def test_login_unknown_and_wrong_password(self):
        for email in ['missing@example.test','alice@example.test']:
            self.req('POST','/login',dict(email=email,password='wrong'),status=401)

    def test_case_insensitive_email_and_duplicate(self):
        self.req('POST','/login',dict(email='ALICE@example.test',password='Test-password-2026!'))
        self.req('POST','/signup',dict(name='new',email='ALICE@example.test',password='Test-password-2026!'),status=409)

    def test_signup_validation(self):
        for data in [None,{},dict(name='x',email='invalid',password='valid-password'),dict(name='x',email='x@example.test',password='short')]:
            self.req('POST','/signup',data,status=400)

    def test_all_protected_routes_require_session(self):
        for path in ['/profile','/dashboard','/dashboard/ingredients','/dashboard/recipes','/dashboard/products','/dashboard/recipes/1']:
            self.req('GET',path,status=401)
        self.req('POST','/dashboard/recipes/make',{},status=401)

    def test_logout_revokes_token(self):
        self.req('POST','/logout',token=self.a)
        self.req('GET','/profile',token=self.a,status=401)

    def test_profile_update_and_shared_address(self):
        self.req('PUT','/profile',dict(name='Alice Updated'),self.a)
        self.assertEqual(self.req('GET','/profile',token=self.a)['name'],'Alice Updated')
        self.assertEqual(User.query.count(),2)

    def test_password_change_requires_current_and_revokes_sessions(self):
        self.req('PUT','/profile',dict(new_password='New-password-2026!',current_password='wrong'),self.a,400)
        self.req('PUT','/profile',dict(new_password='New-password-2026!',current_password='Test-password-2026!'),self.a)
        self.req('GET','/profile',token=self.a,status=401)
        self.req('POST','/login',dict(email='alice@example.test',password='New-password-2026!'))

    def test_deactivation_requires_password_and_cannot_reactivate_anonymously(self):
        self.req('DELETE','/profile',{},self.a,400)
        self.req('DELETE','/profile',dict(password='Test-password-2026!'),self.a)
        self.req('GET','/profile',token=self.a,status=401)
        self.req('PUT','/reactivate',dict(email='alice@example.test'),status=405)

    def test_admin_and_user_directory_unavailable(self):
        for path in ['/admin/','/admin/user/','/users']:
            self.assertEqual(self.client.get(path).status_code,404)

    def test_ingredient_crud_and_low_stock(self):
        mid=self.ingredient()
        self.req('PUT','/dashboard/ingredients',dict(materia_prima_id=mid,cantidad_stock=50,minimo_stock=100,nombre='New flour'),self.a)
        self.assertEqual(len(self.req('GET','/dashboard',token=self.a)['ingredientes']),1)
        self.req('DELETE','/dashboard/ingredients',dict(materia_prima_id=mid),self.a)
        self.assertEqual(self.req('GET','/dashboard/ingredients',token=self.a),[])

    def test_negative_nonfinite_and_precision_validation(self):
        mid=self.ingredient()
        for value in [-1,'NaN','Infinity','0.0001',True,'banana']:
            self.req('PUT','/dashboard/ingredients',dict(materia_prima_id=mid,cantidad_stock=value),self.a,400)
        self.assertEqual(self.stock(mid),1000)

    def test_tenant_isolation(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)]);pid=self.product(rid)
        self.req('GET',f'/dashboard/recipes/{rid}',token=self.b,status=404)
        self.req('PUT','/dashboard/ingredients',dict(materia_prima_id=mid,cantidad_stock=0),self.b,404)
        self.req('DELETE','/dashboard/products',dict(id=pid),self.b,404)
        self.req('POST','/dashboard/products',dict(receta_id=rid),self.b,404)
        self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid),self.b,404)
        self.assertEqual(self.req('GET','/dashboard/recipes',token=self.b),[])

    def test_no_global_recipe_lookup_by_name(self):
        self.req('POST','/dashboard/products',dict(receta_nombre='Bread'),self.b,400)

    def test_recipe_requires_owned_unique_ingredients(self):
        mid=self.ingredient();foreign=self.ingredient(token=self.b)
        for items in [[],[dict(materia_prima_id=foreign,cantidad_necesaria=1)],[dict(materia_prima_id=mid,cantidad_necesaria=1)]*2]:
            self.req('POST','/dashboard/recipes',dict(nombre='Invalid',rinde=1,unidad_medida='ud',ingredientes=items),self.a,404 if items and items[0]['materia_prima_id']==foreign else 400)

    def test_recipe_edit_and_rollback(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)])
        data=dict(nombre='Renamed bread',rinde=3,unidad_medida='ud',ingredientes=[dict(materia_prima_id=mid,cantidad_necesaria=300)])
        self.req('PUT',f'/dashboard/recipes/{rid}',data,self.a)
        data['nombre']='Should rollback';data['ingredientes']=[]
        self.req('PUT',f'/dashboard/recipes/{rid}',data,self.a,400)
        self.assertEqual(self.req('GET',f'/dashboard/recipes/{rid}',token=self.a)['nombre'],'Renamed bread')

    def test_atomic_production_and_log(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)]);self.product(rid)
        self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid,batches=2),self.a)
        self.assertEqual(self.stock(mid),500)
        self.assertEqual(self.req('GET','/dashboard/products',token=self.a)[0]['cantidad_inventario'],4)
        self.assertEqual(self.req('GET','/dashboard',token=self.a)['activity'][0]['batches'],2)

    def test_insufficient_second_ingredient_rolls_back_everything(self):
        first=self.ingredient();second=self.ingredient('Butter',10);rid=self.recipe([(first,250),(second,20)]);self.product(rid)
        self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid),self.a,409)
        self.assertEqual(self.stock(first),1000);self.assertEqual(self.stock(second),10)
        self.assertEqual(ProductionLog.query.count(),0)
        self.assertEqual(self.req('GET','/dashboard/products',token=self.a)[0]['cantidad_inventario'],0)

    def test_decimal_quantities(self):
        mid=self.ingredient(stock='1.5');rid=self.recipe([(mid,'0.125')]);self.product(rid)
        self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid,batches=3),self.a)
        self.assertEqual(self.stock(mid),1.125)

    def test_no_product_does_not_consume_stock(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)])
        self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid),self.a,409)
        self.assertEqual(self.stock(mid),1000)

    def test_duplicate_product_rejected(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)]);self.product(rid)
        self.req('POST','/dashboard/products',dict(receta_id=rid),self.a,409)

    def test_invalid_batches(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)]);self.product(rid)
        for count in [0,-1,1.5,1001]:
            self.req('POST','/dashboard/recipes/make',dict(recipe_id=rid,batches=count),self.a,400)

    def test_linked_records_and_units_protected(self):
        mid=self.ingredient();rid=self.recipe([(mid,250)]);pid=self.product(rid)
        self.req('DELETE','/dashboard/ingredients',dict(materia_prima_id=mid),self.a,409)
        self.req('PUT','/dashboard/ingredients',dict(materia_prima_id=mid,unidad_medida='kg'),self.a,409)
        self.req('DELETE',f'/dashboard/recipes/{rid}',token=self.a,status=409)
        self.req('DELETE','/dashboard/products',dict(id=pid),self.a)
        self.req('DELETE',f'/dashboard/recipes/{rid}',token=self.a)
        self.req('DELETE','/dashboard/ingredients',dict(materia_prima_id=mid),self.a)

    def test_recovery_unconfigured_is_honest(self):
        with patch.dict(app.config,MAIL_USERNAME=None):
            self.req('POST','/passwordrecovery',dict(email='alice@example.test'),status=503)

    def test_reset_expiry_single_use_and_session_invalidation(self):
        with patch.dict(app.config,MAIL_USERNAME='test',MAIL_DEFAULT_SENDER='noreply@example.test'), patch.object(mail,'send') as send:
            self.req('POST','/passwordrecovery',dict(email='alice@example.test'))
            url=send.call_args[0][0].body.split('http')[1].split('\n')[0]
            token=url.rsplit('/',1)[1]
            user=User.query.filter_by(email='alice@example.test').one()
            self.assertEqual(user.reset_token,hashlib.sha256(token.encode()).hexdigest())
            user.reset_expires_at=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(seconds=1);db.session.commit()
            self.req('POST',f'/resetpassword/{token}',dict(new_password='New-password-2026!'),status=401)
            user.reset_expires_at=datetime.now(timezone.utc).replace(tzinfo=None)+timedelta(minutes=30);db.session.commit()
            self.req('POST',f'/resetpassword/{token}',dict(new_password='New-password-2026!'))
            self.req('POST',f'/resetpassword/{token}',dict(new_password='New-password-2026!'),status=401)
            self.req('GET','/profile',token=self.a,status=401)

    def test_demo_kitchens_are_isolated(self):
        first=self.req('POST','/demo',{},status=201)['token'];second=self.req('POST','/demo',{},status=201)['token']
        ids1={i['materia_prima_id'] for i in self.req('GET','/dashboard/ingredients',token=first)}
        ids2={i['materia_prima_id'] for i in self.req('GET','/dashboard/ingredients',token=second)}
        self.assertEqual(len(ids1),8);self.assertFalse(ids1&ids2)
        with patch.dict(os.environ,ENABLE_DEMO='false'):
            self.req('POST','/demo',{},status=404)

    def test_upload_unconfigured_and_unsafe_urls(self):
        with patch.dict(os.environ,CLOUDINARY_URL=''):
            self.req('POST','/images',{},self.a,503)
        self.req('PUT','/profile',dict(photo_url='javascript:alert(1)'),self.a,400)

    def test_login_rate_limit(self):
        limiter.enabled = True
        limiter.reset()
        try:
            for _ in range(10):
                self.req('POST','/login',dict(email='missing@example.test',password='wrong'),status=401)
            self.req('POST','/login',dict(email='missing@example.test',password='wrong'),status=429)
        finally:
            limiter.enabled = False
            limiter.reset()

    def test_concurrent_production_cannot_oversell(self):
        mid=self.ingredient(stock=250);rid=self.recipe([(mid,250)]);self.product(rid)
        # Release this connection so workers use independent SQL transactions.
        db.session.remove()
        def cook(_):
            with app.test_client() as client:
                return client.post('/api/dashboard/recipes/make',json=dict(recipe_id=rid),headers={'Authorization':'Bearer '+self.a}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses=list(pool.map(cook,range(2)))
        self.assertEqual(sorted(statuses),[200,409])
        self.assertEqual(self.stock(mid),0)
        self.assertEqual(self.req('GET','/dashboard/products',token=self.a)[0]['cantidad_inventario'],2)

if __name__=='__main__':
    unittest.main(verbosity=2)

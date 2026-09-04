"""Small, isolated and editable demo kitchen; no real customer data."""
from api.models import db, MateriasPrimas, UserMateriasPrimas, Receta, UserReceta, IngredientesReceta, UserProductoFinal

def seed_kitchen(user):
    materials = {}
    for name, category, unit, stock, minimum in [
        ('Harina de trigo', 'Despensa', 'g', 4200, 1000), ('Mantequilla', 'Lácteos', 'g', 180, 250),
        ('Leche entera', 'Lácteos', 'ml', 2200, 500), ('Huevos', 'Frescos', 'ud', 24, 6),
        ('Azúcar', 'Despensa', 'g', 1800, 400), ('Chocolate negro', 'Despensa', 'g', 650, 200),
        ('Levadura', 'Despensa', 'g', 15, 30), ('Sal marina', 'Despensa', 'g', 800, 100),
    ]:
        material = MateriasPrimas(nombre=name, clasificacion=category, unidad_medida=unit)
        db.session.add(material)
        db.session.flush()
        materials[name] = material.id
        db.session.add(UserMateriasPrimas(user_id=user.id, materias_primas_id=material.id, cantidad_stock=stock, minimo_stock=minimum))
    for name, yield_, inventory, minimum, items in [
        ('Croissants de mantequilla', 12, 8, 6, [('Harina de trigo',500),('Mantequilla',250),('Leche entera',250),('Levadura',20),('Azúcar',60)]),
        ('Cookies de chocolate', 16, 18, 8, [('Harina de trigo',250),('Mantequilla',120),('Huevos',2),('Azúcar',150),('Chocolate negro',180)]),
        ('Pan de leche', 8, 3, 4, [('Harina de trigo',400),('Leche entera',200),('Levadura',10),('Sal marina',8)]),
        ('Crêpes de la casa', 10, 12, 4, [('Harina de trigo',250),('Leche entera',500),('Huevos',3),('Mantequilla',30)]),
    ]:
        recipe = Receta(nombre=name, rinde=yield_, unidad_medida='ud')
        db.session.add(recipe)
        db.session.flush()
        db.session.add(UserReceta(user_id=user.id, receta_id=recipe.id))
        for ingredient, qty in items:
            db.session.add(IngredientesReceta(receta_id=recipe.id, materias_primas_id=materials[ingredient], cantidad_necesaria=qty))
        db.session.add(UserProductoFinal(user_id=user.id, receta_id=recipe.id, cantidad_inventario=inventory,
                                        cantidad_inventario_minimo=minimum, clasificacion='Panadería' if 'chocolate' not in name else 'Pastelería'))

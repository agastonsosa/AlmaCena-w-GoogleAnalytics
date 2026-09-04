# AlmaCena

**Tu cocina, en su punto.** Una aplicación para organizar ingredientes, convertir recetas en producción y saber qué reponer. React + Flask + SQLAlchemy.

**[Probar la demo pública](https://almacena.vercel.app)** · Alojada en Vercel Hobby con PostgreSQL en Neon Free.

## Funcionalidades

- Cocina de demostración independiente, sin registro.
- Cuentas con datos separados, perfil y cierre de sesión con revocación.
- Ingredientes y productos con cantidades decimales, mínimos, búsqueda, categorías y exportación CSV.
- Creación y edición de recetas, rendimiento y cálculo de las tandas posibles.
- Elaboraciones que descuentan ingredientes y suman productos en una sola transacción, con historial y protección frente a stock insuficiente y solicitudes concurrentes.
- Interfaz adaptable a escritorio y móvil, navegación por teclado, formularios etiquetados y confirmaciones de eliminación.

La demo comienza con ocho ingredientes, cuatro recetas y cuatro productos. Su actividad se genera al utilizarla; no son estadísticas simuladas.

## Inicio local

Requisitos: Python 3.12 y Node.js 22 o 24. Desde la raíz del repositorio, en PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
Copy-Item .env.example .env
.venv\Scripts\python.exe -m flask db upgrade
.venv\Scripts\python.exe -m flask run --host 127.0.0.1 --port 3001
```

En una segunda terminal:

```powershell
npm start
```

Abre http://127.0.0.1:3000 y entra en la demo. El servidor de desarrollo reenvía `/api` a Flask en el puerto 3001. SQLite guarda los datos en `src/instance/almacena-local.sqlite`. No hace falta configurar servicios externos para los flujos principales.

En macOS/Linux usa `.venv/bin/python` y `cp` en los comandos equivalentes. También están disponibles `pipenv sync`, `pipenv run upgrade` y `pipenv run start`. `Pipfile.lock` y `requirements.txt` describen las dependencias del backend.

Configura una clave aleatoria `JWT_SECRET_KEY` en `.env` para mantener las sesiones entre reinicios. Sin ella, el modo de desarrollo genera una clave temporal; fuera de desarrollo, la aplicación exige configurarla. Nunca subas `.env` al repositorio.

## Verificación

```powershell
npm run check
npm run build
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las 32 pruebas utilizan una base temporal. Cubren autenticación, revocación de sesiones, aislamiento entre cocinas, validación de cantidades, relaciones, CRUD, recuperación de contraseña, límites de acceso y producción atómica, incluida concurrencia en SQLite. No utilizan tu base local ni envían correos reales. `npm run test:analytics` comprueba además la limpieza de datos enviados a GA4 y las preferencias de analítica.

`npm run build` genera `public/`, ignorado por Git. Flask puede servir ese resultado en http://127.0.0.1:3001.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `src/front/js/studio.js` | Rutas, carga diferida y límite de errores |
| `src/front/js/app/` | Pantallas, formularios, contexto y cliente API |
| `src/front/styles/studio.css` | Sistema visual y adaptación móvil |
| `src/app.py` | API `/api`, validaciones, autenticación y transacciones |
| `src/api/models.py` | Modelos y restricciones de datos |
| `src/api/demo.py` | Datos de demostración |
| `migrations/` | Evolución versionada de la base de datos |
| `tests/test_api.py` | Pruebas de integración |

Los JWT duran dos horas, se guardan en `sessionStorage` y se revocan al cerrar sesión. Cambiar contraseña o desactivar la cuenta invalida las sesiones anteriores. Cada operación consulta los registros del usuario autenticado. La producción bloquea la receta en PostgreSQL y descuenta existencias mediante actualizaciones condicionales, con rollback ante cualquier fallo. Ocho pruebas adicionales sobre un esquema aislado en Neon comprobaron concurrencia, rollback, aislamiento y límites compartidos.

## Publicación y servicios opcionales

La aplicación está publicada en Vercel con PostgreSQL en Neon y GA4 conectado. Consulta [Publicación y GA4](docs/PUBLISHING.md) para mantenimiento y medición. Se retiraron las configuraciones antiguas de Render y Heroku para evitar que interfieran con la detección de Flask.

- **Fotos:** configura `CLOUDINARY_URL` en el backend. Las recetas funcionan sin foto. JPG, PNG y WebP de hasta 5 MB.
- **Recuperación:** configura `MAIL_*` y `FRONTEND_URL`. Sin SMTP, se informa que el envío no está disponible. Los enlaces caducan en 30 minutos y son de un solo uso.
- **Demo:** `ENABLE_DEMO=true` permite crear cocinas temporales. Vercel programa una limpieza diaria de demos de más de 24 horas; el comando manual es `flask cleanup-demo`.
- **Migraciones:** hacer copia de seguridad antes de `flask db upgrade`. La actualización conserva registros y añade restricciones; datos duplicados anteriores deben resolverse antes de migrar.
- **Producción:** HTTPS, `FLASK_DEBUG=0`, orígenes explícitos y secretos nuevos. `RATELIMIT_STORAGE_URI=almacena://` utiliza contadores atómicos en PostgreSQL; la memoria local sirve para desarrollo.
- **Credenciales históricas:** esta publicación utiliza secretos nuevos y no usa las credenciales expuestas por el código original. Su revocación en los antiguos proveedores sigue pendiente; retirarlas del código actual no las borra del historial de Git.

## Autoría

Proyecto original de [Gaston Sosa](https://github.com/agastonsosa), [Sara Perez](https://github.com/sarap29) y [Sophia Magdalena](https://github.com/magdasoph92), desarrollado sobre la plantilla de 4Geeks Academy de Alejandro Sanchez y colaboradores. Se mantiene la autoría del proyecto y de la plantilla. Revisar el alcance de las licencias de código y recursos antes de redistribuir.

# Publicación de portfolio y GA4

Publicado el 5 de septiembre de 2026: **https://almacena.vercel.app**. Vercel Hobby para React y Flask, Neon Free para PostgreSQL. Sin activar planes de pago. No usar SQLite en Vercel ni subir `.env`, backups o datos locales.

GA4: cuenta **AgS Example Store**, propiedad **Propiedad 1 - Ejemplo AGS**, flujo **AlmaCena Analytics**, ID `G-5QC5VSHN72`. Se reutilizó el flujo antiguo y se actualizó su URL. La propiedad contiene también un flujo ajeno a AlmaCena: aplicar un filtro por flujo cuando se consulten datos agregados.

Verificado en Tiempo real: una visita desde España, un `page_view` de portada y otro del dashboard, sin duplicados en esa prueba. Los informes históricos pueden seguir mostrando el aviso inicial mientras procesan datos.

## Preparación del despliegue

1. Iniciar sesión en Vercel y Neon, manteniendo los planes gratuitos, sin activar una prueba Pro ni añadir facturación.
2. Crear un proyecto Neon para AlmaCena y una base vacía. Utilizar su conexión PostgreSQL con TLS. No publicar la cadena de conexión en Git ni en el frontend.
3. Ejecutar las migraciones contra esa base desde un entorno seguro: `python -m flask db upgrade`. No ejecutarlas automáticamente en cada preview ni contra la base local por error.
4. Crear el proyecto Vercel desde este repositorio o desde el código local. `vercel.json` configura Flask y compila React en `public/`.
5. Configurar secretos y variables: `DATABASE_URL`, `JWT_SECRET_KEY` aleatoria nueva, `FLASK_DEBUG=0`, `ENABLE_DEMO=true`, `FRONTEND_URL` y `FRONTEND_ORIGINS` con la URL final. No reutilizar credenciales históricas.
6. Configurar `RATELIMIT_STORAGE_URI=almacena://`: los límites se guardan en PostgreSQL mediante contadores atómicos compartidos. `memory://` es solo local. La migración incluye la tabla necesaria; las claves se guardan como HMAC, no como IP en claro.
7. Configurar `CRON_SECRET` aleatoria, distinta de JWT. `vercel.json` programa una llamada diaria a `/api/cron/cleanup`, que exige ese secreto en Authorization. Elimina hasta 500 demos de más de 24 horas y contadores caducados por ejecución. El comando local equivalente es `flask cleanup-demo`. Confirmar su ejecución remota después del despliegue.
8. Verificar la base PostgreSQL, registro, demo, producción, revocación, actualización del sitio y persistencia después de desplegar. Se aprobaron ocho pruebas críticas en un esquema aislado de Neon, incluidas producción concurrente, rollback y contadores compartidos, además de las 32 pruebas de integración locales.

Se retiraron las configuraciones antiguas de Render y Heroku. Las fotos y el correo son servicios opcionales todavía sin configurar.

Para actualizar desde este checkout enlazado: `npm run build` y después `npx vercel deploy --prod`. Es necesario compilar antes de subir: los archivos de `public/` deben incluirse en la carga de la CLI. Se mantienen fuera de Git. La conexión automática entre Vercel y GitHub no se pudo completar; no asumir despliegue automático al hacer push.

## Conexión de GA4

- Crear o seleccionar una propiedad dedicada a AlmaCena y un flujo web con su URL final.
- Configurar `GA4_MEASUREMENT_ID=G-...` y `GA4_ALLOWED_HOSTS=nombre-final.vercel.app` (host exacto, sin protocolo ni rutas). Se pueden separar varios hosts por comas. Dejar fuera localhost y previews.
- Desactivar la **medición mejorada** del flujo para esta integración manual: evita pageviews duplicados por cambios de historial y la captura automática de formularios o enlaces. La aplicación envía sus propios `page_view` por pantalla.
- Mantener Google Signals y personalización publicitaria desactivados. El código también desactiva su uso.
- En el sitio, aceptar analítica y comprobar `page_view` en Tiempo real y, para diagnóstico, DebugView/Tag Assistant. Confirmar que un cambio de pantalla produce un evento y no dos. Una petición HTTP a Google por sí sola no demuestra que el evento aparezca correctamente en los informes.
- Rechazar analítica debe impedir cargar `gtag.js`; retirar permiso elimina cookies `_ga` accesibles y recarga la página. La preferencia se conserva hasta 180 días.

La integración elimina IDs de recetas, tokens de recuperación, texto de búsqueda y consultas privadas de los datos de páginas. Conserva únicamente parámetros UTM de campaña con caracteres restringidos. No envía nombres ni emails de cuentas. Los bloqueadores y quienes rechazan analítica no se contabilizan mediante esta integración.

## Consultar resultados

- **Tiempo real:** comprobar visitas recientes después de publicarlo.
- **Adquisición de tráfico:** fuente/medio y campañas; por ejemplo LinkedIn, referencias de otra web o acceso directo.
- **Datos demográficos:** país y, cuando esté disponible, ciudad aproximada. No identifica al visitante.
- **Páginas y pantallas:** qué secciones se visitan.

Para distinguir enlaces de tu CV y LinkedIn, añadir a la URL final:

```text
/?utm_source=cv&utm_medium=pdf&utm_campaign=portfolio
/?utm_source=linkedin&utm_medium=social&utm_campaign=portfolio
```

Los informes agregados pueden tardar en procesarse. No interpretar una localización aproximada como identidad ni suponer que todas las visitas serán medibles.

## Fuentes verificadas

- https://vercel.com/docs/frameworks/backend/flask
- https://vercel.com/docs/plans/hobby
- https://neon.com/pricing
- https://render.com/docs/free
- https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- https://developers.google.com/tag-platform/security/guides/consent
- https://support.google.com/analytics/answer/12923437

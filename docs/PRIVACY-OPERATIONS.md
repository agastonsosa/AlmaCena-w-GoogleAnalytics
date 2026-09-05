# Privacidad: operación y comprobaciones

5 de septiembre de 2026. Política pública en `/privacy`, contacto confirmado por el propietario: Gaston Sosa, agastonsosa@gmail.com.

## Implementado

- Aviso con aceptar/rechazar de igual estilo; no se carga GA4 hasta aceptar. Preferencias accesibles permanentemente; la política se puede leer sin el aviso superpuesto y sin consentir.
- Consentimiento v2: los permisos de la versión anterior no activan la etiqueta. Se solicita una elección nueva con la información completa y se borran las cookies GA accesibles mientras no haya consentimiento.
- Elección válida 180 días. Cookies GA configuradas con `cookie_expires: 15552000` y `cookie_update: false`. Retirar permiso desactiva la etiqueta, borra cookies accesibles y recarga.
- Se ocultan consultas privadas, IDs de recetas y tokens en páginas enviadas a GA4. Sin envío de datos de cuentas ni contenido de cocina. Fuentes DM Sans alojadas localmente, con licencia OFL incluida.
- Política enlazada desde portada, registro, acceso, dashboard y aviso. Información resumida antes de crear cuenta, sin casilla que mezcle prestación del servicio con consentimiento analítico.
- GA4 verificado por lectura de la interfaz: eventos 2 meses, usuarios 14 meses, reinicio con nueva actividad activado. No se cambió esta configuración porque la propiedad incluye otro flujo. Los informes agregados no siguen esos plazos.

## Requiere gestión del titular; no lo resuelve el banner

- Atender el buzón de privacidad y las solicitudes de acceso, rectificación, supresión, oposición, limitación y portabilidad que procedan. El borrado/exportación íntegros de cuenta todavía requieren gestión del administrador; no prometer un botón inexistente. Verificar identidad de manera proporcional y responder normalmente en un mes.
- Revisar el encaje contractual de los proveedores y las transferencias a EE. UU. El DPA público de Vercel consultado especifica Pro/Enterprise; los términos generales lo incorporan por referencia. No se ha confirmado cobertura contractual para este Hobby. No afirmar que esta incertidumbre está resuelta; consultar a Vercel o revisar un alojamiento gratuito alternativo adecuado antes de tratar datos reales a escala. No se contrató un plan pago ni se enviaron mensajes a proveedores.
- Verificar la aceptación/aplicabilidad de los términos de tratamiento de Google y Neon y conservar evidencia. Enlazar sus documentos no equivale a formalizar contratos.
- Definir y revisar los plazos de logs/copias de cada proveedor y documentar el procedimiento de eliminación; no se ha modificado ni purgado información histórica.
- Revisar periódicamente la limpieza diaria de demos y atender errores. La política no promete eliminación exacta a las 24 horas.
- Actualizar política y versión de consentimiento cuando cambien finalidades o proveedores. Los permisos de cookies no sustituyen las demás obligaciones de protección de datos.

## Fuentes oficiales consultadas

- https://www.aepd.es/guias/guia-cookies.pdf
- https://www.aepd.es/derechos-y-deberes/conoce-tus-derechos/derecho-de-informacion
- https://support.google.com/analytics/answer/11397207
- https://support.google.com/analytics/answer/7667196
- https://vercel.com/legal/dpa
- https://vercel.com/legal/terms
- https://neon.com/platform-terms
- https://business.safety.google/adsprocessorterms/

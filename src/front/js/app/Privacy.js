import React from "react";
import { Link } from "react-router-dom";
import { Brand } from "./ui";
import { privacyContact } from "./privacy-contact";
import "../../styles/privacy.css";

export function Privacy() {
  return (
    <div className="privacy-page">
      <header>
        <Brand />
        <Link to="/">Volver al inicio</Link>
      </header>
      <main id="main-content">
        <span className="eyebrow">TRANSPARENCIA, TAMBIÉN EN TUS DATOS</span>
        <h1>Privacidad y cookies</h1>
        <p className="privacy-intro">
          AlmaCena es un proyecto de portfolio para organizar una cocina. Puedes
          explorar la demo sin facilitar tu nombre ni tu email y utilizar la
          aplicación sin aceptar la analítica.
        </p>
        <p>Última actualización: 5 de septiembre de 2026.</p>
        <nav aria-label="Contenido de la política">
          <a href="#responsable">Responsable</a>
          <a href="#datos">Datos y finalidades</a>
          <a href="#proveedores">Proveedores</a>
          <a href="#conservacion">Conservación</a>
          <a href="#cookies">Cookies</a>
          <a href="#derechos">Tus derechos</a>
        </nav>

        <section id="responsable">
          <h2>1. Quién es responsable</h2>
          <p>
            El responsable de este sitio, <strong>almacena.vercel.app</strong>,
            es{" "}
            <strong>
              {privacyContact.name ||
                "Pendiente de confirmar antes de publicar"}
            </strong>
            . Para consultas de privacidad y solicitudes sobre tus datos,
            escribe a{" "}
            {privacyContact.email ? (
              <a href={`mailto:${privacyContact.email}`}>
                {privacyContact.email}
              </a>
            ) : (
              "[contacto pendiente de confirmar]"
            )}
            .
          </p>
        </section>
        <section id="datos">
          <h2>2. Qué datos usamos y para qué</h2>
          <ul>
            <li>
              <strong>Cuenta y cocina:</strong> nombre, email, contraseña
              protegida mediante hash, apellido y nombre de la cocina si los
              facilitas, e ingredientes, recetas, existencias e historial de
              elaboraciones que guardes. Se utilizan para proporcionar las
              funciones que solicitas al registrarte, sobre la base de la
              ejecución del servicio. El nombre, email y contraseña son
              necesarios para crear una cuenta; puedes usar la demo como
              alternativa.
            </li>
            <li>
              <strong>Funcionamiento y seguridad:</strong> el servidor y los
              proveedores de infraestructura reciben datos técnicos de las
              solicitudes, como dirección IP, fecha, navegador y ruta
              solicitada. Se utilizan para servir la web, diagnosticar
              incidencias y evitar abusos, por el interés legítimo de mantener
              un servicio disponible y seguro. Los contadores propios contra
              abusos guardan una clave derivada de la IP, no la IP en claro.
            </li>
            <li>
              <strong>Estadísticas opcionales:</strong> solo si aceptas, Google
              Analytics 4 recibe páginas visitadas, eventos de uso,
              identificadores de cookies, datos del navegador y dispositivo,
              procedencia y ubicación aproximada. La base es tu consentimiento.
              No enviamos a GA4 nombres, emails, contraseñas ni el contenido de
              tu cocina; eliminamos identificadores de recetas, tokens y
              consultas privadas de las direcciones de página.
            </li>
          </ul>
          <p>
            No utilizamos esta integración para publicidad personalizada ni
            decisiones automatizadas con efectos jurídicos. No introduzcas aquí
            datos de clientes, información sensible o datos personales de
            terceros: es una aplicación de demostración.
          </p>
        </section>
        <section id="proveedores">
          <h2>3. Dónde se procesan</h2>
          <p>
            Utilizamos <strong>Vercel</strong> para alojar y ejecutar la
            aplicación, <strong>Neon</strong> para guardar su base de datos
            PostgreSQL y <strong>Google Analytics</strong> para las estadísticas
            consentidas. El servidor y la base de datos están desplegados en
            Estados Unidos; estos proveedores pueden utilizar infraestructura y
            subproveedores en otros países, fuera del Espacio Económico Europeo.
          </p>
          <p>
            Puedes consultar sus condiciones, información sobre transferencias
            internacionales y mecanismos de protección en la{" "}
            <a href="https://vercel.com/legal/privacy-notice">
              privacidad de Vercel
            </a>
            , las{" "}
            <a href="https://neon.com/platform-terms">condiciones de Neon</a> y
            las{" "}
            <a href="https://business.safety.google/adsprocessorterms/">
              condiciones de tratamiento de Google
            </a>
            . Google explica también{" "}
            <a href="https://policies.google.com/technologies/partner-sites">
              cómo utiliza los datos de sitios que emplean sus servicios
            </a>
            .
          </p>
          <p>
            La tipografía se sirve desde este mismo sitio, sin solicitudes a
            Google Fonts. La subida de fotos y el envío de correos no están
            habilitados en este despliegue.
          </p>
        </section>
        <section id="conservacion">
          <h2>4. Durante cuánto tiempo</h2>
          <ul>
            <li>
              Los datos de una cuenta se mantienen mientras la cuenta exista y
              el servicio esté disponible. Puedes solicitar su eliminación
              mediante el contacto indicado; no hay borrado automático por
              inactividad.
            </li>
            <li>
              Las cocinas de demo de más de 24 horas se incluyen en una limpieza
              diaria. La eliminación no ocurre exactamente a las 24 horas y
              puede retrasarse si hay incidencias o tareas pendientes.
            </li>
            <li>
              La sesión de acceso tiene una validez de dos horas. Los contadores
              y bloqueos temporales de seguridad caducan según su finalidad y se
              depuran en la limpieza diaria. Los registros y copias de
              infraestructura siguen los ciclos de conservación de los
              proveedores.
            </li>
            <li>
              Las cookies analíticas y tu preferencia tienen los plazos de la
              tabla siguiente. El borrado de cookies no elimina por sí solo
              datos ya recibidos por Google. La propiedad de GA4 conserva los
              datos de eventos durante dos meses y los datos de usuarios durante
              catorce meses, con reinicio de este último plazo cuando hay nueva
              actividad. Los informes agregados no están sujetos a esos plazos,
              como explica{" "}
              <a href="https://support.google.com/analytics/answer/7667196?hl=es">
                Google sobre conservación
              </a>
              .
            </li>
          </ul>
        </section>
        <section id="cookies">
          <h2>5. Cookies y almacenamiento del navegador</h2>
          <p>
            El almacenamiento necesario mantiene la sesión y recuerda tu
            elección. La analítica está desactivada por defecto: no descargamos
            la etiqueta de GA4 ni enviamos eventos a ese servicio hasta que
            aceptas.
          </p>
          <div className="privacy-table">
            <table>
              <caption>Almacenamiento utilizado por AlmaCena</caption>
              <thead>
                <tr>
                  <th>Nombre y tipo</th>
                  <th>Finalidad y proveedor</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    almacena-session
                    <br />
                    sessionStorage · necesario
                  </td>
                  <td>AlmaCena: mantener el acceso a tu cocina.</td>
                  <td>
                    Hasta cerrar la pestaña o cerrar sesión. El token vence a
                    las dos horas.
                  </td>
                </tr>
                <tr>
                  <td>
                    almacena-analytics-consent-v2
                    <br />
                    localStorage · necesario
                  </td>
                  <td>
                    AlmaCena: recordar si aceptaste o rechazaste y la versión de
                    la información.
                  </td>
                  <td>
                    Elección válida durante 180 días. El registro puede
                    permanecer hasta que lo reemplaces o borres los datos del
                    sitio.
                  </td>
                </tr>
                <tr>
                  <td>
                    _ga
                    <br />
                    Cookie · opcional
                  </td>
                  <td>
                    Google Analytics: distinguir navegadores para elaborar
                    estadísticas.
                  </td>
                  <td>
                    180 días desde su creación, sin renovación automática en
                    esta integración.
                  </td>
                </tr>
                <tr>
                  <td>
                    _ga_5QC5VSHN72
                    <br />
                    Cookie · opcional
                  </td>
                  <td>
                    Google Analytics: conservar el estado de las sesiones
                    analíticas.
                  </td>
                  <td>
                    Hasta 180 días, sin renovación automática en esta
                    integración.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            El rechazo no limita las funciones de la aplicación. Aceptar y
            rechazar se ofrecen al mismo nivel. Puedes cambiar o retirar tu
            consentimiento en cualquier momento con el botón{" "}
            <strong>Cookies y privacidad</strong> que permanece en la pantalla:
            elige <strong>Rechazar analítica</strong>. Se desactiva GA4, se
            borran sus cookies accesibles y se recarga la página para detener la
            etiqueta.
          </p>
          <p>
            Retirar el consentimiento no afecta a la licitud del tratamiento
            anterior. También puedes borrar los datos del sitio desde el
            navegador. Los bloqueadores pueden impedir la medición aunque la
            aceptes. Consulta la{" "}
            <a href="https://support.google.com/analytics/answer/11397207?hl=es">
              documentación de cookies de GA4
            </a>
            .
          </p>
        </section>
        <section id="derechos">
          <h2>6. Tus derechos</h2>
          <p>
            Puedes solicitar acceso, rectificación, supresión, limitación,
            oposición y portabilidad cuando proceda, así como retirar el
            consentimiento para analítica. Contacta con el responsable indicando
            tu solicitud y el email de la cuenta; no envíes contraseñas ni
            documentación de identidad innecesaria. Solo se pedirá información
            adicional si hace falta comprobar tu identidad.
          </p>
          <p>
            La respuesta se dará, como regla general, en un mes, con las
            ampliaciones previstas legalmente cuando correspondan. Si consideras
            que tus derechos no se han atendido, puedes reclamar ante la{" "}
            <a href="https://www.aepd.es/">
              Agencia Española de Protección de Datos
            </a>{" "}
            o la autoridad de control competente.
          </p>
        </section>
        <section>
          <h2>7. Cambios en esta política</h2>
          <p>
            Actualizaremos esta página si cambian los datos, proveedores o
            finalidades. Si cambia sustancialmente la información del
            consentimiento, volveremos a solicitar tu elección antes de activar
            la analítica.
          </p>
        </section>
      </main>
    </div>
  );
}

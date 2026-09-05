import React from "react";
import { useSafeState as useState } from "./useSafeState";
import { Link } from "react-router-dom";
import { Brand, Button, ErrorBox } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import ingredients from "../../img/kitchen-ingredients.jpg";

function DemoButton({ variant = "", children = "Explorar la demo" }) {
  const { enter } = useKitchen();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button
        variant={variant}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await enter("/demo", {});
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        <Icon name="arrow" />
      </Button>
      <ErrorBox>{error}</ErrorBox>
    </>
  );
}

function Landing() {
  const { token } = useKitchen();
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="landing-links">
          <a href="#como-funciona">Cómo funciona</a>
          <Link to={token ? "/dashboard" : "/login"}>
            {token ? "Mi cocina" : "Iniciar sesión"}
            <Icon name="arrow" />
          </Link>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="eyebrow">
              <span className="status-dot" /> Menos improvisación. Más cocina.
            </span>
            <h1>
              Todo en su sitio.
              <br />
              <em>También tu cocina.</em>
            </h1>
            <p>
              Ingredientes, recetas y producción en un solo lugar. Sabe qué
              tienes, qué falta y qué puedes preparar.
            </p>
            <div className="hero-actions">
              <DemoButton />
              <Link className="button ghost" to="/signup">
                Crear mi cocina
              </Link>
            </div>
            <span className="quiet-note">
              Sin registro para probar · Datos de muestra editables
            </span>
            <div className="hero-proof">
              <span>
                <Icon name="check" /> Stock conectado
              </span>
              <span>
                <Icon name="check" /> Recetas propias
              </span>
              <span>
                <Icon name="check" /> Sin hojas sueltas
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="photo-label">
              <Icon name="wheat" /> Del ingrediente a la mesa
            </div>
            <img
              src={ingredients}
              alt="Tomates, albahaca, limones y calabacín preparados sobre una mesa de cocina"
              width="1024"
              height="1536"
            />
            <div className="photo-caption">
              <span>
                Una cocina con
                <br />
                <b>todo bajo control.</b>
              </span>
              <span className="round-arrow">
                <Icon name="arrow" />
              </span>
            </div>
          </div>
        </section>
        <section id="como-funciona" className="workflow">
          <div className="section-intro">
            <span className="eyebrow">Un flujo, de principio a fin</span>
            <h2>
              Tu próxima elaboración
              <br />
              empieza con orden.
            </h2>
          </div>
          <div className="workflow-steps">
            {[
              [
                "01",
                "leaf",
                "Organiza tu despensa",
                "Carga ingredientes, cantidades y mínimos. Detecta lo que falta antes de empezar.",
              ],
              [
                "02",
                "recipes",
                "Dale forma a tus recetas",
                "Define ingredientes y rendimiento. Consulta si tienes suficiente para cocinar.",
              ],
              [
                "03",
                "cook",
                "Cocina. El stock se actualiza.",
                "Elabora por tandas: se descuentan ingredientes y se suman productos en una sola operación.",
              ],
            ].map(([n, icon, title, copy]) => (
              <article key={n}>
                <span className="step-no">{n}</span>
                <Icon name={icon} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>
          <Link to="/privacy">Privacidad y cookies</Link>
        </p>
        <span>AlmaCena © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

export { DemoButton, Landing };

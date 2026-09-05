import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button, Empty } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { fmt } from "./format";
import ingredients from "../../img/kitchen-ingredients.jpg";
import { navItems } from "./navigation";

function Overview({ open }) {
  const k = useKitchen();
  const location = useLocation();
  const lowI = k.ingredients.filter(
      (i) => i.cantidad_stock <= i.cantidad_stock_minimo
    ),
    lowP = k.products.filter(
      (i) => i.cantidad_inventario <= i.cantidad_inventario_minimo
    );
  const alerts = [
    ...lowI.map((i) => ({
      ...i,
      type: "Ingrediente",
      qty: i.cantidad_stock,
      min: i.cantidad_stock_minimo,
    })),
    ...lowP.map((i) => ({
      ...i,
      type: "Producto",
      qty: i.cantidad_inventario,
      min: i.cantidad_inventario_minimo,
    })),
  ];
  useEffect(() => {
    if (location.search.includes("alerts"))
      document
        .getElementById("stock-alerts")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [location.search]);
  const good = k.ingredients.length - lowI.length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU COCINA, DE UN VISTAZO</span>
          <h1>
            Todo listo para crear, {k.user?.name?.split(" ")[0]}
            <span className="accent-dot">.</span>
          </h1>
          <p>Un poco de orden antes de encender los fuegos.</p>
        </div>
        <Button
          onClick={() => open({ type: "production" })}
          disabled={!k.recipes.length}
        >
          <Icon name="cook" /> Registrar elaboración
        </Button>
      </div>
      <div className="metric-grid">
        {[
          [k.ingredients.length, "Ingredientes", "En tu despensa", "leaf"],
          [k.recipes.length, "Recetas", "Tu colección de sabores", "recipes"],
          [
            k.products.length,
            "Productos",
            "Elaboraciones en inventario",
            "products",
          ],
          [
            alerts.length,
            "Por revisar",
            alerts.length
              ? "Stock en el mínimo o por debajo"
              : "Todo está por encima del mínimo",
            "warning",
          ],
        ].map(([n, title, copy, icon], i) => (
          <Link
            key={title}
            to={i === 3 ? "/dashboard?alerts=1" : navItems[i + 1][0]}
            className={`metric ${i === 3 && n ? "attention" : ""}`}
          >
            <div>
              <span>{title}</span>
              <Icon name={icon} />
            </div>
            <strong>{fmt(n)}</strong>
            <small>{copy}</small>
          </Link>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel alerts-panel" id="stock-alerts">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ANTICÍPATE</span>
              <h2>Lo que necesita atención</h2>
            </div>
            <span className="count-pill">{alerts.length}</span>
          </div>
          {alerts.length ? (
            <div className="alert-list">
              {alerts.slice(0, 5).map((i, index) => (
                <div className="alert-row" key={index}>
                  <span
                    className={`ingredient-symbol ${
                      i.qty === 0 ? "red" : "amber"
                    }`}
                  >
                    <Icon
                      name={i.type === "Ingrediente" ? "leaf" : "products"}
                    />
                  </span>
                  <div>
                    <strong>{i.nombre}</strong>
                    <small>
                      {i.type} · Mínimo {fmt(i.min)} {i.unidad_medida}
                    </small>
                  </div>
                  <span className="alert-quantity">
                    {fmt(i.qty)} <small>{i.unidad_medida}</small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Actualizar ${i.nombre}`}
                    onClick={() =>
                      open({
                        type:
                          i.type === "Ingrediente" ? "ingredient" : "product",
                        item: i,
                      })
                    }
                  >
                    <Icon name="arrow" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon="check"
              title="Todo en su punto"
              description={
                k.ingredients.length
                  ? "Tus existencias están por encima de los mínimos."
                  : "Añade tus ingredientes para empezar a controlar las existencias."
              }
              action={
                !k.ingredients.length && (
                  <Button onClick={() => open({ type: "ingredient" })}>
                    Añadir ingrediente
                  </Button>
                )
              }
            />
          )}
        </section>
        <section className="kitchen-feature">
          <div>
            <span className="eyebrow">DEL RECETARIO A LA MESA</span>
            <h2>
              Hoy puede salir
              <br />
              algo muy bueno.
            </h2>
            <p>
              Consulta tus recetas y comprueba qué puedes preparar con lo que
              tienes.
            </p>
            <Link to="/dashboard/recipes" className="button light-button">
              Abrir recetario <Icon name="arrow" />
            </Link>
          </div>
          <img src={ingredients} alt="Ingredientes frescos listos para cocinar" />
        </section>
      </div>
      <div className="overview-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CADA TANDA CUENTA</span>
              <h2>Últimas elaboraciones</h2>
            </div>
            <Icon name="clock" />
          </div>
          {k.activity.length ? (
            <div className="activity-list">
              {k.activity.slice(0, 4).map((a) => (
                <div className="activity-row" key={a.id}>
                  <span className="activity-icon">
                    <Icon name="check" />
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <small>
                      {new Date(a.date).toLocaleString("es", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {a.batches} {a.batches === 1 ? "tanda" : "tandas"}
                    </small>
                  </div>
                  <b>
                    +{fmt(a.quantity)} <small>{a.unit}</small>
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-empty">
              <Icon name="cook" />
              <div>
                <h3>Tu primera tanda te espera</h3>
                <p>Al elaborar una receta, su registro aparecerá aquí.</p>
              </div>
            </div>
          )}
        </section>
        <section className="panel pantry-health">
          <span className="eyebrow">SALUD DE TU DESPENSA</span>
          <h2>
            {good} <span>de {k.ingredients.length}</span>
          </h2>
          <p>ingredientes por encima del mínimo</p>
          <div
            className="stock-track"
            aria-label={`${good} de ${k.ingredients.length} ingredientes con stock suficiente`}
          >
            <span
              style={{
                width: `${
                  k.ingredients.length ? (good / k.ingredients.length) * 100 : 0
                }%`,
              }}
            />
          </div>
          <div className="health-legend">
            <span>
              <i /> En orden
            </span>
            <span>
              <i /> Por reponer
            </span>
          </div>
          <Link to="/dashboard/ingredients" className="text-link">
            Ver todos los ingredientes <Icon name="arrow" />
          </Link>
        </section>
      </div>
      {k.user?.is_demo && (
        <div className="demo-note">
          <Icon name="seed" />
          <p>
            <b>Esta cocina es tuya para experimentar.</b> Los datos son de
            muestra y tus cambios no afectan a otros visitantes. La sesión dura
            2 horas; puedes crear una cuenta para guardar tu propia cocina.
          </p>
          <Link to="/signup">
            Crear cuenta <Icon name="arrow" />
          </Link>
        </div>
      )}
    </>
  );
}

export { Overview };

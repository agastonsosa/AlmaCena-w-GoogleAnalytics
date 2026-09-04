import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Empty, RecipeArt } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { fmt, possible } from "./format";

function RecipeList({ open }) {
  const k = useKitchen();
  const [query, setQuery] = useState(""),
    [ready, setReady] = useState(false);
  const recipes = k.recipes.filter(
    (r) =>
      r.nombre.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (!ready || possible(r, k.ingredients) > 0)
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU COLECCIÓN DE SABORES</span>
          <h1>
            El recetario<span className="accent-dot">.</span>
          </h1>
          <p>Recetas claras. Cantidades precisas. Siempre a mano.</p>
        </div>
        <Button onClick={() => open({ type: "recipe" })}>
          <Icon name="plus" /> Crear receta
        </Button>
      </div>
      <div className="recipe-toolbar">
        <label className="search-input">
          <Icon name="search" />
          <input
            placeholder="Buscar una receta…"
            aria-label="Buscar una receta"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="ready-filter">
          <input
            type="checkbox"
            checked={ready}
            onChange={(e) => setReady(e.target.checked)}
          />{" "}
          Con ingredientes disponibles
        </label>
        <span className="muted">{recipes.length} recetas</span>
      </div>
      {recipes.length ? (
        <div className="recipe-grid">
          {recipes.map((r) => {
            const count = possible(r, k.ingredients);
            return (
              <article className="recipe-card" key={r.receta_id}>
                <Link
                  className="recipe-image"
                  to={`/dashboard/recipes/${r.receta_id}`}
                  aria-label={`Ver ${r.nombre}`}
                >
                  <RecipeArt recipe={r} />
                  <span className={`recipe-ready ${count ? "" : "not-ready"}`}>
                    <Icon name={count ? "check" : "warning"} />
                    {count ? "Ingredientes disponibles" : "Faltan ingredientes"}
                  </span>
                </Link>
                <div className="recipe-card-body">
                  <span className="eyebrow">
                    {r.ingredientes.length} INGREDIENTES
                  </span>
                  <h2>
                    <Link to={`/dashboard/recipes/${r.receta_id}`}>
                      {r.nombre}
                    </Link>
                  </h2>
                  <p>
                    Rinde{" "}
                    <b>
                      {fmt(r.rinde)} {r.unidad_medida}
                    </b>{" "}
                    por tanda
                  </p>
                  <div className="recipe-card-bottom">
                    <span>
                      {count
                        ? `Hasta ${fmt(count)} ${
                            count === 1 ? "tanda" : "tandas"
                          }`
                        : "Revisa tu despensa"}
                    </span>
                    <Link
                      className="round-link"
                      to={`/dashboard/recipes/${r.receta_id}`}
                      aria-label={`Abrir ${r.nombre}`}
                    >
                      <Icon name="arrow" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            icon="recipes"
            title={
              k.recipes.length
                ? "Ninguna receta coincide"
                : "Tu próxima gran receta empieza aquí"
            }
            description={
              k.recipes.length
                ? "Prueba otro nombre o desactiva el filtro."
                : "Define ingredientes y rendimiento; el inventario hará el resto."
            }
            action={
              !k.recipes.length && (
                <Button onClick={() => open({ type: "recipe" })}>
                  Crear mi primera receta
                </Button>
              )
            }
          />
        </section>
      )}
    </>
  );
}

function RecipeDetail({ open }) {
  const k = useKitchen(),
    { id } = useParams();
  const r = k.recipes.find((r) => r.receta_id === Number(id));
  if (!r)
    return (
      <Empty
        icon="recipes"
        title="No encontramos esta receta"
        description="Puede haberse eliminado o pertenecer a otra cocina."
        action={
          <Link to="/dashboard/recipes" className="button">
            Volver al recetario
          </Link>
        }
      />
    );
  const count = possible(r, k.ingredients),
    product = k.products.find((p) => p.receta_id === r.receta_id);
  return (
    <>
      <Link className="back-link" to="/dashboard/recipes">
        <Icon name="back" /> Volver al recetario
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">RECETA DE TU COCINA</span>
          <h1>{r.nombre}</h1>
          <p>
            {r.ingredientes.length}{" "}
            {r.ingredientes.length === 1 ? "ingrediente" : "ingredientes"} ·
            Rinde {fmt(r.rinde)} {r.unidad_medida} por tanda
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="secondary"
            onClick={() => open({ type: "recipe", item: r })}
          >
            <Icon name="edit" /> Editar receta
          </Button>
          <button
            className="icon-button delete-button"
            aria-label="Eliminar receta"
            onClick={() => open({ type: "delete", entity: "recipe", item: r })}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel recipe-ingredients">
          <div className="panel-heading">
            <h2>Ingredientes por tanda</h2>
            <span className="count-pill">{r.ingredientes.length}</span>
          </div>
          <div className="table-scroll">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Necesitas</th>
                  <th>Disponible</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {r.ingredientes.map((i) => {
                  const stock =
                    k.ingredients.find(
                      (m) => m.materia_prima_id === i.materia_prima_id
                    )?.cantidad_stock || 0;
                  return (
                    <tr key={i.materia_prima_id}>
                      <td>
                        <b>{i.nombre}</b>
                      </td>
                      <td>
                        {fmt(i.cantidad_necesaria)} {i.unidad_medida}
                      </td>
                      <td>
                        {fmt(stock)} {i.unidad_medida}
                      </td>
                      <td>
                        <span
                          className={`status-tag ${
                            stock >= i.cantidad_necesaria ? "ok" : "low"
                          }`}
                        >
                          <Icon
                            name={
                              stock >= i.cantidad_necesaria
                                ? "check"
                                : "warning"
                            }
                          />
                          {stock >= i.cantidad_necesaria
                            ? "Suficiente"
                            : "Insuficiente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="production-card">
          <div className="detail-art">
            <RecipeArt recipe={r} />
          </div>
          <div>
            <span className="eyebrow">MANOS A LA MASA</span>
            <h2>{count ? "Lista para preparar" : "Faltan ingredientes"}</h2>
            <p>
              {count
                ? `Tienes ingredientes para ${fmt(count)} ${
                    count === 1 ? "tanda" : "tandas"
                  }.`
                : "Repón tu despensa antes de elaborar esta receta."}
            </p>
            {!product && (
              <p className="field-hint">
                Primero crea el producto asociado para guardar lo que prepares.
              </p>
            )}
            <Button
              className="full"
              onClick={() =>
                open({ type: product ? "production" : "product", recipe: r })
              }
              disabled={product && !count}
            >
              <Icon name={product ? "cook" : "plus"} />
              {product ? "Elaborar receta" : "Crear producto"}
            </Button>
            <Link to="/dashboard/ingredients" className="text-link">
              Revisar ingredientes <Icon name="arrow" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export { RecipeList, RecipeDetail };

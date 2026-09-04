import React, { useState } from "react";
import { Button, Empty } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { fmt, exportCSV } from "./format";

function Status({ qty, min }) {
  return (
    <span
      className={`status-tag ${
        qty <= 0 ? "danger" : qty <= min ? "low" : "ok"
      }`}
    >
      <span />
      {qty <= 0 ? "Sin stock" : qty <= min ? "Stock bajo" : "En orden"}
    </span>
  );
}

function SearchBar({
  query,
  setQuery,
  filter,
  setFilter,
  categories,
  category,
  setCategory,
  placeholder,
}) {
  return (
    <div className="toolbar">
      <label className="search-input">
        <Icon name="search" />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery("")}
          >
            <Icon name="close" />
          </button>
        )}
      </label>
      {categories && (
        <select
          aria-label="Filtrar por categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
      <div className="filter-tabs" aria-label="Filtrar por existencias">
        <button
          className={!filter ? "selected" : ""}
          onClick={() => setFilter(false)}
          aria-pressed={!filter}
        >
          Todos
        </button>
        <button
          className={filter ? "selected" : ""}
          onClick={() => setFilter(true)}
          aria-pressed={filter}
        >
          Stock bajo
        </button>
      </div>
    </div>
  );
}

function Inventory({ type, open }) {
  const k = useKitchen(),
    isI = type === "ingredient";
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(false),
    [category, setCategory] = useState("");
  const all = isI ? k.ingredients : k.products;
  const qty = (i) => (isI ? i.cantidad_stock : i.cantidad_inventario),
    min = (i) => (isI ? i.cantidad_stock_minimo : i.cantidad_inventario_minimo);
  const list = all.filter(
    (i) =>
      i.nombre.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (!filter || qty(i) <= min(i)) &&
      (!category || i.clasificacion === category)
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {isI ? "EL ORIGEN DE CADA RECETA" : "LO QUE YA ESTÁ PREPARADO"}
          </span>
          <h1>
            {isI ? "Tu despensa" : "Tus productos"}
            <span className="accent-dot">.</span>
          </h1>
          <p>
            {isI
              ? "Cada ingrediente, su cantidad y el momento de reponerlo."
              : "Controla las existencias de tus elaboraciones."}
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="secondary"
            onClick={() => exportCSV(list, type)}
            disabled={!list.length}
          >
            <Icon name="download" /> Exportar
          </Button>
          <Button onClick={() => open({ type })}>
            <Icon name="plus" />{" "}
            {isI ? "Añadir ingrediente" : "Añadir producto"}
          </Button>
        </div>
      </div>
      <section className="panel inventory-panel">
        <SearchBar
          {...{ query, setQuery, filter, setFilter, category, setCategory }}
          categories={[...new Set(all.map((i) => i.clasificacion))]}
          placeholder={isI ? "Buscar ingrediente…" : "Buscar producto…"}
        />
        {list.length ? (
          <>
            <div className="table-scroll">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>{isI ? "Ingrediente" : "Producto"}</th>
                    <th>Categoría</th>
                    <th>Existencias</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={isI ? i.materia_prima_id : i.id}>
                      <td>
                        <span className="name-cell">
                          <span className="ingredient-symbol">
                            <Icon name={isI ? "leaf" : "products"} />
                          </span>
                          <b>{i.nombre}</b>
                        </span>
                      </td>
                      <td data-label="Categoría">
                        <span className="category-tag">{i.clasificacion}</span>
                      </td>
                      <td data-label="Existencias">
                        <strong>{fmt(qty(i))}</strong>{" "}
                        <span className="muted">{i.unidad_medida}</span>
                      </td>
                      <td data-label="Mínimo">
                        {fmt(min(i))}{" "}
                        <span className="muted">{i.unidad_medida}</span>
                      </td>
                      <td>
                        <Status qty={qty(i)} min={min(i)} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Editar ${i.nombre}`}
                            onClick={() => open({ type, item: i })}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button delete-button"
                            aria-label={`Eliminar ${i.nombre}`}
                            onClick={() =>
                              open({ type: "delete", entity: type, item: i })
                            }
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {list.length} de {all.length} {isI ? "ingredientes" : "productos"}
              <span>Las cantidades se actualizan con cada elaboración.</span>
            </div>
          </>
        ) : (
          <Empty
            title={
              all.length
                ? "No encontramos coincidencias"
                : isI
                ? "Tu despensa empieza aquí"
                : "Dale un lugar a lo que preparas"
            }
            description={
              all.length
                ? "Prueba otra búsqueda o cambia los filtros."
                : isI
                ? "Añade un ingrediente, define su unidad y el stock mínimo."
                : "Vincula un producto a una receta para registrar su producción."
            }
            icon={isI ? "leaf" : "products"}
            action={
              !all.length && (
                <Button onClick={() => open({ type })}>
                  <Icon name="plus" />{" "}
                  {isI ? "Mi primer ingrediente" : "Mi primer producto"}
                </Button>
              )
            }
          />
        )}
      </section>
      <div className="help-note">
        <Icon name="warning" />
        <span>
          {isI
            ? "Las unidades de ingredientes utilizados en recetas están protegidas para evitar cambios de cantidades involuntarios."
            : "Cada producto se vincula a una receta. Al elaborarla, sus existencias aumentan automáticamente."}
        </span>
      </div>
    </>
  );
}

export { Inventory };

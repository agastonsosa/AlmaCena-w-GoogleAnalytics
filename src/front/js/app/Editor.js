import React from "react";
import { useSafeState as useState } from "./useSafeState";
import { Link } from "react-router-dom";
import { Button, ErrorBox } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { fmt, possible } from "./format";
import { Modal } from "react-bootstrap";
import { request } from "./api";

function Editor({ modal, close }) {
  const k = useKitchen();
  const { type, item, entity } = modal;
  const initial = () =>
    type === "ingredient"
      ? {
          nombre: item?.nombre || "",
          clasificacion: item?.clasificacion || "Despensa",
          unidad_medida: item?.unidad_medida || "g",
          cantidad_stock: item?.cantidad_stock ?? 0,
          minimo_stock: item?.cantidad_stock_minimo ?? 0,
        }
      : type === "recipe"
      ? {
          nombre: item?.nombre || "",
          rinde: item?.rinde || 1,
          unidad_medida: item?.unidad_medida || "ud",
          photo_url: item?.photo_url || "",
          ingredientes: item?.ingredientes.map((i) => ({ ...i })) || [],
        }
      : type === "product"
      ? {
          receta_id: item?.receta_id || modal.recipe?.receta_id || "",
          cantidad_inventario: item?.cantidad_inventario ?? 0,
          cantidad_inventario_minimo: item?.cantidad_inventario_minimo ?? 0,
          clasificacion: item?.clasificacion || "Elaborados",
        }
      : { recipe_id: modal.recipe?.receta_id || "", batches: 1 };
  const [values, setValues] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [pick, setPick] = useState("");
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const field = (key, label, type_ = "text", props = {}) => (
    <label className="field">
      {label}
      <input
        type={type_}
        name={key}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
        required
        {...(type_ === "number"
          ? { min: 0, max: 100000000, step: "0.001" }
          : { maxLength: 80 })}
        {...props}
      />
    </label>
  );
  const r = k.recipes.find((r) => r.receta_id === Number(values.recipe_id));
  const batches = Number(values.batches),
    capacity = r ? possible(r, k.ingredients) : 0;
  const hasProduct = r && k.products.some((p) => p.receta_id === r.receta_id);
  const title =
    type === "delete"
      ? `Eliminar ${
          entity === "ingredient"
            ? "ingrediente"
            : entity === "recipe"
            ? "receta"
            : "producto"
        }`
      : type === "production"
      ? "Registrar elaboración"
      : `${item ? "Editar" : "Añadir"} ${
          type === "ingredient"
            ? "ingrediente"
            : type === "recipe"
            ? "receta"
            : "producto"
        }`;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let result;
      if (type === "delete") {
        const path =
          entity === "recipe"
            ? `/dashboard/recipes/${item.receta_id}`
            : `/dashboard/${
                entity === "ingredient" ? "ingredients" : "products"
              }`;
        result = await k.mutate(
          path,
          "DELETE",
          entity === "ingredient"
            ? { materia_prima_id: item.materia_prima_id }
            : entity === "product"
            ? { id: item.id }
            : undefined
        );
      } else if (type === "ingredient") {
        result = await k.mutate(
          "/dashboard/ingredients",
          item ? "PUT" : "POST",
          {
            ...values,
            cantidad: values.cantidad_stock,
            ...(item ? { materia_prima_id: item.materia_prima_id } : {}),
          }
        );
      } else if (type === "recipe") {
        if (!values.ingredientes.length)
          throw new Error("Añade al menos un ingrediente.");
        result = await k.mutate(
          "/dashboard/recipes" + (item ? `/${item.receta_id}` : ""),
          item ? "PUT" : "POST",
          values
        );
      } else if (type === "product") {
        result = await k.mutate("/dashboard/products", item ? "PUT" : "POST", {
          ...values,
          ...(item ? { id: item.id } : {}),
        });
      } else result = await k.mutate("/dashboard/recipes/make", "POST", values);
      k.notify(result.message);
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const result = await request("/images", {
        method: "POST",
        data: form,
        token: k.token,
      });
      change("photo_url", result.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <Modal
      show
      onHide={() => !busy && !uploading && close()}
      centered
      size={type === "recipe" ? "lg" : undefined}
      backdrop={busy ? "static" : true}
      className="studio-modal"
      aria-labelledby="editor-title"
    >
      <Modal.Header closeLabel="Cerrar" closeButton={!busy && !uploading}>
        <div>
          <span className="eyebrow">
            {type === "production"
              ? "DEL RECETARIO AL INVENTARIO"
              : "TU COCINA EN ORDEN"}
          </span>
          <Modal.Title id="editor-title">{title}</Modal.Title>
        </div>
      </Modal.Header>
      <form onSubmit={submit}>
        <Modal.Body>
          <ErrorBox>{error}</ErrorBox>
          {type === "delete" && (
            <div className="delete-confirm">
              <span className="empty-icon">
                <Icon name="trash" />
              </span>
              <p>
                Vas a eliminar <b>{item.nombre}</b>.
              </p>
              <p>
                Esta acción no se puede deshacer. Los registros vinculados deben
                retirarse primero.
              </p>
            </div>
          )}
          {type === "ingredient" && (
            <>
              {field("nombre", "Nombre del ingrediente", "text", {
                placeholder: "Ej. Harina de trigo",
                autoFocus: true,
              })}
              <div className="form-grid">
                {field("clasificacion", "Categoría")}
                <label className="field">
                  Unidad de medida
                  <select
                    value={values.unidad_medida}
                    onChange={(e) => change("unidad_medida", e.target.value)}
                  >
                    {[
                      ...new Set([
                        "g",
                        "kg",
                        "ml",
                        "l",
                        "ud",
                        values.unidad_medida,
                      ]),
                    ].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                {field("cantidad_stock", "Cantidad disponible", "number")}
                {field("minimo_stock", "Avísame al llegar a", "number")}
              </div>
              <p className="field-hint">
                Ambas cantidades se expresan en {values.unidad_medida}. El aviso
                se activa al llegar al mínimo.
              </p>
            </>
          )}
          {type === "recipe" && (
            <>
              {field("nombre", "Nombre de la receta", "text", {
                autoFocus: true,
                placeholder: "Ej. Pan de leche",
              })}
              <div className="form-grid">
                {field("rinde", "Rendimiento por tanda", "number", {
                  min: 0.001,
                })}
                {field("unidad_medida", "Unidad del rendimiento")}
              </div>
              <div className="form-section-heading">
                <h3>Ingredientes</h3>
                <span>Por una tanda</span>
              </div>
              {k.ingredients.length ? (
                <>
                  <div className="ingredient-picker">
                    <select
                      aria-label="Seleccionar ingrediente"
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                    >
                      <option value="">Selecciona un ingrediente</option>
                      {k.ingredients
                        .filter(
                          (i) =>
                            !values.ingredientes.some(
                              (x) => x.materia_prima_id === i.materia_prima_id
                            )
                        )
                        .map((i) => (
                          <option
                            key={i.materia_prima_id}
                            value={i.materia_prima_id}
                          >
                            {i.nombre} ({i.unidad_medida})
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={!pick}
                      onClick={() => {
                        const i = k.ingredients.find(
                          (i) => i.materia_prima_id === Number(pick)
                        );
                        change("ingredientes", [
                          ...values.ingredientes,
                          {
                            materia_prima_id: i.materia_prima_id,
                            nombre: i.nombre,
                            unidad_medida: i.unidad_medida,
                            cantidad_necesaria: 1,
                          },
                        ]);
                        setPick("");
                      }}
                    >
                      <Icon name="plus" /> Añadir
                    </Button>
                  </div>
                  {values.ingredientes.map((i, index) => (
                    <div className="recipe-form-row" key={i.materia_prima_id}>
                      <span>{i.nombre}</span>
                      <input
                        aria-label={`Cantidad de ${i.nombre}`}
                        type="number"
                        required
                        min="0.001"
                        max="100000000"
                        step="0.001"
                        value={i.cantidad_necesaria}
                        onChange={(e) =>
                          change(
                            "ingredientes",
                            values.ingredientes.map((x, n) =>
                              n === index
                                ? { ...x, cantidad_necesaria: e.target.value }
                                : x
                            )
                          )
                        }
                      />
                      <small>{i.unidad_medida}</small>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Quitar ${i.nombre}`}
                        onClick={() =>
                          change(
                            "ingredientes",
                            values.ingredientes.filter((x, n) => n !== index)
                          )
                        }
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="help-note">
                  Añade primero ingredientes en tu despensa.{" "}
                  <Link to="/dashboard/ingredients" onClick={close}>
                    Ir a ingredientes
                  </Link>
                </div>
              )}
              <div className="upload-field">
                <label className="field">
                  Fotografía <span className="muted">(opcional)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={upload}
                    disabled={uploading}
                  />
                </label>
                {uploading && <span role="status">Subiendo imagen…</span>}
                {values.photo_url && (
                  <div className="upload-preview">
                    <img src={values.photo_url} alt="Imagen seleccionada" />
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => change("photo_url", "")}
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
                <small>
                  JPG, PNG o WebP. Hasta 5 MB. También puedes guardar sin foto.
                </small>
              </div>
            </>
          )}
          {type === "product" && (
            <>
              <label className="field">
                Receta asociada
                <select
                  required
                  value={values.receta_id}
                  onChange={(e) => change("receta_id", e.target.value)}
                  disabled={!!item}
                >
                  <option value="">Selecciona una receta</option>
                  {k.recipes
                    .filter(
                      (r) =>
                        r.receta_id === item?.receta_id ||
                        !k.products.some((p) => p.receta_id === r.receta_id)
                    )
                    .map((r) => (
                      <option key={r.receta_id} value={r.receta_id}>
                        {r.nombre}
                      </option>
                    ))}
                </select>
              </label>
              {!k.recipes.length && (
                <p className="field-hint">
                  Crea primero una receta en el recetario.
                </p>
              )}
              {field("clasificacion", "Categoría")}
              <div className="form-grid">
                {field("cantidad_inventario", "Existencias actuales", "number")}
                {field("cantidad_inventario_minimo", "Stock mínimo", "number")}
              </div>
              <p className="field-hint">
                Unidad:{" "}
                {k.recipes.find((r) => r.receta_id === Number(values.receta_id))
                  ?.unidad_medida || "la de la receta"}
                . Cada elaboración sumará el rendimiento de la receta.
              </p>
            </>
          )}
          {type === "production" && (
            <>
              <label className="field">
                Qué vas a preparar
                <select
                  required
                  value={values.recipe_id}
                  onChange={(e) => change("recipe_id", e.target.value)}
                >
                  <option value="">Selecciona una receta</option>
                  {k.recipes.map((r) => (
                    <option key={r.receta_id} value={r.receta_id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {field("batches", "Número de tandas", "number", {
                min: 1,
                max: 1000,
                step: 1,
              })}
              {r && (
                <>
                  <div className="production-summary">
                    <span>Vas a obtener</span>
                    <strong>
                      {fmt(r.rinde * batches)} <small>{r.unidad_medida}</small>
                    </strong>
                    <span>de {r.nombre}</span>
                  </div>
                  <div className="production-ingredients">
                    {r.ingredientes.map((i) => (
                      <div key={i.materia_prima_id}>
                        <span>{i.nombre}</span>
                        <b>
                          −{fmt(i.cantidad_necesaria * batches)}{" "}
                          {i.unidad_medida}
                        </b>
                      </div>
                    ))}
                  </div>
                  {!hasProduct ? (
                    <ErrorBox>
                      Crea el producto de esta receta antes de elaborar.
                    </ErrorBox>
                  ) : batches > capacity ? (
                    <ErrorBox>
                      No hay ingredientes suficientes. Puedes preparar hasta{" "}
                      {capacity} tandas.
                    </ErrorBox>
                  ) : (
                    <p className="field-hint">
                      <Icon name="check" /> Hay ingredientes suficientes. Las
                      cantidades se actualizarán al confirmar.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            type="button"
            disabled={busy || uploading}
            onClick={close}
          >
            Cancelar
          </Button>
          <Button
            variant={type === "delete" ? "danger-button" : ""}
            busy={busy}
            type="submit"
            disabled={
              uploading ||
              (type === "production" &&
                (!r || !hasProduct || batches > capacity)) ||
              (type === "recipe" && !values.ingredientes.length)
            }
          >
            {type === "delete"
              ? "Sí, eliminar"
              : type === "production"
              ? "Confirmar elaboración"
              : "Guardar " +
                (type === "ingredient"
                  ? "ingrediente"
                  : type === "recipe"
                  ? "receta"
                  : "producto")}
            <Icon
              name={
                type === "delete"
                  ? "trash"
                  : type === "production"
                  ? "cook"
                  : "check"
              }
            />
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export { Editor };

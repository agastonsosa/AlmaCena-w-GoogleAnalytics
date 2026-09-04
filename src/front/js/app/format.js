const fmt = (v) =>
  new Intl.NumberFormat("es", { maximumFractionDigits: 3 }).format(
    Number(v || 0)
  );

function possible(recipe, ingredients) {
  if (!recipe.ingredientes.length) return 0;
  return Math.max(
    0,
    Math.min(
      ...recipe.ingredientes.map((i) =>
        Math.floor(
          ((ingredients.find((m) => m.materia_prima_id === i.materia_prima_id)
            ?.cantidad_stock || 0) +
            1e-8) /
            i.cantidad_necesaria
        )
      )
    )
  );
}

function exportCSV(rows, type) {
  const headers = ["Nombre", "Categoría", "Cantidad", "Unidad", "Mínimo"];
  const cells = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const data = [
    headers,
    ...rows.map((i) => [
      i.nombre,
      i.clasificacion,
      type === "ingredient" ? i.cantidad_stock : i.cantidad_inventario,
      i.unidad_medida,
      type === "ingredient"
        ? i.cantidad_stock_minimo
        : i.cantidad_inventario_minimo,
    ]),
  ]
    .map((r) => r.map(cells).join(";"))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + data], { type: "text/csv;charset=utf-8;" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `almacena-${
    type === "ingredient" ? "ingredientes" : "productos"
  }.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export { fmt, possible, exportCSV };

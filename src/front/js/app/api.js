const API = "/api";

async function request(path, { method = "GET", data, token, signal } = {}) {
  const upload = typeof FormData !== "undefined" && data instanceof FormData;
  let response;
  try {
    response = await fetch(API + path, {
      method,
      signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!upload && data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? (upload ? data : JSON.stringify(data)) : undefined,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error(
      "No podemos conectar con la cocina. Comprueba la conexión e inténtalo de nuevo."
    );
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.message || payload.msg || "No se pudo completar la operación."
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}

export { request };

import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { request } from "./api";
import { Icon } from "./icons";

const Context = createContext();

const useKitchen = () => useContext(Context);

const empty = { ingredients: [], recipes: [], products: [], activity: [] };

function Provider({ children }) {
  const [token, setToken] = useState(() =>
    sessionStorage.getItem("almacena-session")
  );
  const [user, setUser] = useState(null),
    [data, setData] = useState(empty),
    [loading, setLoading] = useState(!!token),
    [error, setError] = useState(""),
    [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const notify = (message, kind = "success") => setToast({ message, kind });
  const clear = useCallback(() => {
    sessionStorage.removeItem("almacena-session");
    setToken(null);
    setUser(null);
    setData(empty);
  }, []);
  const refresh = useCallback(
    async (signal) => {
      if (!token) return;
      setError("");
      try {
        const [ingredients, recipes, products, summary] = await Promise.all(
          [
            "/dashboard/ingredients",
            "/dashboard/recipes",
            "/dashboard/products",
            "/dashboard",
          ].map((p) => request(p, { token, signal }))
        );
        setData({ ingredients, recipes, products, activity: summary.activity });
        setUser(summary.user);
      } catch (e) {
        if (e.name === "AbortError") return;
        if (e.status === 401) {
          clear();
          navigate("/login", { replace: true });
          notify("Tu sesión terminó. Vuelve a entrar.", "error");
        } else {
          setError(e.message);
          throw e;
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [token]
  );
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    refresh(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [token]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const enter = async (path, values) => {
    const result = await request(path, { method: "POST", data: values });
    sessionStorage.setItem("almacena-session", result.token);
    setData(empty);
    setLoading(true);
    setUser(result.user);
    setToken(result.token);
    navigate("/dashboard");
  };
  const mutate = async (path, method, values) => {
    try {
      const result = await request(path, { method, data: values, token });
      await refresh().catch(() =>
        notify(
          "El cambio se guardó, pero no pudimos actualizar la vista. Recárgala.",
          "error"
        )
      );
      return result;
    } catch (e) {
      if (e.status === 401) {
        clear();
        navigate("/login");
      }
      throw e;
    }
  };
  const logout = async () => {
    try {
      await request("/logout", { method: "POST", token });
      clear();
      navigate("/");
    } catch (e) {
      if (e.status === 401) {
        clear();
        navigate("/");
        return;
      }
      notify(e.message, "error");
    }
  };
  return (
    <Context.Provider
      value={{
        ...data,
        user,
        token,
        loading,
        error,
        refresh,
        enter,
        mutate,
        logout,
        notify,
        clear,
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast-message ${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <Icon name={toast.kind === "error" ? "warning" : "success"} />
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setToast(null)}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}

export { Provider, useKitchen };

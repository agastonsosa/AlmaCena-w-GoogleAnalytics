import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Button, Brand, Empty } from "./app/ui";
import { Provider } from "./app/KitchenContext";
import { Landing } from "./app/Landing";
import { Auth } from "./app/Auth";
import { Analytics } from "./app/Analytics";
const Shell = lazy(() =>
  import("./app/Shell").then((module) => ({ default: module.Shell }))
);
class Boundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="loading-state">
        <h1>Algo no salió como esperábamos.</h1>
        <p>Recarga la página para volver a tu cocina.</p>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      (pathname.includes("ingredients")
        ? "Ingredientes"
        : pathname.includes("recipes")
        ? "Recetario"
        : pathname.includes("products")
        ? "Productos"
        : pathname.includes("dashboard")
        ? "Mi cocina"
        : "Tu cocina, en orden") + " · AlmaCena";
  }, [pathname]);
  return null;
}
export default function Studio() {
  return (
    <Boundary>
      <BrowserRouter>
        <Provider>
          <ScrollReset />
          <Analytics />
          <Suspense
            fallback={
              <div className="loading-state" role="status">
                Preparando tu cocina…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth key="login" />} />
              <Route
                path="/signup"
                element={<Auth key="signup" mode="signup" />}
              />
              <Route
                path="/passwordrecovery"
                element={<Auth key="recovery" mode="recovery" />}
              />
              <Route
                path="/passwordreset/:reset_token"
                element={<Auth key="reset" mode="reset" />}
              />
              <Route path="/dashboard/*" element={<Shell />} />
              <Route
                path="*"
                element={
                  <div className="not-found">
                    <Brand />
                    <Empty
                      title="Esta página no existe"
                      description="Vuelve al inicio para encontrar tu cocina."
                      action={
                        <Link className="button" to="/">
                          Volver al inicio
                        </Link>
                      }
                    />
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </Provider>
      </BrowserRouter>
    </Boundary>
  );
}

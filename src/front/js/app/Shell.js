import React, { useState, useEffect } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Brand, Button, Empty } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { navItems } from "./navigation";
import { Overview } from "./Overview";
import { Inventory } from "./Inventory";
import { RecipeList, RecipeDetail } from "./Recipes";
import { Editor } from "./Editor";
import { Profile } from "./Profile";

function Shell() {
  const k = useKitchen(),
    location = useLocation();
  const [menu, setMenu] = useState(false),
    [modal, setModal] = useState(null),
    [small, setSmall] = useState(
      () => window.matchMedia("(max-width:760px)").matches
    );
  useEffect(() => {
    const mq = window.matchMedia("(max-width:760px)");
    const update = () => setSmall(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const key = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menu]);
  useEffect(() => {
    setMenu(false);
    setModal(null);
  }, [location.pathname]);
  if (!k.token) return <Navigate to="/login" replace />;
  const alerts =
    k.ingredients.filter((i) => i.cantidad_stock <= i.cantidad_stock_minimo)
      .length +
    k.products.filter(
      (p) => p.cantidad_inventario <= p.cantidad_inventario_minimo
    ).length;
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        id="kitchen-navigation"
        inert={small && !menu ? "" : undefined}
        aria-hidden={small && !menu ? true : undefined}
        className={`sidebar ${menu ? "open" : ""}`}
      >
        <Brand light />
        <div className="kitchen-label">
          <span className="kitchen-avatar">
            <Icon name="cook" />
          </span>
          <div>
            <strong>{k.user?.address || "Mi cocina"}</strong>
            <span>
              {k.user?.is_demo
                ? "Espacio de demostración"
                : "Mi espacio de trabajo"}
            </span>
          </div>
        </div>
        <span className="nav-label">MI COCINA</span>
        <nav>
          {navItems.map(([path, icon, label]) => (
            <NavLink key={path} to={path} end={path === "/dashboard"}>
              <Icon name={icon} />
              <span>{label}</span>
              {path.endsWith("ingredients") && k.ingredients.length > 0 && (
                <small>{k.ingredients.length}</small>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon">
            <Icon name="seed" />
          </span>
          <strong>Un ingrediente de ventaja.</strong>
          <p>
            Define mínimos de stock y llega a cada elaboración con todo listo.
          </p>
          <Link to="/dashboard/ingredients">
            Revisar despensa <Icon name="arrow" />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/dashboard/profile">
            <Icon name="settings" /> Mi perfil
          </NavLink>
          <button onClick={k.logout}>
            <Icon name="logout" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="workspace-content">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir navegación"
              aria-expanded={menu}
              aria-controls="kitchen-navigation"
              onClick={() => setMenu(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="topbar-context">
              Mi espacio <Icon name="chevron" />{" "}
              <b>
                {location.pathname.includes("profile")
                  ? "Perfil"
                  : navItems.find(
                      ([p]) =>
                        p !== "/dashboard" && location.pathname.startsWith(p)
                    )?.[2] || "Vista general"}
              </b>
            </span>
          </div>
          <div className="topbar-right">
            {k.user?.is_demo && <span className="demo-badge">Modo demo</span>}
            <Link className="stock-link" to="/dashboard?alerts=1">
              <span className={`status-dot ${alerts ? "amber" : ""}`} />
              {alerts ? `${alerts} avisos de stock` : "Stock al día"}
            </Link>
            <Link
              className="user-avatar"
              to="/dashboard/profile"
              aria-label="Ver mi perfil"
            >
              {k.user?.name?.slice(0, 1) || "A"}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {k.loading ? (
            <div className="loading-state" role="status">
              <Icon name="loading" spin />
              <h2>Preparando tu cocina…</h2>
            </div>
          ) : k.error ? (
            <Empty
              icon="warning"
              title="No pudimos cargar tu cocina"
              description={k.error}
              action={
                <Button onClick={() => k.refresh().catch(() => {})}>
                  Volver a intentar
                </Button>
              }
            />
          ) : (
            <Routes>
              <Route index element={<Overview open={setModal} />} />
              <Route
                path="ingredients"
                element={<Inventory type="ingredient" open={setModal} />}
              />
              <Route
                path="products"
                element={<Inventory type="product" open={setModal} />}
              />
              <Route path="recipes" element={<RecipeList open={setModal} />} />
              <Route
                path="recipes/:id"
                element={<RecipeDetail open={setModal} />}
              />
              <Route path="profile" element={<Profile />} />
              <Route
                path="edit-profile"
                element={<Navigate to="/dashboard/profile" replace />}
              />
              <Route
                path="*"
                element={
                  <Empty
                    title="Esta página no está en tu cocina"
                    description="Vuelve a la vista general para continuar."
                    action={
                      <Link to="/dashboard" className="button">
                        Ir a mi cocina
                      </Link>
                    }
                  />
                }
              />
            </Routes>
          )}
        </main>
        <footer className="workspace-footer">
          <Link to="/privacy">Privacidad y cookies</Link>
          <span>AlmaCena © {new Date().getFullYear()}</span>
        </footer>
      </div>
      {modal && <Editor modal={modal} close={() => setModal(null)} />}
    </div>
  );
}

export { Shell };

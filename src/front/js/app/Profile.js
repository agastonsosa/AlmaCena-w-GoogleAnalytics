import React from "react";
import { useSafeState as useState } from "./useSafeState";
import { Link } from "react-router-dom";
import { Button, ErrorBox } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import { request } from "./api";

function Profile() {
  const k = useKitchen();
  const [values, setValues] = useState({
      name: k.user.name,
      last_name: k.user.last_name,
      address: k.user.address,
      photo_url: k.user.photo_url || "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await k.mutate("/profile", "PUT", values);
      k.notify(r.message);
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
      const data = new FormData();
      data.append("image", file);
      const r = await request("/images", {
        method: "POST",
        data,
        token: k.token,
      });
      setValues((v) => ({ ...v, photo_url: r.url }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A TU MANERA</span>
          <h1>
            Tu perfil<span className="accent-dot">.</span>
          </h1>
          <p>Los pequeños detalles que hacen tuyo este espacio.</p>
        </div>
      </div>
      <div className="profile-grid">
        <section className="panel profile-form">
          <div className="panel-heading">
            <h2>Información de tu cocina</h2>
          </div>
          <form onSubmit={save}>
            <ErrorBox>{error}</ErrorBox>
            <div className="profile-avatar-row">
              {values.photo_url ? (
                <img src={values.photo_url} alt="Tu foto de perfil" />
              ) : (
                <span className="profile-avatar">
                  {values.name.slice(0, 1)}
                </span>
              )}
              <label className="field">
                Foto de perfil (opcional)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="form-grid">
              {[
                ["name", "Nombre"],
                ["last_name", "Apellido"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    value={values[key]}
                    required={key === "name"}
                    maxLength={80}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              Nombre de la cocina
              <input
                value={values.address}
                maxLength={80}
                onChange={(e) =>
                  setValues({ ...values, address: e.target.value })
                }
              />
            </label>
            <label className="field">
              Email
              <input type="email" value={k.user.email} disabled />
            </label>
            <Button busy={busy} disabled={uploading} type="submit">
              Guardar cambios <Icon name="check" />
            </Button>
          </form>
        </section>
        <aside className="panel profile-note">
          <Icon name="seed" />
          <h2>
            {k.user.is_demo
              ? "Un espacio para explorar"
              : "Tu cocina, tu colección"}
          </h2>
          <p>
            {k.user.is_demo
              ? "Estás usando una cocina de muestra independiente. Puedes editar ingredientes, recetas y productos con tranquilidad."
              : "Tus ingredientes y recetas están asociados a tu cuenta. Los cambios se guardan en tu cocina."}
          </p>
          {k.user.is_demo ? (
            <Link to="/signup" className="button secondary">
              Crear mi propia cuenta
            </Link>
          ) : (
            <Link to="/passwordrecovery" className="text-link">
              Restablecer contraseña <Icon name="arrow" />
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}

export { Profile };

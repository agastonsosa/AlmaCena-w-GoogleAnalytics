import React from "react";
import { useSafeState as useState } from "./useSafeState";
import { Link, useParams } from "react-router-dom";
import { Brand, Button, ErrorBox } from "./ui";
import { Icon } from "./icons";
import { useKitchen } from "./KitchenContext";
import ingredients from "../../img/kitchen-ingredients.jpg";
import { request } from "./api";
import { DemoButton } from "./Landing";
import { privacyContact } from "./privacy-contact";

function Auth({ mode = "login" }) {
  const { enter } = useKitchen(),
    { reset_token } = useParams();
  const [values, setValues] = useState({
      name: "",
      email: "",
      password: "",
      address: "",
      new_password: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const titles = {
    login: ["Qué bueno verte.", "Tu cocina está donde la dejaste."],
    signup: [
      "Un lugar para tu cocina.",
      "Crea tu cuenta y empieza con tu primera receta.",
    ],
    recovery: [
      "Recupera el acceso.",
      "Te enviaremos un enlace válido durante 30 minutos.",
    ],
    reset: [
      "Una nueva contraseña.",
      "Elige al menos 10 caracteres para proteger tu cocina.",
    ],
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login" || mode === "signup")
        await enter("/" + mode, values);
      else {
        const r = await request(
          mode === "recovery"
            ? "/passwordrecovery"
            : `/resetpassword/${reset_token}`,
          { method: "POST", data: values }
        );
        setSuccess(r.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key, label, type = "text", props = {}) => (
    <label className="field">
      {label}
      <input
        name={key}
        type={type}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        required
        maxLength={80}
        {...props}
      />
    </label>
  );
  return (
    <div className="auth-page">
      <div className="auth-side">
        <Brand light />
        <div>
          <span className="eyebrow">Tu cocina, en equilibrio</span>
          <h2>
            El secreto está
            <br />
            en tenerlo
            <br />
            <em>todo a mano.</em>
          </h2>
          <img
            src={ingredients}
            alt="Ingredientes frescos listos para cocinar"
          />
        </div>
        <p>Ingredientes · Recetas · Producción</p>
      </div>
      <main className="auth-main">
        <Link className="back-link" to="/">
          <Icon name="back" /> Volver al inicio
        </Link>
        <div className="auth-form">
          <span className="eyebrow">
            AlmaCena / {mode === "signup" ? "Crear cuenta" : "Bienvenido"}
          </span>
          <h1>{titles[mode][0]}</h1>
          <p>{titles[mode][1]}</p>
          {success ? (
            <div className="success-panel" role="status">
              <Icon name="success" />
              <p>{success}</p>
              <Link className="button" to="/login">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <ErrorBox>{error}</ErrorBox>
              {mode === "signup" && (
                <>
                  {field("name", "Tu nombre", "text", {
                    autoComplete: "given-name",
                  })}
                  {field("address", "Nombre de tu cocina", "text", {
                    placeholder: "Ej. La cocina de Alex",
                    required: false,
                  })}
                </>
              )}
              {mode !== "reset" &&
                field("email", "Email", "email", { autoComplete: "email" })}
              {(mode === "login" || mode === "signup") &&
                field("password", "Contraseña", "password", {
                  autoComplete:
                    mode === "login" ? "current-password" : "new-password",
                  minLength: mode === "signup" ? 10 : undefined,
                })}
              {mode === "reset" &&
                field("new_password", "Nueva contraseña", "password", {
                  minLength: 10,
                  autoComplete: "new-password",
                })}
              {mode === "signup" && (
                <span className="field-hint">Usa al menos 10 caracteres.</span>
              )}
              {mode === "login" && (
                <Link className="forgot" to="/passwordrecovery">
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
              {mode === "signup" && (
                <p className="privacy-summary">
                  Responsable: {privacyContact.name}. Usamos tus datos para
                  crear y gestionar tu cuenta, como parte del servicio
                  solicitado. Vercel y Neon alojan la aplicación y sus datos en
                  Estados Unidos. Puedes ejercer tus derechos en{" "}
                  {privacyContact.email}. La analítica es opcional y se elige
                  por separado. Consulta la{" "}
                  <Link to="/privacy">política de privacidad y cookies</Link>.
                </p>
              )}
              <Button busy={busy} className="full" type="submit">
                {mode === "login"
                  ? "Entrar a mi cocina"
                  : mode === "signup"
                  ? "Crear cuenta"
                  : mode === "recovery"
                  ? "Enviar enlace"
                  : "Guardar contraseña"}
                <Icon name="arrow" />
              </Button>
            </form>
          )}
          {(mode === "login" || mode === "signup") && (
            <>
              <p className="auth-switch">
                {mode === "login"
                  ? "¿Primera vez por aquí?"
                  : "¿Ya tienes una cuenta?"}{" "}
                <Link to={mode === "login" ? "/signup" : "/login"}>
                  {mode === "login" ? "Crear una cuenta" : "Iniciar sesión"}
                </Link>
              </p>
              <div className="divider">
                <span>o echa un vistazo primero</span>
              </div>
              <DemoButton variant="secondary" />
            </>
          )}
        </div>
        <p className="auth-bottom">
          <Link to="/privacy">Privacidad y cookies</Link>
        </p>
      </main>
    </div>
  );
}

export { Auth };

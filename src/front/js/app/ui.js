import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./icons";

function Brand({ light = false }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? "light" : ""}`}
      aria-label="AlmaCena, inicio"
    >
      <span className="brand-mark">
        <Icon name="leaf" />
      </span>
      <span>
        alma<span className="brand-end">cena</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

const Button = ({
  children,
  variant = "",
  busy = false,
  className = "",
  ...props
}) => (
  <button
    className={`button ${variant} ${className}`}
    {...props}
    disabled={props.disabled || busy}
  >
    {busy ? <Icon name="loading" spin /> : null}
    {children}
  </button>
);

const ErrorBox = ({ children }) =>
  children ? (
    <div className="error-box" role="alert">
      <Icon name="warning" />
      <span>{children}</span>
    </div>
  ) : null;

const Empty = ({ icon = "leaf", title, description, action }) => (
  <div className="empty-state">
    <span className="empty-icon">
      <Icon name={icon} />
    </span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

function RecipeArt({ recipe }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [recipe.photo_url]);
  return recipe.photo_url && !failed ? (
    <img
      src={recipe.photo_url}
      alt={recipe.nombre}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="recipe-placeholder">
      <Icon name="recipes" />
      <span>RECETA DE LA CASA</span>
    </div>
  );
}

export { Brand, Button, ErrorBox, Empty, RecipeArt };

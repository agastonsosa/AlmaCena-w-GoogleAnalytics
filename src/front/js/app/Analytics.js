import React, { useEffect, useRef, useState } from "react";
import "../../styles/analytics.css";
import { Link, useLocation } from "react-router-dom";
import {
  analyticsPage,
  analyticsReferrer,
  readConsent,
  saveConsent,
  clearAnalyticsCookies,
} from "./analytics.mjs";

export function Analytics() {
  const location = useLocation();
  const [measurement, setMeasurement] = useState("");
  const [consent, setConsent] = useState(() => {
    try {
      return readConsent(window.localStorage);
    } catch {
      return "";
    }
  });
  const [settings, setSettings] = useState(false);
  const started = useRef(false);
  const previous = useRef("");
  useEffect(() => {
    if (consent !== "granted") {
      clearAnalyticsCookies(document, window.location.hostname);
    }
  }, [consent]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/config", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (
          !controller.signal.aborted &&
          /^G-[A-Z0-9]{6,20}$/.test(data.ga4_id || "")
        )
          setMeasurement(data.ga4_id);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!measurement || consent !== "granted") return;
    window[`ga-disable-${measurement}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    if (!started.current) {
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      window.gtag("consent", "update", { analytics_storage: "granted" });
      window.gtag("js", new Date());
      const initialPage = analyticsPage(window.location.href);
      window.gtag("config", measurement, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: 180 * 86400,
        cookie_update: false,
        page_location: initialPage.location,
        page_title: initialPage.title,
        page_referrer: analyticsReferrer(document.referrer),
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurement}`;
      document.head.appendChild(script);
      started.current = true;
    }
    const page = analyticsPage(window.location.href);
    // Query-only UI filters do not count as new pages.
    if (previous.current === page.path) return;
    window.gtag("set", {
      page_location: page.location,
      page_title: page.title,
    });
    window.gtag("event", "page_view", {
      send_to: measurement,
      page_location: page.location,
      page_title: page.title,
      page_referrer: previous.current
        ? new URL(previous.current, window.location.origin).href
        : analyticsReferrer(document.referrer),
    });
    previous.current = page.path;
  }, [measurement, consent, location.pathname]);

  const choose = (choice) => {
    try {
      saveConsent(window.localStorage, choice);
    } catch {
      /* Storage unavailable. */
    }
    if (choice === "denied") {
      window[`ga-disable-${measurement}`] = true;
      clearAnalyticsCookies(document, window.location.hostname);
    }
    setConsent(choice);
    setSettings(false);
    if (choice === "denied" && started.current) window.location.reload();
  };
  if (!measurement) return null;
  return (
    <>
      <button
        className="analytics-preferences"
        onClick={() => setSettings(true)}
      >
        Cookies y privacidad
      </button>
      {((!consent && location.pathname !== "/privacy") || settings) && (
        <section
          className="analytics-notice"
          aria-label="Preferencias de privacidad"
        >
          <div>
            <h2>Tú decides sobre la analítica</h2>
            <p>
              En AlmaCena utilizamos almacenamiento necesario para que la
              aplicación funcione. Solo con tu permiso, usamos cookies de Google
              Analytics para conocer las visitas, las páginas consultadas y su
              procedencia aproximada. No enviamos los datos de tu cocina ni de
              tu cuenta. Puedes rechazarlo y usar toda la aplicación. Puedes
              cambiar tu elección en Cookies y privacidad.
            </p>
            <Link to="/privacy" onClick={() => setSettings(false)}>
              Política de privacidad y cookies
            </Link>
          </div>
          <div className="analytics-actions">
            <button
              className="button secondary"
              onClick={() => choose("denied")}
            >
              Rechazar analítica
            </button>
            <button
              className="button secondary"
              onClick={() => choose("granted")}
            >
              Aceptar analítica
            </button>
            {consent && (
              <button className="text-link" onClick={() => setSettings(false)}>
                Cerrar
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

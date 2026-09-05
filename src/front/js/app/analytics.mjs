// Never send recipe IDs, reset tokens, search text, names or emails to GA4.
export function analyticsPage(href) {
  const url = new URL(href);
  const known = [
    "/",
    "/login",
    "/signup",
    "/privacy",
    "/passwordrecovery",
    "/dashboard",
    "/dashboard/ingredients",
    "/dashboard/recipes",
    "/dashboard/products",
    "/dashboard/profile",
  ];
  let path = url.pathname.replace(/\/$/, "") || "/";
  if (/^\/dashboard\/recipes\/[^/]+$/.test(path))
    path = "/dashboard/recipes/detail";
  else if (path.startsWith("/passwordreset/")) path = "/passwordreset";
  else if (!known.includes(path)) path = "/404";
  const clean = new URL(path, url.origin);
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]) {
    const value = url.searchParams.get(key);
    if (value && /^[a-zA-Z0-9 _.-]{1,80}$/.test(value))
      clean.searchParams.set(key, value);
  }
  return { path, location: clean.href, title: `AlmaCena · ${path}` };
}

export function analyticsReferrer(referrer) {
  try {
    return new URL(referrer).origin + "/";
  } catch {
    return "";
  }
}

const consentKey = "almacena-analytics-consent-v2";
export function readConsent(storage, now = Date.now()) {
  try {
    const stored = JSON.parse(storage.getItem(consentKey));
    if (
      stored &&
      ["granted", "denied"].includes(stored.choice) &&
      now >= stored.date &&
      now - stored.date < 180 * 86400000
    )
      return stored.choice;
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return "";
}
export function saveConsent(storage, choice) {
  try {
    storage.setItem(consentKey, JSON.stringify({ choice, date: Date.now() }));
  } catch {
    /* Consent still applies to this page. */
  }
}

export function clearAnalyticsCookies(doc, hostname) {
  const names = doc.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((n) => n === "_ga" || n.startsWith("_ga_"));
  for (const name of names) {
    doc.cookie = `${name}=; Max-Age=0; path=/`;
    const parts = hostname.split(".");
    for (let i = 0; i < parts.length - 1; i++)
      doc.cookie = `${name}=; Max-Age=0; path=/; domain=.${parts
        .slice(i)
        .join(".")}`;
  }
}

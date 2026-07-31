const normalizedBasePath = () => {
  const value = import.meta.env.BASE_URL || "/";
  return value === "/" ? "" : `/${value.replace(/^\/|\/$/g, "")}`;
};

const configuredSiteUrl = () =>
  String(import.meta.env.VITE_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");

export const publicSiteUrl = (path = "") => {
  const cleanPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  const configured = configuredSiteUrl();
  if (configured) return `${configured}${cleanPath}`;

  if (typeof window === "undefined") return cleanPath || "/";
  return `${window.location.origin}${normalizedBasePath()}${cleanPath}`;
};

/**
 * Authentication links must return to the origin that is actually serving
 * the application. This keeps password recovery working on the temporary
 * Cloudflare domain and switches to vizora.tj automatically once that domain
 * is connected. Public card links can still use VITE_PUBLIC_SITE_URL.
 */
export const authRedirectUrl = (path = "") => {
  if (typeof window === "undefined") return publicSiteUrl(path);
  const cleanPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${window.location.origin}${normalizedBasePath()}${cleanPath}`;
};

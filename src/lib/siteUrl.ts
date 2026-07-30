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

export const authRedirectUrl = (path = "") => publicSiteUrl(path);

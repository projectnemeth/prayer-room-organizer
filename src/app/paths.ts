function normalizedBasePath(basePath: string) {
  if (!basePath || basePath === "/") return "";
  return `/${basePath.replace(/^\/+|\/+$/g, "")}`;
}

/** Builds an internal route that works for root and subpath deployments. */
export function appPath(path: string, basePath = import.meta.env.BASE_URL): string {
  const route = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBasePath(basePath)}${route}`;
}

/** Builds an absolute in-app URL for redirects sent by external services. */
export function appUrl(path: string, origin = window.location.origin): string {
  return new URL(appPath(path), origin).toString();
}

const basePath = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function appPath(path = "") {
  const normalized = path.replace(/^\/+/, "");
  return `${basePath}${normalized}`;
}
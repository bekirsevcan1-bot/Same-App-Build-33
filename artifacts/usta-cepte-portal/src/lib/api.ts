const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${configuredApiUrl}${normalizedPath}`;
}
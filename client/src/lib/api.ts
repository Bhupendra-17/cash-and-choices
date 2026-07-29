/**
 * Resolves API routes dynamically based on VITE_API_BASE_URL.
 * In local dev: defaults to relative "/api/*" (proxied by Vite to localhost:5000).
 * In Vercel production: points to full URL if provided (e.g. "https://backend.onrender.com/api").
 */
export function apiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!baseUrl) return path;

  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Avoid duplicate /api/api/ if BASE_URL already contains /api
  if (cleanBase.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${cleanBase}${cleanPath.substring(4)}`;
  }

  // If BASE_URL is a domain like "https://backend.onrender.com" and path is "/funds/search"
  if (!cleanBase.endsWith("/api") && !cleanPath.startsWith("/api/")) {
    return `${cleanBase}/api${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}

/**
 * Wrapper around global fetch that resolves API URLs dynamically.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const resolvedUrl = apiUrl(path);
  return fetch(resolvedUrl, init);
}

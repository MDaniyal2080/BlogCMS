// Shared asset URL resolution helpers for both client and server usage
// Mirrors the logic used by SettingsContext.assetUrl(), but without React.

// Normalize a possibly relative asset path.
// - Keep absolute http(s) and protocol-relative URLs as-is
// - Keep data: URLs as-is
// - Ensure a single leading slash for relative paths
// - Strip legacy leading /api when followed by uploads/
export function normalizeAssetPath(url?: string): string {
  let u = (url || '').trim();
  if (!u) return '';
  if (/^(https?:)?\/\//i.test(u)) return u; // http, https, or protocol-relative
  if (u.startsWith('data:')) return u; // data URL
  if (!u.startsWith('/')) u = `/${u}`;
  // Strip legacy /api prefix for uploaded assets (tolerate accidental double slashes)
  u = u.replace(/^\/api\/+uploads\//, '/uploads/');
  // Collapse duplicate slashes in relative paths
  u = u.replace(/\/{2,}/g, '/');
  return u;
}

// Compute an API base (origin) from a raw NEXT_PUBLIC_API_URL value.
// If rawApiUrl is undefined, fall back to env (with dev default).
// If rawApiUrl is an empty string, return empty string to allow relative URLs in production builds.
export function apiBaseFromRaw(rawApiUrl?: string): string {
  if (typeof rawApiUrl === 'undefined') {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return raw.replace(/\/?api\/?$/, '').replace(/\/+$/, '');
  }
  const given = rawApiUrl.trim();
  if (!given) return '';
  return given.replace(/\/?api\/?$/, '').replace(/\/+$/, '');
}

// Resolve url using a precomputed apiBase. If apiBase is empty, return a normalized relative path.
export function assetUrlFromApiBase(url?: string, apiBase?: string): string {
  const p = normalizeAssetPath(url);
  if (!p) return '';
  if (p.startsWith('data:')) return p;
  if (/^(https?:)?\/\//i.test(p)) {
    // Fix legacy absolute URLs like https://host/api//uploads/... -> https://host/uploads/...
    return p.replace(/^(https?:\/\/[^\/]+)\/api\/+uploads\//i, '$1/uploads/');
  }
  const base = (apiBase || '').trim();
  return base ? `${base}${p}` : p;
}

// Resolve url using either the provided rawApiUrl (NEXT_PUBLIC_API_URL) or env fallback.
export function assetUrl(url?: string, rawApiUrl?: string): string {
  const p = normalizeAssetPath(url);
  if (!p) return '';
  if (p.startsWith('data:')) return p;
  if (/^(https?:)?\/\//i.test(p)) {
    // Fix legacy absolute URLs like https://host/api//uploads/... -> https://host/uploads/...
    return p.replace(/^(https?:\/\/[^\/]+)\/api\/+uploads\//i, '$1/uploads/');
  }
  const base = apiBaseFromRaw(rawApiUrl);
  return base ? `${base}${p}` : p;
}

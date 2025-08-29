import type { MetadataRoute } from 'next';

const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = API_URL_ENV && API_URL_ENV.length > 0
  ? API_URL_ENV
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

async function getSettings(): Promise<Record<string, string>> {
  try {
    const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
    const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);
    if (!API_URL || DISABLE_BUILD_FETCH) return {};
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 600 }, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return {};
    const settings = await res.json();
    const map: Record<string, string> = {};
    const normalize = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    (settings || []).forEach((s: any) => {
      if (s?.key) {
        const nk = normalize(s.key);
        if (nk && (map[nk] === undefined || map[nk] === '')) map[nk] = s.value;
      }
    });
    return map;
  } catch {
    return {};
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const baseUrl = (settings.site_url && /^https?:\/\//i.test(settings.site_url))
    ? settings.site_url.replace(/\/$/, '')
    : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api', '/api/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

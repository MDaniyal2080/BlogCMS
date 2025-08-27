import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 600 } });
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

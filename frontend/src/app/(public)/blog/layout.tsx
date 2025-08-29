import type { Metadata } from 'next';

const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = API_URL_ENV && API_URL_ENV.length > 0
  ? API_URL_ENV
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

export async function generateMetadata(): Promise<Metadata> {
  try {
    const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
    const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);

    const settings: any[] = await (async () => {
      if (!API_URL || DISABLE_BUILD_FETCH) return [] as any[];
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 }, signal: controller.signal });
        if (!res.ok) return [] as any[];
        return await res.json();
      } catch {
        return [] as any[];
      } finally {
        clearTimeout(t);
      }
    })();
    const map: Record<string, string> = {};
    const normalize = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    (settings || []).forEach((s: any) => {
      if (s?.key) {
        const nk = normalize(s.key);
        if (nk && (map[nk] === undefined || map[nk] === '')) map[nk] = s.value;
      }
    });

    const siteName = map.site_name || 'BlogCMS';
    const title = `Blog — ${siteName}`;
    const description = map.blog_description || map.site_description || `Latest articles from ${siteName}.`;
    return {
      title,
      description,
      alternates: { canonical: '/blog' },
      openGraph: {
        title,
        description,
        type: 'website',
        url: '/blog',
        siteName,
      },
      twitter: {
        title,
        description,
        card: 'summary',
      },
    };
  } catch {
    const title = 'Blog';
    const description = 'Latest articles.';
    return {
      title,
      description,
      alternates: { canonical: '/blog' },
      openGraph: { title, description, type: 'website', url: '/blog' },
      twitter: { title, description, card: 'summary' },
    };
  }
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}


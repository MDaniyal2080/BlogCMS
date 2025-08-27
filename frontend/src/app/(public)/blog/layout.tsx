import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
    const settings = await res.json();
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

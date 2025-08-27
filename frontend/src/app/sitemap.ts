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

async function getAllPosts(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/posts?published=true&withMeta=true&limit=1000`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data?.items) return data.items;
    return [];
  } catch {
    return [];
  }
}

async function getAllCategories(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getAllTags(): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/tags`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const baseUrl = (settings.site_url && /^https?:\/\//i.test(settings.site_url))
    ? settings.site_url.replace(/\/$/, '')
    : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

  const [posts, categories, tags] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
    getAllTags(),
  ]);

  const urls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/blog`, lastModified: new Date() },
  ];

  for (const p of posts) {
    if (!p?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || p.createdAt || Date.now()),
    });
  }

  for (const c of categories) {
    if (!c?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/category/${c.slug}`,
      lastModified: new Date(c.updatedAt || c.createdAt || Date.now()),
    });
  }

  for (const t of tags) {
    if (!t?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/tag/${t.slug}`,
      lastModified: new Date(t.updatedAt || t.createdAt || Date.now()),
    });
  }

  return urls;
}

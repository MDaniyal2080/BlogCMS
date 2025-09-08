import type { MetadataRoute } from 'next';

const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = API_URL_ENV && API_URL_ENV.length > 0
  ? API_URL_ENV
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');
const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);

async function getSettings(): Promise<Record<string, string>> {
  try {
    if (!API_URL || DISABLE_BUILD_FETCH) return {};
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 600 }, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return {};
    const settings = await res.json();
    const map: Record<string, string> = {};
    const normalize = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const isCanonicalKey = (k: string) => {
      const t = String(k).trim();
      return /^[a-z0-9_]+$/.test(t) && normalize(t) === t;
    };
    const quality: Record<string, number> = {};
    (settings || []).forEach((s: any) => {
      if (s?.key) {
        const nk = normalize(s.key);
        if (!nk) return;
        const q = isCanonicalKey(s.key) ? 2 : 1;
        if (map[nk] === undefined || map[nk] === '' || q > (quality[nk] || 0)) {
          map[nk] = s.value;
          quality[nk] = q;
        }
      }
    });
    return map;
  } catch {
    return {};
  }
}

async function getAllPosts(): Promise<any[]> {
  try {
    if (!API_URL || DISABLE_BUILD_FETCH) return [];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/posts?published=true&withMeta=true&limit=1000`, { next: { revalidate: 300 }, signal: controller.signal });
    clearTimeout(t);
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
    if (!API_URL || DISABLE_BUILD_FETCH) return [];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 600 }, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getAllTags(): Promise<any[]> {
  try {
    if (!API_URL || DISABLE_BUILD_FETCH) return [];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/tags`, { next: { revalidate: 600 }, signal: controller.signal });
    clearTimeout(t);
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

  const postsList = Array.isArray(posts) ? posts : [];
  const categoriesList = Array.isArray(categories) ? categories : [];
  const tagsList = Array.isArray(tags) ? tags : [];

  const urls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date().toISOString() },
    { url: `${baseUrl}/blog`, lastModified: new Date().toISOString() },
  ];

  for (const p of postsList) {
    if (!p?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || p.createdAt || Date.now()).toISOString(),
    });
  }

  for (const c of categoriesList) {
    if (!c?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/category/${c.slug}`,
      lastModified: new Date(c.updatedAt || c.createdAt || Date.now()).toISOString(),
    });
  }

  for (const t of tagsList) {
    if (!t?.slug) continue;
    urls.push({
      url: `${baseUrl}/blog/tag/${t.slug}`,
      lastModified: new Date(t.updatedAt || t.createdAt || Date.now()).toISOString(),
    });
  }

  return urls;
}

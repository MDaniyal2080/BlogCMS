import type { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryClient from './CategoryClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
  const API_URL = API_URL_ENV && API_URL_ENV.length > 0
    ? API_URL_ENV
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

  try {
    const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
    const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);

    const categories: Array<{ name: string; slug: string; description?: string | null }> = await (async () => {
      if (!API_URL || DISABLE_BUILD_FETCH) return [] as Array<{ name: string; slug: string; description?: string | null }>;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 60 }, signal: controller.signal });
        if (!res.ok) return [] as Array<{ name: string; slug: string; description?: string | null }>;
        return await res.json();
      } catch {
        return [] as Array<{ name: string; slug: string; description?: string | null }>;
      } finally {
        clearTimeout(t);
      }
    })();
    const cat = categories.find((c) => c.slug === slug);
    if (cat) {
      const title = `${cat.name} — Category`;
      const description = cat.description || `Articles in the ${cat.name} category.`;
      return {
        title,
        description,
        alternates: { canonical: `/blog/category/${slug}` },
        openGraph: {
          title,
          description,
          url: `/blog/category/${slug}`,
        },
        twitter: {
          title,
          description,
          card: 'summary',
        },
      };
    }
  } catch (e) {
    // ignore and fall back
  }

  const fallbackTitle = `Category: ${slug}`;
  const fallbackDesc = `Articles filed under ${slug}.`;
  return {
    title: fallbackTitle,
    description: fallbackDesc,
    alternates: { canonical: `/blog/category/${slug}` },
    openGraph: { title: fallbackTitle, description: fallbackDesc, url: `/blog/category/${slug}` },
    twitter: { title: fallbackTitle, description: fallbackDesc, card: 'summary' },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <CategoryClient slug={slug} />
    </Suspense>
  );
}


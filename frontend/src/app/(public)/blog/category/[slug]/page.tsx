import type { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryClient from './CategoryClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 60 } });
    const categories = (await res.json()) as Array<{ name: string; slug: string; description?: string | null }>;
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

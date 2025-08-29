import type { Metadata } from 'next';

const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = API_URL_ENV && API_URL_ENV.length > 0
  ? API_URL_ENV
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

async function getTags() {
  const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
  const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);
  try {
    if (!API_URL || DISABLE_BUILD_FETCH) return [] as Array<{ name: string; slug: string }>;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/tags`, { next: { revalidate: 300 }, signal: controller.signal });
      if (!res.ok) return [] as Array<{ name: string; slug: string }>;
      const data = await res.json();
      return (Array.isArray(data) ? data : []) as Array<{ name: string; slug: string }>;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return [] as Array<{ name: string; slug: string }>;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getTags();
  const tag = tags.find((t) => t.slug === slug);

  const title = tag ? `Tag: ${tag.name}` : `Tag: ${slug}`;
  const description = tag
    ? `Posts tagged with ${tag.name}.`
    : `Posts tagged with ${slug}.`;

  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/blog/tag/${slug}`,
    },
    twitter: {
      title,
      description,
      card: 'summary',
    },
  };
}

export default async function TagLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug: name } = await params;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Tag: ${name}`,
    description: `Posts tagged with ${name}.`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}

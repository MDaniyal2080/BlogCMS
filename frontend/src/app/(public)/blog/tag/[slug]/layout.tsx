import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getTags() {
  try {
    const res = await fetch(`${API_URL}/tags`, { next: { revalidate: 300 } });
    if (!res.ok) return [] as Array<{ name: string; slug: string }>;
    const data = await res.json();
    return (Array.isArray(data) ? data : []) as Array<{ name: string; slug: string }>;
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

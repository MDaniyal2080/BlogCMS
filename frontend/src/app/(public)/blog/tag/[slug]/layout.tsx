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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tags = await getTags();
  const tag = tags.find((t) => t.slug === params.slug);

  const title = tag ? `Tag: ${tag.name}` : `Tag: ${params.slug}`;
  const description = tag
    ? `Posts tagged with ${tag.name}.`
    : `Posts tagged with ${params.slug}.`;

  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${params.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/blog/tag/${params.slug}`,
    },
    twitter: {
      title,
      description,
      card: 'summary',
    },
  };
}

export default function TagLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const name = params.slug;
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

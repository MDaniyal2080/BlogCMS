import type { Metadata } from 'next';
import { assetUrl } from '@/lib/assetUrl';

const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = API_URL_ENV && API_URL_ENV.length > 0
  ? API_URL_ENV
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

async function getPost(slug: string) {
  const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
  const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);
  try {
    if (!API_URL || DISABLE_BUILD_FETCH) return null;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/posts/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 60 }, signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    const title = 'Post Not Found';
    const description = 'The requested post could not be found.';
    return {
      title,
      description,
      alternates: { canonical: `/blog/${slug}` },
      openGraph: { title, description, url: `/blog/${slug}` },
      twitter: { title, description, card: 'summary' },
    };
  }

  const title = (post.metaTitle || post.title) as string;
  const description = (post.metaDescription || post.excerpt || stripHtml(post.content).slice(0, 160)) as string;
  const keywords = typeof post.metaKeywords === 'string'
    ? post.metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
    : undefined;
  const imageCandidate: string | undefined = post.featuredImage;
  const image = assetUrl(imageCandidate, API_URL) || undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/blog/${post.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  // Build JSON-LD for the post
  const { slug } = await params;
  const post = await getPost(slug);
  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription || post.excerpt || stripHtml(post.content).slice(0, 220),
        image: post.featuredImage ? assetUrl(post.featuredImage, API_URL) : undefined,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt || post.publishedAt || post.createdAt,
        author: post.author?.name ? { '@type': 'Person', name: post.author.name } : undefined,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `/blog/${post.slug}` },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}

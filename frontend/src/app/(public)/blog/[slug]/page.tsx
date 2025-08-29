import SinglePostClient from './SinglePostClient';
import { notFound } from 'next/navigation';

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
      if (res.status === 404) return notFound();
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  } catch {
    // Fail soft and let the client fetch
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initialPost = await getPost(slug);
  return <SinglePostClient slug={slug} initialPost={initialPost || undefined} />;
}

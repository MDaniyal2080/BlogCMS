import SinglePostClient from './SinglePostClient';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/posts/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (res.status === 404) return notFound();
    if (!res.ok) throw new Error(`Failed to load post: ${res.status}`);
    return await res.json();
  } catch {
    // Surface to the global error boundary
    throw new Error('Failed to load post');
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initialPost = await getPost(slug);
  return <SinglePostClient slug={slug} initialPost={initialPost || undefined} />;
}

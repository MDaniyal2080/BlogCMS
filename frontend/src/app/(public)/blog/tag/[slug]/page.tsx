'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { postsAPI, tagsAPI } from '@/lib/api';
import type { Post, Tag } from '@/types';
import BlogCard from '@/components/public/BlogCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TagPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!slug) return;
    const run = async () => {
      try {
        setLoading(true);
        const [postsRes, tagsData] = await Promise.all([
          postsAPI.getByTag(slug),
          tagsAPI.getAll().then(r => r.data).catch(() => [] as Tag[]),
        ]);
        setPosts((postsRes.data as Post[]) || []);
        setTags(tagsData || []);
      } catch (error) {
        console.error('Error loading tag posts', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [slug]);

  const tagName = useMemo(() => {
    const found = tags.find((t) => t.slug === slug);
    if (found) return found.name;
    const fromPosts = posts.flatMap((p) => p.tags || []).find((t) => t.slug === slug)?.name;
    return fromPosts || slug;
  }, [tags, posts, slug]);

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/blog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
        </Button>
      </Link>

      <h1 className="text-4xl font-bold mb-2">Tag: {tagName}</h1>
      <p className="text-muted-foreground mb-8">
        {loading
          ? 'Loading posts…'
          : posts.length
          ? `${posts.length} post${posts.length > 1 ? 's' : ''}`
          : 'No posts found with this tag.'}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : posts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded">
          <h3 className="text-xl font-semibold mb-2">No posts found</h3>
          <p className="text-muted-foreground mb-4">Try browsing all posts.</p>
          <Link href="/blog">
            <Button variant="outline">Browse All Posts</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

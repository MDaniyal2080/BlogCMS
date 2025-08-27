"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { tagsAPI } from '@/lib/api';
import type { Tag } from '@/types';

interface Props {
  limit?: number; // limit tags shown; 0 or undefined shows all
  useBlogQueryLinks?: boolean; // when true, link to /blog?tag=... preserving other filters
  categorySlugForQuery?: string; // when set, link to /blog/category/[slug]?tag=... preserving other filters
}

export default function TagsWidget({ limit, useBlogQueryLinks = false, categorySlugForQuery }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      try {
        const res = await tagsAPI.getAll();
        setTags((res.data as Tag[]) || []);
      } catch (e) {
        console.error('Failed to load tags', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const items = useMemo(() => {
    const arr = tags.slice().sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
    return typeof limit === 'number' && limit > 0 ? arr.slice(0, limit) : arr;
  }, [tags, limit]);

  // Compute size classes based on postCount quantiles
  const counts = items.map((t) => t.postCount || 0);
  const max = Math.max(1, ...counts);

  const sizeFor = (count?: number) => {
    const c = count || 0;
    const ratio = c / max; // 0..1
    if (ratio > 0.8) return 'text-base px-3 py-1';
    if (ratio > 0.6) return 'text-sm px-2.5 py-1';
    if (ratio > 0.3) return 'text-xs px-2 py-0.5';
    return 'text-[11px] px-2 py-0.5';
  };

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: Math.min(10, limit || 10) }).map((_, i) => (
          <div key={i} className="h-6 w-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No tags yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((tag) => (
        <Link
          key={tag.id}
          href={(() => {
            if (categorySlugForQuery) {
              const params = new URLSearchParams(searchParams?.toString());
              params.set('tag', tag.slug);
              params.delete('page');
              params.delete('category');
              const query = params.toString();
              return `/blog/category/${categorySlugForQuery}${query ? `?${query}` : ''}`;
            }
            if (useBlogQueryLinks) {
              const params = new URLSearchParams(searchParams?.toString());
              params.set('tag', tag.slug);
              params.delete('page');
              return `/blog?${params.toString()}`;
            }
            return `/blog/tag/${tag.slug}`;
          })()}
          className={`rounded border hover:bg-accent hover:text-accent-foreground transition ${sizeFor(tag.postCount)}`}
        >
          #{tag.name}
          {typeof tag.postCount === 'number' && (
            <span className="ml-1 text-muted-foreground">({tag.postCount})</span>
          )}
        </Link>
      ))}
    </div>
  );
}

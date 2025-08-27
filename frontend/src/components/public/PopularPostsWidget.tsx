"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { postsAPI } from '@/lib/api';
import type { Post } from '@/types';

interface Props {
  limit?: number;
}

export default function PopularPostsWidget({ limit = 5 }: Props) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await postsAPI.getAll({
          limit,
          published: true,
          sortBy: 'viewCount',
          sortOrder: 'desc',
        });
        setItems((res.data as Post[]) || []);
      } catch (e) {
        console.error('Failed to load popular posts', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <div key={i} className="h-6 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No popular posts yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li key={p.id} className="group">
          <Link href={`/blog/${p.slug}`} className="block">
            <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">
              {p.title}
            </div>
            <div className="text-xs text-muted-foreground">{p.viewCount || 0} views</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

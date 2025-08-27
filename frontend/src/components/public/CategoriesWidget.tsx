"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { categoriesAPI } from '@/lib/api';
import type { Category } from '@/types';

interface Props {
  limit?: number;
  useBlogQueryLinks?: boolean; // when true, link to /blog?category=... preserving other filters
}

export default function CategoriesWidget({ limit = 10, useBlogQueryLinks = false }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      try {
        const res = await categoriesAPI.getAll();
        const items = (res.data as Category[]) || [];
        setCategories(items);
      } catch (e) {
        console.error('Failed to load categories', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return <p className="text-sm text-muted-foreground">No categories yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {categories.slice(0, limit).map((cat) => (
        <Link
          key={cat.id}
          href={(() => {
            if (!useBlogQueryLinks) return `/blog/category/${cat.slug}`;
            const params = new URLSearchParams(searchParams?.toString());
            params.set('category', cat.slug);
            params.delete('page'); // reset pagination
            return `/blog?${params.toString()}`;
          })()}
          className="flex items-center justify-between px-3 py-2 rounded border hover:bg-accent hover:text-accent-foreground transition"
        >
          <span className="truncate">{cat.name}</span>
          {typeof cat.postCount === 'number' && (
            <span className="ml-2 text-xs text-muted-foreground">{cat.postCount}</span>
          )}
        </Link>
      ))}
    </div>
  );
}


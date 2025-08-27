'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BlogCard from '@/components/public/BlogCard';
import { postsAPI } from '@/lib/api';
import { Post } from '@/types';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/public/SettingsContext';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { X as XIcon } from 'lucide-react';

// Code-split non-critical widgets and search
const SearchBar = dynamic(() => import('@/components/public/SearchBar'), {
  ssr: false,
  loading: () => <div className="h-10 w-full max-w-md bg-muted rounded" />,
});

const CategoriesWidget = dynamic(() => import('@/components/public/CategoriesWidget'), {
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded" />
      ))}
    </div>
  ),
});

const PopularPostsWidget = dynamic(() => import('@/components/public/PopularPostsWidget'), {
  loading: () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-6 bg-muted rounded" />
      ))}
    </div>
  ),
});

const TagsWidget = dynamic(() => import('@/components/public/TagsWidget'), {
  loading: () => (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="h-6 w-16 bg-muted rounded" />
      ))}
    </div>
  ),
});

export default function BlogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(9);
  const { settings } = useSettings();
  const perPage = Math.max(1, parseInt(settings.posts_per_page || '9', 10) || 9);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || '').trim();
  const tag = (searchParams.get('tag') || '').trim();
  const dateFrom = (searchParams.get('dateFrom') || '').trim();
  const dateTo = (searchParams.get('dateTo') || '').trim();

  const invalidDateRange = useMemo(() => {
    return Boolean(dateFrom && dateTo && dateFrom > dateTo);
  }, [dateFrom, dateTo]);

  const formatDateLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const setDateRange = (from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (from) params.set('dateFrom', from); else params.delete('dateFrom');
    if (to) params.set('dateTo', to); else params.delete('dateTo');
    params.delete('page');
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ''}`);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, q, category, tag, dateFrom, dateTo]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: perPage,
        published: true,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        withMeta: true,
      };
      if (q) params.q = q;
      if (category) params.categorySlug = category;
      if (tag) params.tagSlug = tag;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await postsAPI.getAll(params);
      const data = response.data as { items: Post[]; total: number; page: number; limit: number } | Post[];
      if (Array.isArray(data)) {
        setPosts(data);
        setTotal(data.length);
        setLimit(perPage);
      } else {
        setPosts(data.items);
        setTotal(data.total);
        setLimit(data.limit);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / (limit || perPage)) || 1), [total, limit, perPage]);

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value && value.length) params.set(key, value);
    else params.delete(key);
    params.delete('page'); // reset pagination when filters change
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ''}`);
  };

  const setPageParam = (p: number) => {
    const newPage = Math.max(1, Math.min(totalPages, p));
    const params = new URLSearchParams(searchParams?.toString());
    if (newPage <= 1) params.delete('page');
    else params.set('page', String(newPage));
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ''}`);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('q');
    params.delete('category');
    params.delete('tag');
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('page');
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ''}`);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Optional quick search */}
          <div className="max-w-md mb-8">
            <SearchBar target="blog" />
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => updateParam('dateFrom', e.target.value || undefined)}
                placeholder="From"
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => updateParam('dateTo', e.target.value || undefined)}
                placeholder="To"
                className="w-40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date();
                  const from = new Date();
                  from.setDate(to.getDate() - 7);
                  setDateRange(formatDateLocal(from), formatDateLocal(to));
                }}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date();
                  const from = new Date();
                  from.setDate(to.getDate() - 30);
                  setDateRange(formatDateLocal(from), formatDateLocal(to));
                }}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const to = new Date();
                  const from = new Date(to.getFullYear(), 0, 1);
                  setDateRange(formatDateLocal(from), formatDateLocal(to));
                }}
              >
                This year
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined, undefined)}>
                All time
              </Button>
            </div>
            {invalidDateRange && (
              <p className="text-sm text-destructive">“From” date must be earlier than “To” date.</p>
            )}
          </div>

          {/* Active filters */}
          {(q || category || tag || dateFrom || dateTo) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {q && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                  <span>Search: "{q}"</span>
                  <button
                    type="button"
                    aria-label="Clear search filter"
                    className="hover:text-destructive"
                    onClick={() => updateParam('q')}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                  <span>
                    Date: {dateFrom || 'Any'} 
                    <span className="mx-1">to</span> 
                    {dateTo || 'Now'}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear date filter"
                    className="hover:text-destructive"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams?.toString());
                      params.delete('dateFrom');
                      params.delete('dateTo');
                      params.delete('page');
                      const query = params.toString();
                      router.push(`/blog${query ? `?${query}` : ''}`);
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                  <span>Category: {category}</span>
                  <button
                    type="button"
                    aria-label="Clear category filter"
                    className="hover:text-destructive"
                    onClick={() => updateParam('category')}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
              {tag && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                  <span>Tag: {tag}</span>
                  <button
                    type="button"
                    aria-label="Clear tag filter"
                    className="hover:text-destructive"
                    onClick={() => updateParam('tag')}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          )}

          {loading && page === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: perPage }).map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : posts.length ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} highlight={q} />
                ))}
              </div>

              {/* Numbered pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="inline-flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPageParam(page - 1)}>
                      Prev
                    </Button>
                    {Array.from({ length: Math.min(7, totalPages) }).map((_, idx) => {
                      // Build a compact pagination around the current page
                      let start = Math.max(1, page - 3);
                      let end = Math.min(totalPages, start + 6);
                      start = Math.max(1, end - 6);
                      const p = start + idx;
                      if (p > end) return null;
                      const active = p === page;
                      return (
                        <Button
                          key={p}
                          variant={active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPageParam(p)}
                          disabled={active || loading}
                        >
                          {p}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPageParam(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 border rounded">
              <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or search.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {(dateFrom || dateTo) && (
                  <Button variant="outline" size="sm" onClick={() => setDateRange(undefined, undefined)}>
                    Remove date filter
                  </Button>
                )}
                {q && (
                  <Button variant="outline" size="sm" onClick={() => updateParam('q')}>
                    Clear search
                  </Button>
                )}
                {category && (
                  <Button variant="outline" size="sm" onClick={() => updateParam('category')}>
                    Clear category
                  </Button>
                )}
                {tag && (
                  <Button variant="outline" size="sm" onClick={() => updateParam('tag')}>
                    Clear tag
                  </Button>
                )}
                {category ? (
                  <Link href={`/blog?category=${encodeURIComponent(category)}`}>
                    <Button variant="secondary" size="sm">Browse all in {category}</Button>
                  </Link>
                ) : null}
                <Link href="/blog">
                  <Button variant="ghost" size="sm">Browse all posts</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-10">
          <section>
            <h3 className="text-lg font-semibold mb-3">Categories</h3>
            <CategoriesWidget limit={12} useBlogQueryLinks />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Popular Posts</h3>
            <PopularPostsWidget limit={5} />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Tags</h3>
            <TagsWidget useBlogQueryLinks />
          </section>
        </aside>
      </div>
    </div>
  );
}




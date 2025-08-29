'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { postsAPI, categoriesAPI } from '@/lib/api';
import type { Post, Category } from '@/types';
import BlogCard from '@/components/public/BlogCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, X as XIcon, Search as SearchIcon } from 'lucide-react';
import { useSettings } from '@/components/public/SettingsContext';
import CategoriesWidget from '@/components/public/CategoriesWidget';
import PopularPostsWidget from '@/components/public/PopularPostsWidget';
import TagsWidget from '@/components/public/TagsWidget';

type PostsQuery = {
  page?: number;
  limit?: number;
  published?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  withMeta?: boolean;
  categorySlug?: string;
  tagSlug?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

interface Props {
  slug: string;
}

export default function CategoryClient({ slug }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(9);
  const [categories, setCategories] = useState<Category[]>([]);

  const { settings } = useSettings();
  const perPage = Math.max(1, parseInt(settings.posts_per_page || '9', 10) || 9);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const q = (searchParams.get('q') || '').trim();
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
    router.push(`/blog/category/${slug}${query ? `?${query}` : ''}`);
  };

  const [searchTerm, setSearchTerm] = useState<string>(q);
  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  useEffect(() => {
    // Load categories (for header info like description/postCount)
    const run = async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories((res.data as Category[]) || []);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const params: PostsQuery = {
          page,
          limit: perPage,
          published: true,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
          withMeta: true,
          categorySlug: slug,
        };
        if (q) params.q = q;
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

    fetchPosts();
  }, [page, perPage, q, tag, dateFrom, dateTo, slug]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / (limit || perPage)) || 1), [total, limit, perPage]);

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value && value.length) params.set(key, value);
    else params.delete(key);
    params.delete('page'); // reset pagination when filters change
    const query = params.toString();
    router.push(`/blog/category/${slug}${query ? `?${query}` : ''}`);
  };

  const setPageParam = (p: number) => {
    const newPage = Math.max(1, Math.min(totalPages, p));
    const params = new URLSearchParams(searchParams?.toString());
    if (newPage <= 1) params.delete('page');
    else params.set('page', String(newPage));
    const query = params.toString();
    router.push(`/blog/category/${slug}${query ? `?${query}` : ''}`);
  };

  const clearAllFilters = () => {
    router.push(`/blog/category/${slug}`);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = (searchTerm || '').trim();
    updateParam('q', value || undefined);
  };

  const category = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
  const categoryName = category?.name || slug;
  const categoryDescription = category?.description || '';
  const categoryPostCount = typeof category?.postCount === 'number' ? category!.postCount! : undefined;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-12">
      <Link href="/blog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
        </Button>
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{categoryName}</h1>
        {categoryDescription && (
          <p className="text-muted-foreground mb-2">{categoryDescription}</p>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground">
          {loading
            ? 'Loading posts…'
            : categoryPostCount !== undefined
              ? `Showing ${total} of ${categoryPostCount} post${categoryPostCount === 1 ? '' : 's'}`
              : `${total} post${total === 1 ? '' : 's'} found`}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Search within this category */}
          <div className="max-w-md mb-6">
            <form onSubmit={onSearchSubmit} className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search in this category..."
                className="pr-10"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3"
              >
                <SearchIcon className="h-4 w-4" />
              </Button>
            </form>
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
          {(q || tag || dateFrom || dateTo) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {q && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                  <span>Search: &quot;{q}&quot;</span>
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
                    Date: {dateFrom || 'Any'} <span className="mx-1">to</span> {dateTo || 'Now'}
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
                      router.push(`/blog/category/${slug}${query ? `?${query}` : ''}`);
                    }}
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
                      const end = Math.min(totalPages, start + 6);
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
            <div className="text-center py-6 sm:py-12 border rounded">
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
                {tag && (
                  <Button variant="outline" size="sm" onClick={() => updateParam('tag')}>
                    Clear tag
                  </Button>
                )}
                <Link href={`/blog/category/${slug}`}>
                  <Button variant="secondary" size="sm">Browse all in {categoryName}</Button>
                </Link>
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
            <CategoriesWidget limit={12} />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Popular Posts</h3>
            <PopularPostsWidget limit={5} />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Tags</h3>
            <TagsWidget categorySlugForQuery={slug} />
          </section>
        </aside>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { postsAPI, categoriesAPI } from '@/lib/api';
import type { Post, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Edit, Trash2, Eye, Plus, ArrowUpDown, ChevronLeft, ChevronRight, Copy, Archive, ArchiveRestore } from 'lucide-react';

export default function PostsManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  // Query params / controls
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'viewCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(''); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>('');
  const [q, setQ] = useState('');

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | ''>('');

  // Quick edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    // initial categories
    (async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(res.data || []);
      } catch (e) {
        console.error('Error loading categories', e);
      }
    })();
  }, []);

  // Debounced fetch when filters/search/sort/page change
  useEffect(() => {
    const t = setTimeout(() => {
      fetchPosts();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder, statusFilter, categoryFilter, dateFrom, dateTo, q]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder,
        withMeta: 1,
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (dateFrom) params.dateFrom = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
      if (dateTo) params.dateTo = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
      if (q.trim()) params.q = q.trim();

      const response = await postsAPI.getAll(params);
      const data = response.data;
      if (Array.isArray(data)) {
        setPosts(data);
        setTotal(data.length);
      } else {
        setPosts(data.items || []);
        setTotal(data.total || 0);
      }
      // Clear selection when data changes
      setSelected(new Set());
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit]);

  const toggleSort = (field: 'createdAt' | 'title' | 'viewCount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const toggleSelectAll = (checked: boolean) => {
    const next = new Set<string>(selected);
    if (checked) posts.forEach((p) => next.add(p.id));
    else posts.forEach((p) => next.delete(p.id));
    setSelected(next);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    const next = new Set<string>(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const allSelected = posts.length > 0 && posts.every((p) => selected.has(p.id));

  const handleBulkApplyStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    try {
      await postsAPI.bulkStatus(Array.from(selected), bulkStatus, bulkStatus === 'PUBLISHED' ? new Date().toISOString() : undefined);
      await fetchPosts();
      setBulkStatus('');
    } catch (e) {
      console.error('Bulk status error', e);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} post(s)? This cannot be undone.`)) return;
    try {
      await postsAPI.bulkDelete(Array.from(selected));
      await fetchPosts();
    } catch (e) {
      console.error('Bulk delete error', e);
    }
  };

  const startInlineEdit = (p: Post) => {
    setEditingId(p.id);
    setEditTitle(p.title);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveInlineEdit = async (id: string) => {
    try {
      const title = editTitle.trim();
      if (!title) return;
      await postsAPI.update(id, { title });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
    } catch (e) {
      console.error('Quick edit save error', e);
    } finally {
      cancelInlineEdit();
    }
  };

  const handleRowStatusChange = async (id: string, next: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    try {
      await postsAPI.update(id, { status: next, publishedAt: next === 'PUBLISHED' ? new Date().toISOString() : undefined });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: next, published: next === 'PUBLISHED', publishedAt: next === 'PUBLISHED' ? new Date().toISOString() : next === 'DRAFT' ? null : p.publishedAt } : p)));
    } catch (e) {
      console.error('Row status change error', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await postsAPI.delete(id);
        setPosts(posts.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await postsAPI.duplicate(id);
      await fetchPosts();
    } catch (e) {
      console.error('Error duplicating post:', e);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await postsAPI.update(id, { status: 'ARCHIVED' });
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'ARCHIVED', published: false } : p)));
    } catch (e) {
      console.error('Error archiving post:', e);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await postsAPI.update(id, { status: 'PUBLISHED' });
      const nowIso = new Date().toISOString();
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'PUBLISHED', published: true, publishedAt: nowIso } : p)));
    } catch (e) {
      console.error('Error restoring post:', e);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <Link href="/admin/posts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Search by title/content..."
              aria-label="Search posts"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="border rounded px-2 py-2 text-sm"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="border rounded px-2 py-2 text-sm min-w-[160px]"
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground">From</label>
            <input type="date" className="border rounded px-2 py-1" aria-label="From date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground">To</label>
            <input type="date" className="border rounded px-2 py-1" aria-label="To date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto">
            <label className="text-muted-foreground">Per page</label>
            <select className="border rounded px-2 py-1" aria-label="Items per page" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card className="p-3 mb-3 flex items-center gap-3" aria-live="polite">
          <span className="text-sm">Selected: {selected.size}</span>
          <select className="border rounded px-2 py-1 text-sm" aria-label="Bulk change status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as any)}>
            <option value="">Change status...</option>
            <option value="DRAFT">Mark as Draft</option>
            <option value="PUBLISHED">Mark as Published</option>
            <option value="ARCHIVED">Mark as Archived</option>
          </select>
          <Button size="sm" onClick={handleBulkApplyStatus} disabled={!bulkStatus}>Apply</Button>
          <div className="ml-auto" />
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
        </Card>
      )}

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm" aria-describedby="postsTableCaption">
              <caption id="postsTableCaption" className="sr-only">
                Posts management table. Use column headers to sort by Title, Created date, or Views.
              </caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 w-10" scope="col">
                    <input type="checkbox" aria-label="Select all posts" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} />
                  </th>
                  <th className="p-3" scope="col" aria-sort={sortBy === 'title' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort('title')}
                      aria-label={`Sort by title, ${sortBy === 'title' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'no sort applied'}`}
                    >
                      Title <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="p-3" scope="col">Author</th>
                  <th className="p-3" scope="col">Status</th>
                  <th className="p-3" scope="col" aria-sort={sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort('createdAt')}
                      aria-label={`Sort by created date, ${sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'no sort applied'}`}
                    >
                      Created <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="p-3" scope="col">Published</th>
                  <th className="p-3" scope="col" aria-sort={sortBy === 'viewCount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort('viewCount')}
                      aria-label={`Sort by views, ${sortBy === 'viewCount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'no sort applied'}`}
                    >
                      Views <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="p-3 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t" aria-selected={selected.has(post.id)}>
                    <td className="p-3"><input type="checkbox" aria-label={`Select post ${post.title}`} checked={selected.has(post.id)} onChange={(e) => toggleSelectOne(post.id, e.target.checked)} /></td>
                    <th scope="row" className="p-3 max-w-[420px] font-medium text-foreground">
                      {editingId === post.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8" />
                          <Button size="sm" onClick={() => saveInlineEdit(post.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={cancelInlineEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{post.title}</span>
                          <button className="text-muted-foreground hover:text-foreground" onClick={() => startInlineEdit(post)} title="Quick edit title" aria-label="Quick edit title">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{post.excerpt || 'No excerpt'}</div>
                    </th>
                    <td className="p-3 whitespace-nowrap">{post.author?.name || 'Unknown'}</td>
                    <td className="p-3">
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        aria-label={`Change status for ${post.title}`}
                        value={post.status || (post.published ? 'PUBLISHED' : 'DRAFT')}
                        onChange={(e) => handleRowStatusChange(post.id, e.target.value as any)}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatDate(post.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">{post.publishedAt ? formatDate(post.publishedAt) : '-'}</td>
                    <td className="p-3 whitespace-nowrap">{post.viewCount ?? 0}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {post.status === 'PUBLISHED' && post.publishedAt && new Date(post.publishedAt) <= new Date() && (
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Button variant="ghost" size="sm" title="View post" aria-label={`View post ${post.title}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/admin/posts/${post.id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label={`Edit post ${post.title}`}><Edit className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(post.id)} title="Duplicate post" aria-label={`Duplicate post ${post.title}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {post.status === 'ARCHIVED' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleRestore(post.id)} title="Publish post" aria-label={`Publish post ${post.title}`}>
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(post.id)} title="Archive post" aria-label={`Archive post ${post.title}`}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} aria-label={`Delete post ${post.title}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && !loading && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={8}>No posts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Page {page} of {totalPages} · Total {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1} aria-label="Go to first page">First</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Go to previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Go to next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Go to last page">Last</Button>
        </div>
      </div>
    </div>
  );
}

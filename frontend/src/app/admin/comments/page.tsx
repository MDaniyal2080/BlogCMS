'use client';

import { useEffect, useMemo, useState } from 'react';
import { commentsAPI } from '@/lib/api';
import type { Comment } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, XCircle, RefreshCcw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCommentsPage() {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters / pagination
  const [postId, setPostId] = useState('');
  const [approved, setApproved] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchComments();
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, approved, page, limit]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset };
      if (postId.trim()) params.postId = postId.trim();
      if (approved !== 'all') params.approved = approved === 'approved';
      const res = await commentsAPI.adminList(params);
      setItems(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchComments();
  };

  const toggleApproval = async (c: Comment) => {
    try {
      await commentsAPI.setApproval(c.id, !c.approved);
      setItems((prev) => prev.map((it) => (it.id === c.id ? { ...it, approved: !c.approved } : it)));
    } catch (e) {
      console.error('Failed to set approval', e);
    }
  };

  const remove = async (c: Comment) => {
    if (!confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await commentsAPI.remove(c.id);
      setItems((prev) => prev.filter((it) => it.id !== c.id));
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  const canPrev = page > 1;
  const canNext = items.length >= limit; // naive forward pagination

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Comments</h1>
        <Button variant="outline" size="sm" onClick={refresh} title="Refresh">
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px]">
            <Input
              placeholder="Filter by Post ID"
              value={postId}
              onChange={(e) => { setPostId(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="border rounded px-2 py-2 text-sm"
            value={approved}
            onChange={(e) => { setApproved(e.target.value as any); setPage(1); }}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="unapproved">Unapproved</option>
          </select>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="text-muted-foreground">Per page</label>
            <select className="border rounded px-2 py-1" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Author</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Content</th>
                  <th className="p-3">Post ID</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{c.authorName || 'Anonymous'}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{c.authorEmail || '-'}</td>
                    <td className="p-3 max-w-[520px]">
                      <div className="truncate" title={c.content}>{c.content}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{c.postId}</td>
                    <td className="p-3 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {c.approved ? (
                        <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" /> Yes</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600"><XCircle className="h-4 w-4" /> No</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleApproval(c)}>
                          {c.approved ? 'Unapprove' : 'Approve'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(c)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>No comments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Page {page}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={!canPrev}>First</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={!canPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!canNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

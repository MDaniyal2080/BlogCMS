'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { postsAPI, categoriesAPI, tagsAPI, uploadAPI } from '@/lib/api';
import { Category, Tag, Post } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PostEditor = dynamic(() => import('@/components/admin/PostEditor'), { ssr: false });

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Content fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  // Leave markdown undefined initially to avoid overwriting an existing value when unknown
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);
  const [featuredImage, setFeaturedImage] = useState('');

  // Taxonomy
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);

  // Extra settings
  const [featured, setFeatured] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');

  // Publishing
  const [published, setPublished] = useState(false);
  const [originalPublished, setOriginalPublished] = useState<boolean | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[] | null>(null);

  const featuredFileInputRef = useRef<HTMLInputElement>(null);
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [catRes, tagRes, postRes] = await Promise.all([
          categoriesAPI.getAll(),
          tagsAPI.getAll(),
          postsAPI.getById(id),
        ]);
        setCategories(catRes.data);
        setTags(tagRes.data);
        const p: Post = postRes.data;
        setTitle(p.title || '');
        setExcerpt(p.excerpt || '');
        setContent(p.content || '');
        setFeaturedImage(p.featuredImage || '');
        const catIds = (p.categories || []).map((c) => c.id);
        setSelectedCategories(catIds);
        setOriginalCategoryIds(catIds);
        setSelectedTags((p.tags || []).map((t) => t.id));
        setFeatured(!!p.featured);
        setSlug(p.slug || '');
        setOriginalSlug(p.slug || '');
        setMetaTitle(p.metaTitle || '');
        setMetaDescription(p.metaDescription || '');
        setMetaKeywords(p.metaKeywords || '');
        setPublished(!!p.published);
        setOriginalPublished(!!p.published);
        // Convert ISO to datetime-local
        const toDatetimeLocal = (iso: string) => {
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return '';
          const tzOffset = d.getTimezoneOffset() * 60000;
          const local = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
          return local;
        };
        setScheduledAt(p.publishedAt ? toDatetimeLocal(p.publishedAt) : '');
      } catch (err) {
        console.error('Failed to load post for editing', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  // Tag suggestions (debounced search)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = tagQuery.trim();
      if (q.length === 0) {
        setTagSuggestions([]);
        return;
      }
      try {
        const res = await tagsAPI.getAll({ q });
        const list: Tag[] = res.data || [];
        setTagSuggestions(list.filter((t) => !selectedTags.includes(t.id)));
      } catch (err) {
        console.error('Tag search failed', err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [tagQuery, selectedTags]);

  const buildPayload = useCallback((asDraft = false) => {
    const payload: any = {
      title,
      excerpt,
      content,
      featuredImage,
      tagIds: selectedTags,
      featured,
      metaTitle,
      metaDescription,
      metaKeywords,
    };
    if (typeof markdown !== 'undefined') payload.markdown = markdown;

    // Only send categoryIds if changed from original
    const catsNow = selectedCategories;
    if (originalCategoryIds) {
      const a = [...originalCategoryIds].sort();
      const b = [...catsNow].sort();
      const equal = a.length === b.length && a.every((v, i) => v === b[i]);
      if (!equal) payload.categoryIds = catsNow;
    } else {
      payload.categoryIds = catsNow;
    }

    // Only send slug if user edited it and it differs from original
    const trimmedSlug = (slug || '').trim();
    if (slugEdited && trimmedSlug && trimmedSlug !== originalSlug) {
      payload.slug = trimmedSlug;
    }

    if (asDraft) {
      payload.published = false;
    } else if (originalPublished === null || published !== originalPublished) {
      payload.published = published;
    }

    if (!asDraft && published && scheduledAt) {
      payload.publishedAt = scheduledAt;
    }

    return payload;
  }, [title, excerpt, content, featuredImage, selectedTags, featured, metaTitle, metaDescription, metaKeywords, markdown, selectedCategories, originalCategoryIds, slugEdited, slug, originalSlug, published, originalPublished, scheduledAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSaving(true);
      const payload = buildPayload(false);
      await postsAPI.update(id as string, payload);
      router.push('/admin/posts');
    } catch (err) {
      console.error('Error updating post:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const payload = buildPayload(true);
      await postsAPI.update(id as string, payload);
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Edit Post</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Post Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Excerpt</label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={excerpt.length > 160 ? 'text-destructive' : 'text-muted-foreground'}>
                      {excerpt.length} / 160 recommended
                    </span>
                    {excerpt.length > 160 && (
                      <span className="text-destructive">Over ideal meta description length</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <PostEditor content={content} onChange={setContent} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Markdown (optional)</label>
                  <textarea
                    value={markdown ?? ''}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="Write markdown here"
                    className="w-full min-h-[160px] px-3 py-2 border rounded-md"
                  />
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Preview</div>
                    <div className="prose prose-sm max-w-none border rounded-md p-3 dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ''}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto lg:pr-1">
            <Card>
              <CardHeader>
                <CardTitle>Post Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cover Image URL</label>
                  <Input
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => featuredFileInputRef.current?.click()}>
                      Upload Cover
                    </Button>
                    <input
                      ref={featuredFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const res = await uploadAPI.uploadCover(file);
                          const url: string = (res as any).data?.url || '';
                          const fullUrl = url.startsWith('http') ? url : `${apiOrigin}${url}`;
                          setFeaturedImage(fullUrl);
                        } catch (err) {
                          console.error('Cover image upload failed', err);
                        } finally {
                          if (featuredFileInputRef.current) featuredFileInputRef.current.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                    Featured post
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categories</label>
                  <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-2">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={cat.id}
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedCategories((prev) =>
                              checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                            );
                          }}
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedTags.map((tid) => {
                        const t = tags.find((x) => x.id === tid) || tagSuggestions.find((x) => x.id === tid);
                        const label = t?.name || 'Tag';
                        return (
                          <Badge key={tid} variant="secondary" className="flex items-center gap-1">
                            {label}
                            <button
                              type="button"
                              className="ml-1 text-xs opacity-70 hover:opacity-100"
                              onClick={() => setSelectedTags((prev) => prev.filter((x) => x !== tid))}
                              aria-label={`Remove ${label}`}
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <Input value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="Search tags…" />
                  {tagQuery.trim() && (
                    <div className="mt-2 border rounded-md max-h-40 overflow-auto">
                      {tagSuggestions.length > 0 ? (
                        tagSuggestions.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted"
                            onClick={() => {
                              setSelectedTags((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
                              setTagQuery('');
                              setTagSuggestions([]);
                            }}
                          >
                            {t.name}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground flex justify-between items-center">
                          <span>No matches.</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const name = tagQuery.trim();
                              if (!name) return;
                              try {
                                const res = await tagsAPI.create({ name });
                                const created: Tag = res.data;
                                setTags((prev) => [created, ...prev]);
                                setSelectedTags((prev) => [...prev, created.id]);
                                setTagQuery('');
                                setTagSuggestions([]);
                              } catch (err) {
                                console.error('Create tag failed', err);
                              }
                            }}
                          >
                            Create "{tagQuery.trim()}"
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Slug (optional)</label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    placeholder="custom-slug"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SEO Meta Title</label>
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Meta title" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SEO Meta Description</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Meta description"
                    className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                  />
                  <div className="mt-1 text-xs text-muted-foreground">{metaDescription.length} / 160 recommended</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SEO Meta Keywords (comma-separated)</label>
                  <Input value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} placeholder="keyword1, keyword2" />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                    Publish
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Publish at (optional)</label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    If set and "Publish" is enabled, the post will go live at that time.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 lg:sticky lg:bottom-0 lg:bg-background lg:py-2 lg:border-t">
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Saving…' : 'Update Post'}
              </Button>
              <Button type="button" variant="secondary" onClick={saveDraft} disabled={saving}>
                {saving ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/posts')}>
                Cancel
              </Button>
            </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

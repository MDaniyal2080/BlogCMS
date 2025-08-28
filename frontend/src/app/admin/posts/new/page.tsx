'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { postsAPI, categoriesAPI, tagsAPI, uploadAPI } from '@/lib/api';
import { Category, Tag } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '@/components/public/MarkdownComponents';

const PostEditor = dynamic(() => import('@/components/admin/PostEditor'), {
  ssr: false,
});

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [featured, setFeatured] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [published, setPublished] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const lastSnapshotRef = useRef<string>('');
  const featuredFileInputRef = useRef<HTMLInputElement>(null);
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

  useEffect(() => {
    fetchCategoriesAndTags();
  }, []);

  // Local slugify helper (mirrors backend)
  const slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

  // Auto-generate slug from title until user edits slug manually
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  const fetchCategoriesAndTags = async () => {
    try {
      const [catResponse, tagResponse] = await Promise.all([
        categoriesAPI.getAll(),
        tagsAPI.getAll(),
      ]);
      setCategories(catResponse.data);
      setTags(tagResponse.data);
    } catch (error) {
      console.error('Error fetching categories and tags:', error);
    }
  };

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
        // exclude already selected
        setTagSuggestions(list.filter((t) => !selectedTags.includes(t.id)));
      } catch (err) {
        console.error('Tag search failed', err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [tagQuery, selectedTags]);

  const buildPayload = (asDraft = false) => ({
    title,
    excerpt,
    content,
    markdown,
    featuredImage,
    slug: slug || undefined,
    featured,
    metaTitle: metaTitle || undefined,
    metaDescription: metaDescription || undefined,
    metaKeywords: metaKeywords || undefined,
    categoryIds: selectedCategories,
    tagIds: selectedTags,
    published: asDraft ? false : published,
    publishedAt: !asDraft && published && scheduledAt ? scheduledAt : undefined,
  });

  const saveDraft = async () => {
    if (!title) return; // avoid creating empty untitled drafts
    try {
      setSaving(true);
      if (!postId) {
        const res = await postsAPI.create(buildPayload(true));
        setPostId(res.data.id);
      } else {
        await postsAPI.update(postId, buildPayload(true));
      }
      lastSnapshotRef.current = JSON.stringify(buildPayload(true));
    } catch (error) {
      console.error('Auto/Save draft failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const autoSaveDraft = useCallback(async () => {
    const snapshot = JSON.stringify({
      title,
      excerpt,
      content,
      markdown,
      featuredImage,
      selectedCategories,
      selectedTags,
      featured,
      slug,
      metaTitle,
      metaDescription,
      metaKeywords,
      published,
      scheduledAt,
    });
    if (!title) return;
    if (snapshot === lastSnapshotRef.current) return;
    await saveDraft();
  }, [title, excerpt, content, markdown, featuredImage, selectedCategories, selectedTags, featured, slug, metaTitle, metaDescription, metaKeywords, published, scheduledAt]);

  useEffect(() => {
    const id = setInterval(() => {
      autoSaveDraft();
    }, 30000);
    return () => clearInterval(id);
  }, [autoSaveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = buildPayload(false);
      if (postId) {
        await postsAPI.update(postId, payload);
      } else {
        const res = await postsAPI.create(payload);
        setPostId(res.data.id);
      }
      router.push('/admin/posts');
    } catch (error) {
      console.error('Error creating post:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Create New Post</h1>

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
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Excerpt</label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Brief description of the post"
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
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="Write markdown here"
                    className="w-full min-h-[160px] px-3 py-2 border rounded-md"
                  />
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Preview</div>
                    <div className="prose prose-sm max-w-none border rounded-md p-3 dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {markdown || ''}
                      </ReactMarkdown>
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
                          const url: string = res.data?.url || '';
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
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                    />
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
                  <Input
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    placeholder="Search tags…"
                  />
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
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                    />
                    Publish immediately
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Publish at (optional)</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">If set to a future time and "Publish" is checked, the post will go live at that time.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 lg:sticky lg:bottom-0 lg:bg-white lg:py-2 lg:border-t" >
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Post'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={saveDraft}
                disabled={saving || loading}
                title={title ? '' : 'Enter a title to enable draft saving'}
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/admin/posts')}
              >
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

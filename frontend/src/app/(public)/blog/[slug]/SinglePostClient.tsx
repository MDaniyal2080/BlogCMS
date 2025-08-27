"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { postsAPI } from '@/lib/api';
import { Post } from '@/types';
import { formatDate, readingTime } from '@/lib/utils';
import { Calendar, Clock, User, Tag, ArrowLeft, Eye, Share2, Twitter, Facebook, Linkedin, Folder, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/public/SettingsContext';
import dynamic from 'next/dynamic';
import BlogCard from '@/components/public/BlogCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createLowlight, common } from 'lowlight';
import { sanitizeHtml } from '@/lib/sanitize';

// Lowlight instance with common grammars
const lowlight = createLowlight(common);

// Render lowlight HAST nodes as React elements
function renderHast(node: any, key?: React.Key): React.ReactNode {
  if (!node) return null;
  if (node.type === 'text') return node.value;
  if (node.type === 'element') {
    const props: any = { key, ...node.properties };
    const children = (node.children || []).map((c: any, i: number) => renderHast(c, i));
    return React.createElement(node.tagName, props, children);
  }
  if (Array.isArray(node)) return node.map((n: any, i: number) => renderHast(n, i));
  return null;
}

function CodeRenderer({ inline, className, children }: any) {
  const code = String(children ?? '').replace(/\n$/, '');
  if (inline) {
    return <code className={className}>{children}</code>;
  }
  const match = /language-(\w+)/.exec(className || '');
  try {
    const tree = match?.[1]
      ? lowlight.highlight(match[1], code).children
      : (lowlight as any).highlightAuto
        ? (lowlight as any).highlightAuto(code).children
        : [];
    return (
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
        <code className={className}>{renderHast(tree)}</code>
      </pre>
    );
  } catch (e) {
    return (
      <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
        <code className={className}>{code}</code>
      </pre>
    );
  }
}

function AnchorRenderer({ href, children, ...props }: any) {
  const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      {...props}
      rel={isExternal ? 'nofollow noopener noreferrer' : props.rel}
      target={isExternal ? '_blank' : props.target}
    >
      {children}
    </a>
  );
}

export default function SinglePostClient({ slug, initialPost }: { slug: string; initialPost?: Post }) {
  const [post, setPost] = useState<Post | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const { settings, assetUrl } = useSettings();
  const tz = settings.timezone || 'UTC';
  const [related, setRelated] = useState<Post[]>([]);
  const [prevNext, setPrevNext] = useState<{ prev: Post | null; next: Post | null } | null>(null);
  const incrementedRef = useRef(false);
  const sanitizedHtml = useMemo(() => sanitizeHtml(post?.content || ''), [post?.content]);

  // Defer loading of Comments to reduce initial bundle size
  const Comments = useRef(
    dynamic(() => import('@/components/public/Comments'), {
      ssr: false,
      loading: () => <div className="h-24 bg-muted animate-pulse rounded" />,
    })
  ).current;

  useEffect(() => {
    if (initialPost) {
      // We already have the post from the server; skip client fetch.
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await postsAPI.getBySlug(slug);
        if (!cancelled) setPost(response.data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching post:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [slug, initialPost]);

  // After we have the post id, increment views and load related/prev-next
  useEffect(() => {
    const run = async () => {
      if (!post?.id) return;
      // Increment view count once per mount (non-blocking)
      if (!incrementedRef.current) {
        incrementedRef.current = true;
        postsAPI
          .incrementView(post.id)
          .then((res) => {
            if (res?.data?.viewCount != null) {
              setPost((p) => (p ? { ...p, viewCount: res.data.viewCount } : p));
            }
          })
          .catch(() => {});
      }

      // Load related posts and prev/next concurrently
      try {
        const [rel, pn] = await Promise.all([
          postsAPI.related(post.id, { limit: 3 }).catch(() => ({ data: [] } as any)),
          postsAPI.prevNext(post.id).catch(() => ({ data: null } as any)),
        ]);
        setRelated((rel as any).data || []);
        setPrevNext((pn as any).data || null);
      } catch (e) {
        // ignore
      }
    };
    run();
  }, [post?.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-muted animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded mb-4" />
          <div className="h-4 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 bg-muted animate-pulse rounded mb-2" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Build share URL on the client after mount to avoid SSR hydration mismatches
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    if (post?.slug && typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/blog/${post.slug}`);
    } else {
      setShareUrl('');
    }
  }, [post?.slug]);

  return (
    <article className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/blog">
          <Button variant="ghost" className="mb-6 no-print">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
          </Button>
        </Link>

        {post.featuredImage && (
          <div className="relative w-full aspect-[16/9] mb-8">
            <Image
              src={assetUrl(post.featuredImage)}
              alt={post.title}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{post.author?.name || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(post.publishedAt || post.createdAt, { timeZone: tz })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readingTime(post.content)} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.viewCount || 0}</span>
            </div>
          </div>

          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-accent"
                >
                  <Folder className="h-3 w-3" />
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-accent"
                >
                  <Tag className="h-3 w-3" />
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Share buttons */}
          <div className="mt-4 flex items-center gap-2 no-print">
            <span className="text-sm text-muted-foreground">Share:</span>
            <Button variant="outline" size="icon" onClick={() => shareUrl && window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`, 'share-twitter', 'width=600,height=500')} aria-label="Share on Twitter">
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => shareUrl && window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, 'share-facebook', 'width=600,height=500')} aria-label="Share on Facebook">
              <Facebook className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => shareUrl && window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, 'share-linkedin', 'width=600,height=500')} aria-label="Share on LinkedIn">
              <Linkedin className="h-4 w-4" />
            </Button>
            {shareUrl ? (
              <Button variant="outline" size="icon" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Open post URL">
                  <Share2 className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="icon" aria-label="Open post URL" disabled>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {post.excerpt && (
          <div className="text-lg text-muted-foreground mb-8 italic">
            {post.excerpt}
          </div>
        )}

        {post.markdown && post.markdown.trim() ? (
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeRenderer, a: AnchorRenderer }}>
              {post.markdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        )}

        {/* Prev/Next navigation */}
        {prevNext && (prevNext.prev || prevNext.next) && (
          <nav className="mt-12 flex justify-between items-center gap-4 no-print">
            <div>
              {prevNext.prev && (
                <Link href={`/blog/${prevNext.prev.slug}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="line-clamp-1">{prevNext.prev.title}</span>
                </Link>
              )}
            </div>
            <div className="text-right">
              {prevNext.next && (
                <Link href={`/blog/${prevNext.next.slug}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                  <span className="line-clamp-1">{prevNext.next.title}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <section className="mt-12 no-print">
            <h3 className="text-2xl font-semibold mb-4">Related Posts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((rp) => (
                <BlogCard key={rp.id} post={rp} />
              ))}
            </div>
          </section>
        )}

        {settings.enable_comments === 'true' && post.id && (
          <div className="no-print">
            <Comments postId={post.id} />
          </div>
        )}
      </div>
    </article>
  );
}

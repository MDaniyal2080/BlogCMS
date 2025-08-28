import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, Prisma } from '@prisma/client';

import type { CreatePostDto } from './dto/create-post.dto';
import type { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private mapRole(role: string) {
    switch (role) {
      case 'ADMIN':
        return 'admin';
      case 'EDITOR':
        return 'editor';
      default:
        return 'author';
    }
  }

  private mapPost(
    p: Prisma.PostGetPayload<{
      include: {
        author: true;
        categories: { include: { category: true } };
        tags: { include: { tag: true } };
      };
    }>,
  ) {
    const name =
      [p.author?.firstName, p.author?.lastName].filter(Boolean).join(' ') ||
      p.author?.username ||
      'Anonymous';

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      content: p.content,
      markdown: p.markdown,
      excerpt: p.excerpt ?? null,
      featuredImage: p.coverImage ?? null,
      featured: Boolean(p.featured) || false,
      published: p.status === 'PUBLISHED',
      status: p.status,
      publishedAt: p.publishedAt,
      authorId: p.authorId,
      author: p.author
        ? {
            id: p.author.id,
            email: p.author.email,
            name,
            role: this.mapRole(p.author.role),
            createdAt: p.author.createdAt,
            updatedAt: p.author.updatedAt,
          }
        : null,
      categories: (p.categories || []).map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
        createdAt: pc.category.createdAt,
        updatedAt: pc.category.updatedAt,
      })),
      tags: (p.tags || []).map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        createdAt: pt.tag.createdAt,
      })),
      metaTitle: p.metaTitle ?? null,
      metaDescription: p.metaDescription ?? null,
      metaKeywords: p.metaKeywords ?? null,
      viewCount: p.viewCount ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private includeForPost() {
    return {
      author: true,
      categories: {
        include: { category: true },
      },
      tags: {
        include: { tag: true },
      },
    } as const;
  }

  // Minimal HTML sanitizer to mitigate XSS without external deps.
  // Strips <script>, inline event handlers, javascript: URLs, and dangerous embeds.
  private sanitizeHtml(html: string): string {
    if (!html) return '';
    let out = String(html);
    // Remove script/style/noscript/iframe/object/embed/link/meta blocks and tags
    out = out.replace(
      /<(script|style|noscript|iframe|object|embed|link|meta)\b[\s\S]*?>[\s\S]*?<\/(?:\1)>/gi,
      '',
    );
    out = out.replace(
      /<(script|style|noscript|iframe|object|embed|link|meta)\b[\s\S]*?\/>/gi,
      '',
    );
    out = out.replace(
      /<\/?(script|style|noscript|iframe|object|embed|link|meta)\b[\s\S]*?>/gi,
      '',
    );
    // Remove on*="..." and on*='...'
    out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
    out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
    out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
    // Neutralize javascript: and data: in href/src (allow data:image/*)
    out = out.replace(/\s(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '');
    out = out.replace(/\s(href|src)\s*=\s*'\s*javascript:[^']*'/gi, '');
    out = out.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, '');
    out = out.replace(
      /\ssrc\s*=\s*"\s*data:(?!image\/(?:png|jpe?g|gif|webp|avif))[^"]*"/gi,
      '',
    );
    out = out.replace(
      /\ssrc\s*=\s*'\s*data:(?!image\/(?:png|jpe?g|gif|webp|avif))[^']*'/gi,
      '',
    );
    return out;
  }

  async list(params: {
    page?: number | string;
    limit?: number | string;
    published?: string | boolean | number;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' | 'viewCount';
    sortOrder?: string;
    categoryId?: string;
    categorySlug?: string;
    tagSlug?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
    withMeta?: unknown;
    featured?: string | boolean | number;
    excludeIds?: string | string[];
  }) {
    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(Math.max(1, Number(params.limit ?? 10)), 100);
    const skip = (page - 1) * limit;

    const sortBy =
      (params.sortBy as
        | 'createdAt'
        | 'updatedAt'
        | 'publishedAt'
        | 'title'
        | 'viewCount') || 'createdAt';
    const sortOrder: 'asc' | 'desc' =
      String(params.sortOrder ?? 'desc').toLowerCase() === 'asc'
        ? 'asc'
        : 'desc';
    const statusParam = params.status;
    const publishedParam = params.published; // backward-compat
    const published =
      publishedParam === true ||
      publishedParam === 'true' ||
      publishedParam === 1 ||
      publishedParam === '1';
    const categoryId = params.categoryId;
    const categorySlug = params.categorySlug;
    const tagSlug = params.tagSlug;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;
    const q = (params.q || '').toString().trim();
    const withMeta = Boolean(params.withMeta);
    const featuredParam = params.featured;
    const featured =
      featuredParam === true ||
      featuredParam === 'true' ||
      featuredParam === 1 ||
      featuredParam === '1';

    const excludeIdsRaw = params.excludeIds;
    let excludeIds: string[] | undefined = undefined;
    if (Array.isArray(excludeIdsRaw)) {
      excludeIds = excludeIdsRaw.filter(Boolean);
    } else if (typeof excludeIdsRaw === 'string') {
      excludeIds = excludeIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => !!s);
    }

    const where: Prisma.PostWhereInput = {};

    if (statusParam) {
      where.status = statusParam as PostStatus;
    } else if (published) {
      // legacy published filter: only published and already visible
      where.status = PostStatus.PUBLISHED;
      where.publishedAt = { lte: new Date() };
    }

    if (categoryId) {
      where.categories = { some: { categoryId } };
    } else if (categorySlug) {
      where.categories = { some: { category: { slug: categorySlug } } };
    }

    if (tagSlug) {
      // Filter posts that have at least one matching tag slug
      where.tags = { some: { tag: { slug: tagSlug } } };
    }

    if (dateFrom || dateTo) {
      where.publishedAt = {
        ...(where.publishedAt as Prisma.DateTimeNullableFilter | undefined),
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { markdown: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (featured) {
      where.featured = true;
    }

    if (excludeIds && excludeIds.length) {
      where.id = { notIn: excludeIds };
    }

    let orderBy: Prisma.PostOrderByWithRelationInput;
    switch (sortBy) {
      case 'updatedAt':
        orderBy = { updatedAt: sortOrder };
        break;
      case 'publishedAt':
        orderBy = { publishedAt: sortOrder };
        break;
      case 'title':
        orderBy = { title: sortOrder };
        break;
      case 'viewCount':
        orderBy = { viewCount: sortOrder };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: this.includeForPost(),
      }),
    ]);
    const items = posts.map((p) => this.mapPost(p));
    if (withMeta) return { items, total, page, limit };
    return items;
  }

  async getBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        slug,
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
      },
      include: this.includeForPost(),
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.mapPost(post);
  }

  async incrementView(id: string) {
    const updated = await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
    return updated;
  }

  async getRelated(id: string, limit = 3) {
    // Find the source post with categories/tags
    const base = await this.prisma.post.findUnique({
      where: { id },
      include: {
        categories: true,
        tags: true,
      },
    });
    if (!base) throw new NotFoundException('Post not found');

    const categoryIds = (base.categories || []).map((c) => c.categoryId);
    const tagIds = (base.tags || []).map((t) => t.tagId);

    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      publishedAt: { lte: new Date() },
      id: { not: id },
    };

    if (categoryIds.length || tagIds.length) {
      where.OR = [] as Prisma.PostWhereInput[];
      if (categoryIds.length)
        where.OR.push({
          categories: { some: { categoryId: { in: categoryIds } } },
        });
      if (tagIds.length)
        where.OR.push({ tags: { some: { tagId: { in: tagIds } } } });
    }

    const related = await this.prisma.post.findMany({
      where,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: Math.max(1, Math.min(10, Number(limit) || 3)),
      include: this.includeForPost(),
    });
    return related.map((p) => this.mapPost(p));
  }

  async getPrevNext(id: string) {
    const current = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, publishedAt: true, createdAt: true },
    });
    if (!current) throw new NotFoundException('Post not found');
    const pivot = current.publishedAt || current.createdAt;

    const [prev, next] = await Promise.all([
      this.prisma.post.findFirst({
        where: {
          status: PostStatus.PUBLISHED,
          publishedAt: { lt: pivot, lte: new Date() },
        },
        orderBy: { publishedAt: 'desc' },
        include: this.includeForPost(),
      }),
      this.prisma.post.findFirst({
        where: {
          status: PostStatus.PUBLISHED,
          publishedAt: { gt: pivot, lte: new Date() },
        },
        orderBy: { publishedAt: 'asc' },
        include: this.includeForPost(),
      }),
    ]);

    return {
      prev: prev ? this.mapPost(prev) : null,
      next: next ? this.mapPost(next) : null,
    };
  }

  async getScheduled(opts?: { limit?: number; from?: string; to?: string }) {
    const limit = Math.min(Math.max(1, opts?.limit ?? 20), 100);
    const now = new Date();
    let publishedAt: Prisma.DateTimeNullableFilter = { gt: now };
    if (opts?.from) publishedAt = { ...publishedAt, gte: new Date(opts.from) };
    if (opts?.to) publishedAt = { ...publishedAt, lte: new Date(opts.to) };

    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt,
      },
      orderBy: { publishedAt: 'asc' },
      take: limit,
      include: this.includeForPost(),
    });
    return posts.map((p) => this.mapPost(p));
  }

  async getById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: this.includeForPost(),
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.mapPost(post);
  }

  async search(q: string) {
    const query = q?.trim();
    if (!query) return [];
    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { markdown: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.includeForPost(),
    });
    return posts.map((p) => this.mapPost(p));
  }

  async getByCategorySlug(slug: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
        categories: { some: { category: { slug } } },
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeForPost(),
    });
    return posts.map((p) => this.mapPost(p));
  }

  async getByTagSlug(slug: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
        tags: { some: { tag: { slug } } },
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeForPost(),
    });
    return posts.map((p) => this.mapPost(p));
  }

  private slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = base;
    let i = 1;
    // Try base, then base-1, base-2, ... until available
    while (true) {
      const existing = await this.prisma.post.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) return slug;
      slug = `${base}-${i++}`;
    }
  }

  async create(data: CreatePostDto & { authorId: string }) {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      categoryId,
      categoryIds,
      tagIds,
      published,
      authorId,
      metaTitle,
      metaDescription,
      metaKeywords,
      slug,
    } = data;

    const now = new Date();
    const status: PostStatus = published
      ? PostStatus.PUBLISHED
      : PostStatus.DRAFT;

    const slugBase = this.slugify(slug?.trim() || title);
    const uniqueSlug = await this.ensureUniqueSlug(slugBase);
    const safeContent = this.sanitizeHtml((content || '').toString());

    const created = await this.prisma.post.create({
      data: {
        title,
        slug: uniqueSlug,
        excerpt: excerpt ?? null,
        content: safeContent,
        markdown: data.markdown ?? '',
        coverImage: featuredImage ?? null,
        status,
        featured: Boolean(data.featured) || false,
        publishedAt:
          status === PostStatus.PUBLISHED
            ? data.publishedAt
              ? new Date(data.publishedAt)
              : now
            : null,
        author: { connect: { id: authorId } },
        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        metaKeywords: metaKeywords ?? null,
        categories:
          Array.isArray(categoryIds) && categoryIds.length
            ? {
                create: categoryIds.map((cid: string) => ({
                  category: { connect: { id: cid } },
                })),
              }
            : categoryId
              ? { create: [{ category: { connect: { id: categoryId } } }] }
              : undefined,
        tags:
          Array.isArray(tagIds) && tagIds.length
            ? {
                create: tagIds.map((tagId: string) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
      },
      include: this.includeForPost(),
    });
    return this.mapPost(created);
  }

  async update(id: string, data: UpdatePostDto) {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      categoryId,
      categoryIds,
      tagIds,
      published,
      metaTitle,
      metaDescription,
      metaKeywords,
      slug,
      featured,
    } = data;

    const explicitStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined =
      data.status;
    const statusFromBool: PostStatus | undefined =
      typeof published === 'boolean'
        ? published
          ? PostStatus.PUBLISHED
          : PostStatus.DRAFT
        : undefined;
    const status: PostStatus | undefined = explicitStatus
      ? (explicitStatus as PostStatus)
      : statusFromBool;

    let slugUpdate: string | undefined = undefined;
    if (typeof slug !== 'undefined') {
      const base = this.slugify((slug || '').trim());
      if (base) {
        slugUpdate = await this.ensureUniqueSlug(base, id);
      }
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        title,
        slug: slugUpdate,
        excerpt,
        content:
          typeof content === 'string' ? this.sanitizeHtml(content) : content,
        markdown: data.markdown,
        coverImage: featuredImage,
        status,
        featured: typeof featured === 'boolean' ? featured : undefined,
        publishedAt:
          typeof status !== 'undefined'
            ? status === PostStatus.PUBLISHED
              ? data.publishedAt
                ? new Date(data.publishedAt)
                : new Date()
              : status === PostStatus.DRAFT
                ? null
                : undefined
            : data.publishedAt
              ? new Date(data.publishedAt)
              : undefined,
        metaTitle,
        metaDescription,
        metaKeywords,
        categories: Array.isArray(categoryIds)
          ? {
              deleteMany: {},
              create: categoryIds.map((cid: string) => ({
                category: { connect: { id: cid } },
              })),
            }
          : typeof categoryId !== 'undefined'
            ? {
                deleteMany: {},
                create: categoryId
                  ? [{ category: { connect: { id: categoryId } } }]
                  : [],
              }
            : undefined,
        tags: Array.isArray(tagIds)
          ? {
              deleteMany: {},
              create: tagIds.map((tagId: string) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: this.includeForPost(),
    });
    return this.mapPost(updated);
  }

  async bulkUpdateStatus(
    ids: string[],
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    publishedAt?: string,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
    const data: {
      status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      publishedAt?: Date | null;
    } = { status };
    if (status === 'PUBLISHED') {
      data.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
    } else if (status === 'DRAFT') {
      data.publishedAt = null;
    }
    const res = await this.prisma.post.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return { count: res.count };
  }

  async bulkDelete(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
    const res = await this.prisma.post.deleteMany({
      where: { id: { in: ids } },
    });
    return { count: res.count };
  }

  async remove(id: string) {
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  async duplicate(id: string, authorId?: string) {
    const original = await this.prisma.post.findUnique({
      where: { id },
      include: {
        categories: true,
        tags: true,
      },
    });
    if (!original) throw new NotFoundException('Post not found');

    const newTitle = `${original.title} (Copy)`;
    const baseSlug = `${original.slug}-copy`;
    const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

    const created = await this.prisma.post.create({
      data: {
        title: newTitle,
        slug: uniqueSlug,
        excerpt: original.excerpt ?? null,
        content: original.content,
        markdown: original.markdown,
        coverImage: original.coverImage ?? null,
        status: PostStatus.DRAFT,
        featured: Boolean(original.featured) || false,
        publishedAt: null,
        author: { connect: { id: authorId || original.authorId } },
        metaTitle: original.metaTitle ?? null,
        metaDescription: original.metaDescription ?? null,
        metaKeywords: original.metaKeywords ?? null,
        categories:
          Array.isArray(original.categories) && original.categories.length
            ? {
                create: original.categories.map((c) => ({
                  category: { connect: { id: c.categoryId } },
                })),
              }
            : undefined,
        tags:
          Array.isArray(original.tags) && original.tags.length
            ? {
                create: original.tags.map((t) => ({
                  tag: { connect: { id: t.tagId } },
                })),
              }
            : undefined,
      },
      include: this.includeForPost(),
    });
    return this.mapPost(created);
  }

  async getStats() {
    const now = new Date();
    const [
      totalPosts,
      drafts,
      published,
      viewsAgg,
      categoriesCount,
      tagsCount,
      recent,
      catAgg,
      tagAgg,
    ] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: PostStatus.DRAFT } }),
      this.prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
      this.prisma.category.count(),
      this.prisma.tag.count(),
      this.prisma.post.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: this.includeForPost(),
      }),
      // Content performance aggregates (published and visible posts only)
      this.prisma.postCategory.groupBy({
        by: ['categoryId'],
        where: {
          post: { status: PostStatus.PUBLISHED, publishedAt: { lte: now } },
        },
        _count: { _all: true },
      }),
      this.prisma.postTag.groupBy({
        by: ['tagId'],
        where: {
          post: { status: PostStatus.PUBLISHED, publishedAt: { lte: now } },
        },
        _count: { _all: true },
      }),
    ]);

    // Build posts over time for last 12 months
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 11);

    const postsSince = await this.prisma.post.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    });

    const seriesMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      seriesMap.set(key, 0);
    }
    postsSince.forEach((p) => {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) || 0) + 1);
    });
    const postsOverTime = Array.from(seriesMap.entries()).map(
      ([month, count]) => ({ month, count }),
    );

    const popular = await this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: { id: true, title: true, viewCount: true },
    });

    // Resolve category/tag names and prepare top-10 lists
    const catIds = catAgg.map((c) => c.categoryId);
    const tagIds = tagAgg.map((t) => t.tagId);
    const [catDetails, tagDetails] = await Promise.all([
      catIds.length
        ? this.prisma.category.findMany({
            where: { id: { in: catIds } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve<{ id: string; name: string; slug: string }[]>([]),
      tagIds.length
        ? this.prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve<{ id: string; name: string; slug: string }[]>([]),
    ]);
    const catMap = new Map<string, { id: string; name: string; slug: string }>(
      catDetails.map((c) => [c.id, c] as const),
    );
    const tagMap = new Map<string, { id: string; name: string; slug: string }>(
      tagDetails.map((t) => [t.id, t] as const),
    );
    const categoriesTop = catAgg
      .map((c) => ({
        id: c.categoryId,
        name: catMap.get(c.categoryId)?.name || 'Unknown',
        slug: catMap.get(c.categoryId)?.slug || '',
        count: c._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const tagsTop = tagAgg
      .map((t) => ({
        id: t.tagId,
        name: tagMap.get(t.tagId)?.name || 'Unknown',
        slug: tagMap.get(t.tagId)?.slug || '',
        count: t._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      counts: {
        posts: totalPosts,
        drafts,
        published,
        views: viewsAgg._sum.viewCount ?? 0,
        categories: categoriesCount,
        tags: tagsCount,
      },
      recent: recent.map((p) => this.mapPost(p)),
      series: {
        postsOverTime,
        popularPosts: popular.map((p) => ({
          title: p.title,
          views: p.viewCount,
        })),
      },
      content: {
        categoriesTop,
        tagsTop,
      },
    };
  }
}

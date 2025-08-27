import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  async findAll() {
    const [items, orderSetting] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { posts: true } } },
      }),
      this.prisma.setting.findUnique({ where: { key: 'categories_order' } }),
    ]);
    const mapped = items.map(({ _count, ...cat }) => ({ ...cat, postCount: _count.posts }));
    if (!orderSetting?.value) return mapped;
    let orderIds: string[] = [];
    try {
      orderIds = JSON.parse(orderSetting.value);
      if (!Array.isArray(orderIds)) orderIds = [];
    } catch {
      orderIds = [];
    }
    const indexMap = new Map(orderIds.map((id, idx) => [id, idx]));
    // Sort by stored order first; items not in order come after, by name asc
    return [...mapped].sort((a: any, b: any) => {
      const ia = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const ib = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: {
    name: string;
    description?: string | null;
    color?: string | null;
  }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const slug = this.slugify(name);

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: { equals: slug, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description: data.description ?? null,
        color: data.color ?? null,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string | null; color?: string | null },
  ) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');

    const name = data.name?.trim();
    const providedSlug = data.slug?.trim();
    let slug: string | undefined = providedSlug ? this.slugify(providedSlug) : undefined;

    const nameChanged = !!(name && name.toLowerCase() !== exists.name.toLowerCase());

    if (nameChanged || slug) {
      const ors: any[] = [];
      if (nameChanged) {
        ors.push({ name: { equals: name, mode: 'insensitive' } });
      }
      if (slug) {
        ors.push({ slug: { equals: slug, mode: 'insensitive' } });
      }
      if (ors.length) {
        const conflict = await this.prisma.category.findFirst({
          where: { OR: ors, NOT: { id } },
        });
        if (conflict) {
          throw new BadRequestException('Category with this name or slug already exists');
        }
      }
      // If slug not explicitly provided but name changed, derive slug from new name
      if (!slug && nameChanged) {
        slug = this.slugify(name);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: data.description,
        color: data.color,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      const existing = await tx.setting.findUnique({ where: { key: 'categories_order' } });
      if (!existing?.value) {
        await tx.setting.upsert({
          where: { key: 'categories_order' },
          create: { key: 'categories_order', value: '[]', type: 'json' },
          update: { value: '[]', type: 'json' },
        });
        return;
      }
      try {
        const arr = JSON.parse(existing.value) as string[];
        const filtered = Array.isArray(arr) ? arr.filter((x) => x !== id) : [];
        await tx.setting.upsert({
          where: { key: 'categories_order' },
          create: { key: 'categories_order', value: JSON.stringify(filtered), type: 'json' },
          update: { value: JSON.stringify(filtered), type: 'json' },
        });
      } catch {
        await tx.setting.upsert({
          where: { key: 'categories_order' },
          create: { key: 'categories_order', value: '[]', type: 'json' },
          update: { value: '[]', type: 'json' },
        });
      }
    });
    return { message: 'Category deleted' };
  }

  async reorder(ids: string[]) {
    // Validate ids exist (best-effort)
    const cats = await this.prisma.category.findMany({ select: { id: true } });
    const validIds = new Set(cats.map((c) => c.id));
    const cleaned = (Array.isArray(ids) ? ids : []).filter((id) => validIds.has(id));
    await this.prisma.setting.upsert({
      where: { key: 'categories_order' },
      create: { key: 'categories_order', value: JSON.stringify(cleaned), type: 'json' },
      update: { value: JSON.stringify(cleaned), type: 'json' },
    });
    return { message: 'Order updated' };
  }
}

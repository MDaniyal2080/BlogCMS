import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  private slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  async findAll(q?: string) {
    const where: Prisma.TagWhereInput | undefined = q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { slug: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : undefined;
    const items = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    type TagWithCount = Prisma.TagGetPayload<{
      include: { _count: { select: { posts: true } } };
    }>;
    const withCount = items as TagWithCount[];
    return withCount.map(({ _count, ...t }) => ({
      ...t,
      postCount: _count.posts,
    }));
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async create(data: { name: string }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    const slug = this.slugify(name);
    const existing = await this.prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
          { slug: { equals: slug, mode: Prisma.QueryMode.insensitive } },
        ],
      },
    });
    if (existing)
      throw new BadRequestException('Tag with this name already exists');
    return this.prisma.tag.create({ data: { name, slug } });
  }

  async update(id: string, data: { name?: string }) {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tag not found');
    const name = data.name?.trim();
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const slug = this.slugify(name);
      const conflict = await this.prisma.tag.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
            { slug: { equals: slug, mode: Prisma.QueryMode.insensitive } },
          ],
          NOT: { id },
        },
      });
      if (conflict)
        throw new BadRequestException('Tag with this name already exists');
    }
    return this.prisma.tag.update({
      where: { id },
      data: {
        name,
        slug: name ? this.slugify(name) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted' };
  }

  async merge(sourceIds: string[], targetId: string) {
    const cleanedSources = (Array.isArray(sourceIds) ? sourceIds : []).filter(
      (x) => x && x !== targetId,
    );
    if (!targetId || cleanedSources.length === 0) {
      throw new BadRequestException(
        'Provide targetId and one or more sourceIds',
      );
    }
    const target = await this.prisma.tag.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Target tag not found');

    await this.prisma.$transaction(async (tx) => {
      for (const sid of cleanedSources) {
        const src = await tx.tag.findUnique({ where: { id: sid } });
        if (!src) continue; // skip non-existing
        const links = await tx.postTag.findMany({
          where: { tagId: sid },
          select: { postId: true },
        });
        for (const link of links) {
          // Upsert relation to target
          await tx.postTag.upsert({
            where: { postId_tagId: { postId: link.postId, tagId: targetId } },
            update: {},
            create: { postId: link.postId, tagId: targetId },
          });
        }
        // Remove all source relations
        await tx.postTag.deleteMany({ where: { tagId: sid } });
        // Delete the source tag
        await tx.tag.delete({ where: { id: sid } });
      }
    });

    return { message: 'Tags merged' };
  }

  async cleanupUnused() {
    const res = await this.prisma.tag.deleteMany({
      where: { posts: { none: {} } },
    });
    return { deleted: res.count };
  }
}

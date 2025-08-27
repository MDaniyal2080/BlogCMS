import { BadRequestException, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  // naive in-memory rate limiter per IP for public comment creation
  private rateMap = new Map<string, number[]>();

  private checkRateLimit(ip?: string) {
    if (!ip) return;
    const now = Date.now();
    const shortWindow = 10_000; // 10 seconds
    const longWindow = 10 * 60_000; // 10 minutes
    const shortLimit = 1;
    const longLimit = 10;

    const times = this.rateMap.get(ip) || [];
    const recentShort = times.filter((t) => now - t <= shortWindow);
    const recentLong = times.filter((t) => now - t <= longWindow);
    if (recentShort.length >= shortLimit || recentLong.length >= longLimit) {
      throw new HttpException('Too many comments, please slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }
    // record
    const updated = [...recentLong, now];
    this.rateMap.set(ip, updated);
  }

  async listByPost(postId: string, opts?: { limit?: number; offset?: number; includeUnapproved?: boolean }) {
    if (!postId) throw new BadRequestException('postId is required');
    const limit = Math.min(Math.max(1, opts?.limit ?? 20), 100);
    const offset = Math.max(0, opts?.offset ?? 0);

    return this.prisma.comment.findMany({
      where: { postId, ...(opts?.includeUnapproved ? {} : { approved: true }) },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  async create(
    data: { postId: string; authorName?: string | null; authorEmail?: string | null; content: string; honeypot?: string },
    ip?: string,
  ) {
    const postId = (data.postId || '').trim();
    const content = (data.content || '').trim();
    const authorName = data.authorName?.trim() || null;
    const authorEmail = data.authorEmail?.trim() || null;

    if (!postId) throw new BadRequestException('postId is required');
    if (!content) throw new BadRequestException('content is required');
    if (data.honeypot && data.honeypot.length > 0) {
      throw new BadRequestException('Invalid submission');
    }

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BadRequestException('Invalid postId');

    this.checkRateLimit(ip);

    return this.prisma.comment.create({
      data: { postId, content, authorName, authorEmail },
    });
  }

  // Admin moderation
  async adminList(opts?: { postId?: string; approved?: boolean; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(1, opts?.limit ?? 20), 100);
    const offset = Math.max(0, opts?.offset ?? 0);
    return this.prisma.comment.findMany({
      where: {
        ...(opts?.postId ? { postId: opts.postId } : {}),
        ...(typeof opts?.approved === 'boolean' ? { approved: opts.approved } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async setApproval(id: string, approved: boolean) {
    if (!id) throw new BadRequestException('id is required');
    return this.prisma.comment.update({ where: { id }, data: { approved } });
  }

  async remove(id: string) {
    if (!id) throw new BadRequestException('id is required');
    return this.prisma.comment.delete({ where: { id } });
  }
}

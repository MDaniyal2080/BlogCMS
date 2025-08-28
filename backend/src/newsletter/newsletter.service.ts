import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NewsletterSubscriber = {
  email: string;
  subscribedAt: string;
};

@Injectable()
export class NewsletterService {
  private readonly settingKey = 'newsletter_subscribers';

  constructor(private prisma: PrismaService) {}

  async subscribe(email: string) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized) {
      return { message: 'Invalid email' };
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findUnique({
        where: { key: this.settingKey },
      });
      let list: NewsletterSubscriber[] = [];
      if (existing?.value) {
        try {
          const parsed: unknown = JSON.parse(existing.value);
          if (Array.isArray(parsed)) {
            list = parsed as NewsletterSubscriber[];
          }
        } catch {
          // ignore invalid JSON; reset list to empty
          list = [];
        }
      }
      const already = list.some(
        (s) => String(s.email).toLowerCase() === normalized,
      );
      if (!already) {
        list.push({
          email: normalized,
          subscribedAt: new Date().toISOString(),
        });
      }
      await tx.setting.upsert({
        where: { key: this.settingKey },
        create: {
          key: this.settingKey,
          value: JSON.stringify(list),
          type: 'json',
        },
        update: { value: JSON.stringify(list), type: 'json' },
      });
    });

    return { message: 'You are subscribed.' };
  }
}

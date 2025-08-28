import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    // Mask secret values before returning to clients
    return items.map((s) => {
      const nk = String(s.key)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (nk === 'smtp_password') {
        return { ...s, value: '********' };
      }
      return s;
    });
  }

  async update(key: string, data: { value: string; type?: string }) {
    const existing = await this.prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      // Create the setting if it does not exist yet (upsert behavior)
      return this.prisma.setting.create({
        data: {
          key,
          value: data.value,
          type: data.type ?? 'string',
        },
      });
    }
    return this.prisma.setting.update({
      where: { key },
      data: { value: data.value, type: data.type ?? existing.type },
    });
  }
}

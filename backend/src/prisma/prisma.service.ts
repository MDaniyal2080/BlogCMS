import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Do not block app startup if the DB is temporarily unavailable.
    // Health endpoint will report the DB status separately.
    try {
      await this.$connect();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Prisma initial connect failed (non-fatal):',
        e instanceof Error ? e.message : e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

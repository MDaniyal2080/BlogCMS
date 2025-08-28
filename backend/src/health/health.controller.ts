import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check(@Res() res: Response) {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      database: 'unknown',
    };

    try {
      // Test database connection with timeout
      const dbPromise = this.prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );

      await Promise.race([dbPromise, timeoutPromise]);
      healthCheck.database = 'connected';
      
      return res.status(HttpStatus.OK).json(healthCheck);
    } catch (error) {
      // Still return 200 OK for health checks even if DB is down
      // This allows the service to start up and be considered "healthy"
      // while the database is still initializing
      healthCheck.database = 'disconnected';
      healthCheck['error'] = error instanceof Error ? error.message : 'Unknown error';
      
      console.warn('Health check: Database connection failed:', error);
      return res.status(HttpStatus.OK).json(healthCheck);
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint - requires database' })
  async ready(@Res() res: Response) {
    try {
      // This endpoint requires database to be ready
      await this.prisma.$queryRaw`SELECT 1`;
      
      return res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

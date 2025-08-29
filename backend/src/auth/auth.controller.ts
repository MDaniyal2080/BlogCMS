import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    // Optionally set HttpOnly cookie for JWT, controlled by env
    const cookieEnabled =
      this.config.get<string>('AUTH_COOKIE_ENABLED') === 'true';
    if (cookieEnabled) {
      const name: string =
        this.config.get<string>('AUTH_COOKIE_NAME') ?? 'access_token';
      const sameSiteRaw: string =
        this.config.get<string>('AUTH_COOKIE_SAMESITE') ?? 'Lax';
      // Normalize to Express types: 'lax' | 'strict' | 'none'
      const sameSite = sameSiteRaw.toLowerCase() as 'lax' | 'strict' | 'none';
      const secure: boolean =
        this.config.get<string>('AUTH_COOKIE_SECURE') === 'true';
      const domain: string | undefined =
        this.config.get<string>('AUTH_COOKIE_DOMAIN') || undefined;
      const remember = !!loginDto.rememberMe;
      const defaultMaxAge = 30 * 24 * 60 * 60 * 1000; // 30d
      const rememberMax = Number(
        this.config.get<string>('AUTH_COOKIE_REMEMBER_MAX_AGE_MS') ??
          defaultMaxAge,
      );
      res.cookie(name, result.access_token, {
        httpOnly: true,
        sameSite,
        secure,
        path: '/',
        ...(domain ? { domain } : {}),
        ...(remember ? { maxAge: rememberMax } : {}),
      });

      // Issue a CSRF token (double-submit cookie) alongside the auth cookie
      const csrfCookieName: string =
        this.config.get<string>('CSRF_COOKIE_NAME') ?? 'csrf_token';
      const csrfToken = randomBytes(32).toString('hex');
      res.cookie(csrfCookieName, csrfToken, {
        httpOnly: false,
        sameSite,
        secure,
        path: '/',
        ...(domain ? { domain } : {}),
        ...(remember ? { maxAge: rememberMax } : {}),
      });
    }
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (clear auth cookie if enabled)' })
  logout(@Res({ passthrough: true }) res: Response) {
    const cookieEnabled =
      this.config.get<string>('AUTH_COOKIE_ENABLED') === 'true';
    if (cookieEnabled) {
      const name: string =
        this.config.get<string>('AUTH_COOKIE_NAME') ?? 'access_token';
      const sameSiteRaw: string =
        this.config.get<string>('AUTH_COOKIE_SAMESITE') ?? 'Lax';
      const sameSite = sameSiteRaw.toLowerCase() as 'lax' | 'strict' | 'none';
      const secure: boolean =
        this.config.get<string>('AUTH_COOKIE_SECURE') === 'true';
      const domain: string | undefined =
        this.config.get<string>('AUTH_COOKIE_DOMAIN') || undefined;
      res.cookie(name, '', {
        httpOnly: true,
        sameSite,
        secure,
        path: '/',
        ...(domain ? { domain } : {}),
        maxAge: 0,
      });

      // Clear CSRF cookie as well
      const csrfCookieName: string =
        this.config.get<string>('CSRF_COOKIE_NAME') ?? 'csrf_token';
      res.cookie(csrfCookieName, '', {
        httpOnly: false,
        sameSite,
        secure,
        path: '/',
        ...(domain ? { domain } : {}),
        maxAge: 0,
      });
    }
    return { success: true };
  }
}

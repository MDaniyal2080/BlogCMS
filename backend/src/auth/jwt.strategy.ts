import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const cookieEnabled =
      configService.get<string>('AUTH_COOKIE_ENABLED') === 'true';
    const cookieName: string =
      configService.get<string>('AUTH_COOKIE_NAME') || 'access_token';
    const cookieExtractor: JwtFromRequestFunction = (
      req: Request,
    ): string | null => {
      const header: string | undefined = req.headers?.cookie;
      if (!header) return null;
      // Safely build a regex to find the named cookie
      const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = header.match(
        new RegExp('(?:^|;\\s*)' + escaped + '=([^;]+)'),
      );
      return match ? decodeURIComponent(match[1]) : null;
    };

    const extractors: JwtFromRequestFunction[] = [
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ];
    if (cookieEnabled) extractors.unshift(cookieExtractor);

    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    username: string;
    role: 'ADMIN' | 'EDITOR';
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}

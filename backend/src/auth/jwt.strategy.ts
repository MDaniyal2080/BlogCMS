import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const cookieEnabled = configService.get('AUTH_COOKIE_ENABLED') === 'true';
    const cookieName = configService.get('AUTH_COOKIE_NAME') || 'access_token';
    const cookieExtractor = (req: any): string | null => {
      const header: string | undefined = req?.headers?.cookie;
      if (!header) return null;
      // Safely build a regex to find the named cookie
      const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = header.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]+)'));
      return match ? decodeURIComponent(match[1]) : null;
    };

    const extractors = [ExtractJwt.fromAuthHeaderAsBearerToken()];
    if (cookieEnabled) extractors.unshift(cookieExtractor);

    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'secret',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}

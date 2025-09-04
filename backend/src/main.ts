import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type {
  Request,
  Response,
  NextFunction,
  Application,
  RequestHandler,
} from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

function getCookies(
  req: RequestWithCookies,
): Record<string, string | undefined> {
  const raw = (req as unknown as { cookies?: unknown }).cookies;
  if (raw && typeof raw === 'object') {
    return raw as Record<string, string | undefined>;
  }
  return {};
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Add startup logging
  console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 Port:', process.env.PORT || '3001');
  console.log('🔧 Database URL configured:', !!process.env.DATABASE_URL);
  console.log('🔧 JWT Secret configured:', !!process.env.JWT_SECRET);

  // Disable Express x-powered-by header for security hardening
  try {
    const http = app.getHttpAdapter();
    const expressApp = http.getInstance() as Application;
    expressApp.disable('x-powered-by');
    // Configure trust proxy via env with safe defaults
    // Accepts: boolean (true/false), number (hops), string (IP/CIDR/'loopback'), or comma-separated list
    const rawTrust = process.env.TRUST_PROXY;
    let trustProxy: boolean | number | string | string[] = false;
    if (rawTrust && rawTrust.length > 0) {
      const v = rawTrust.trim().toLowerCase();
      if (v === 'true' || v === 'yes' || v === 'on' || v === 'enabled') {
        trustProxy = true;
      } else if (v === 'false' || v === 'no' || v === 'off' || v === 'disabled') {
        trustProxy = false;
      } else if (!Number.isNaN(Number.parseInt(v, 10))) {
        trustProxy = Number.parseInt(v, 10);
      } else if (rawTrust.includes(',')) {
        trustProxy = rawTrust
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        trustProxy = rawTrust; // e.g., 'loopback', '127.0.0.1', subnet, etc.
      }
    } else {
      // Default: trust first proxy in production; otherwise do not trust proxies
      trustProxy = process.env.NODE_ENV === 'production' ? 1 : false;
    }
    expressApp.set('trust proxy', trustProxy);
    console.log('🔧 Express trust proxy set to:', trustProxy);
  } catch (err) {
    // Non-fatal: adapter may not be Express in some environments
    console.warn('Could not configure Express adapter:', err);
  }

  // Global API prefix
  app.setGlobalPrefix('api');
  // Build a CORS allowlist from env (comma-separated)
  const rawOrigins =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_ORIGIN ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Merge explicit FRONTEND_URL/CLIENT_URL into allowlist
  for (const key of ['FRONTEND_URL', 'CLIENT_URL'] as const) {
    const v = process.env[key];
    if (v && !allowedOrigins.includes(v)) allowedOrigins.push(v);
  }

  // Respect custom CSRF header name for CORS
  const csrfHeaderNameCors = process.env.CSRF_HEADER_NAME || 'X-CSRF-Token';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true); // non-browser or same-origin
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Do not error for disallowed origins; proceed without CORS headers.
      // This avoids 5xx responses for healthchecks or non-browser clients.
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      csrfHeaderNameCors,
    ],
  });

  // Optional: Global rate limiting for abuse protection (configurable via env)
  const enableRateLimiting = process.env.ENABLE_RATE_LIMITING === 'true';
  const RATE_LIMIT_TTL = Math.max(
    1,
    Number.parseInt(process.env.RATE_LIMIT_TTL || '60', 10) || 60,
  );
  const RATE_LIMIT_LIMIT = Math.max(
    1,
    Number.parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10) || 100,
  );
  const SEARCH_RATE_LIMIT_TTL = Math.max(
    1,
    Number.parseInt(
      process.env.SEARCH_RATE_LIMIT_TTL || String(RATE_LIMIT_TTL),
      10,
    ) || RATE_LIMIT_TTL,
  );
  const SEARCH_RATE_LIMIT_LIMIT = Math.max(
    1,
    Number.parseInt(process.env.SEARCH_RATE_LIMIT_LIMIT || '30', 10) || 30,
  );
  if (enableRateLimiting) {
    console.log(
      `🔒 Rate limiting enabled (ttl=${RATE_LIMIT_TTL}s, limit=${RATE_LIMIT_LIMIT})`,
    );
    app.use(
      rateLimit({
        windowMs: RATE_LIMIT_TTL * 1000,
        max: RATE_LIMIT_LIMIT,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
    // Tighter limits for search endpoints
    app.use(
      '/api/posts/search',
      rateLimit({
        windowMs: SEARCH_RATE_LIMIT_TTL * 1000,
        max: SEARCH_RATE_LIMIT_LIMIT,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
    // Extra limiter for auth login to slow brute force attempts
    const AUTH_LOGIN_WINDOW_MS = Math.max(
      1,
      Number.parseInt(
        process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000),
        10,
      ),
    );
    const AUTH_LOGIN_MAX = Math.max(
      1,
      Number.parseInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || '10', 10),
    );
    app.use(
      '/api/auth/login',
      rateLimit({
        windowMs: AUTH_LOGIN_WINDOW_MS,
        max: AUTH_LOGIN_MAX,
        standardHeaders: true,
        legacyHeaders: false,
      }),
    );
  } else {
    console.log('🔓 Rate limiting disabled');
  }

  // Security middleware, call via typed factory aliases
  const helmetMw: RequestHandler = helmet({
    // Allow resources (like images under /uploads) to be embedded from other origins (Netlify)
    // Without this, browsers may block with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  const compressionMw: RequestHandler = (
    compression as unknown as () => RequestHandler
  )();
  const cookieParserMw: RequestHandler = (
    cookieParser as unknown as () => RequestHandler
  )();
  app.use(helmetMw);
  app.use(compressionMw);
  app.use(cookieParserMw);

  // CSRF protection (double-submit cookie) when using HttpOnly cookie auth
  // Enabled by default if AUTH_COOKIE_ENABLED=true and CSRF_PROTECTION!=false
  const csrfEnabled = process.env.CSRF_PROTECTION !== 'false';
  const cookieAuthEnabled = process.env.AUTH_COOKIE_ENABLED === 'true';
  const csrfCookieName = process.env.CSRF_COOKIE_NAME || 'csrf_token';
  const csrfHeaderName = process.env.CSRF_HEADER_NAME || 'X-CSRF-Token';
  const authCookieName = process.env.AUTH_COOKIE_NAME || 'access_token';
  const skipCsrfPaths = (
    process.env.CSRF_SKIP_PATHS || '/api/auth/login,/api/auth/register'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const skipCsrfSet = new Set(skipCsrfPaths);

  app.use((req: RequestWithCookies, res: Response, next: NextFunction) => {
    if (!csrfEnabled || !cookieAuthEnabled) return next();
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS')
      return next();
    if (skipCsrfSet.has(req.path)) return next();
    // Enforce CSRF only for authenticated sessions (when auth cookie is present)
    const cookies = getCookies(req);
    const hasAuthCookie = cookies[authCookieName];
    if (!hasAuthCookie) return next();
    const headerToken = req.get(csrfHeaderName);
    const cookieToken = cookies[csrfCookieName];
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    return next();
  });

  // Optional: extra headers and CSP override via env
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=15552000; includeSubDomains',
      );
    }
    if (process.env.ENABLE_CSP === 'true') {
      const csp =
        process.env.CSP_HEADER ||
        "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      res.setHeader('Content-Security-Policy', csp);
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('BlogCMS API')
      .setDescription('API documentation for BlogCMS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  // Bind to 0.0.0.0 so the process is reachable inside PaaS containers (e.g., Railway)
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API server is running on http://0.0.0.0:${port}/api`);
  console.log(
    `🏥 Health check available at: http://0.0.0.0:${port}/api/health`,
  );
  if (enableSwagger) {
    console.log(`📚 API docs available at: http://0.0.0.0:${port}/api/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('❌ Failed to start application:', err);
  if (err instanceof Error) {
    console.error('Stack trace:', err.stack);
  }

  // Log environment info for debugging
  console.error('Environment debug info:');
  console.error('- NODE_ENV:', process.env.NODE_ENV);
  console.error('- PORT:', process.env.PORT);
  console.error('- DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.error('- JWT_SECRET present:', !!process.env.JWT_SECRET);

  process.exit(1);
});

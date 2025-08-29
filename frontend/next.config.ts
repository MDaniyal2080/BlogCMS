import type { NextConfig } from "next";

// Derive backend origin from env (fall back to local dev)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
let API_ORIGIN = 'http://localhost:3001';
let BACKEND_HOST = 'localhost';
try {
  const u = new URL(API_URL);
  API_ORIGIN = `${u.protocol}//${u.host}`;
  BACKEND_HOST = u.hostname;
} catch {}

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow common domains plus backend host derived from API URL
    domains: Array.from(new Set([
      'images.unsplash.com',
      'localhost',
      '127.0.0.1',
      BACKEND_HOST,
    ].filter(Boolean))) as string[],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const baseHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    if (process.env.NODE_ENV === 'production') {
      baseHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' });
    }
    return [
      {
        source: '/:path*',
        headers: baseHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

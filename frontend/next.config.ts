import type { NextConfig } from "next";

// Derive backend origin from env.
// In production, do NOT default to localhost when NEXT_PUBLIC_API_URL is unset.
const RAW = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = RAW && RAW.length > 0
  ? RAW
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');
let API_ORIGIN = '';
let BACKEND_HOST = '';
try {
  if (API_URL) {
    const u = new URL(API_URL);
    API_ORIGIN = `${u.protocol}//${u.host}`;
    BACKEND_HOST = u.hostname;
  }
} catch {}

// Netlify's Next.js plugin can sometimes fail to serve the image optimizer route
// (/_next/image) depending on version compatibility. To ensure images always
// render in production on Netlify, disable Next/Image optimization there and
// fall back to native <img> tags.
const IS_NETLIFY = process.env.NETLIFY === 'true' || process.env.NETLIFY === '1';

const nextConfig: NextConfig = {
  images: {
    // Bypass Next.js image optimizer on Netlify to prevent 404s at /_next/image
    unoptimized: IS_NETLIFY,
    formats: ['image/avif', 'image/webp'],
    // Allow common domains plus backend host derived from API URL
    domains: Array.from(new Set([
      'images.unsplash.com',
      'localhost',
      '127.0.0.1',
      BACKEND_HOST,
      'res.cloudinary.com',
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
      // Explicitly allow uploads from the configured backend host
      // Allow uploads from configured backend host when provided
      ...(BACKEND_HOST ? [
        { protocol: 'https' as const, hostname: BACKEND_HOST, pathname: '/uploads/**' },
        { protocol: 'http' as const, hostname: BACKEND_HOST, pathname: '/uploads/**' },
      ] : []),
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
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
    if (!API_ORIGIN) {
      // No backend origin configured: do not rewrite. Requests go to same-origin.
      return [];
    }
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

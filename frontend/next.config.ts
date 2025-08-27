import type { NextConfig } from "next";

const IMG_HOST = process.env.NEXT_PUBLIC_API_HOST;

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 day for optimized images
    domains: ['images.unsplash.com'],
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
      // Optional production host via env NEXT_PUBLIC_API_HOST
      ...(IMG_HOST
        ? [
            {
              protocol: 'https',
              hostname: IMG_HOST,
              pathname: '/uploads/**',
            } as const,
          ]
        : []),
    ],
  },
  async headers() {
    return [
      // Cache Next.js static assets for a year
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Cache optimized images (served from /_next/image)
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      // Cache common static file extensions served from /public
      {
        source: '/:all*(svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Cache sitemap and robots for 10 minutes at the edge
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;

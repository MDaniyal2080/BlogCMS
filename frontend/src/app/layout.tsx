import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from '@/components/public/SettingsContext';
import ToasterProvider from '@/components/system/ToasterProvider';
import TopProgressBar from '@/components/system/TopProgressBar';
import { assetUrl } from '@/lib/assetUrl';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  // Build-safe API URL resolution: avoid localhost fallback in production
  const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
  const API_URL = API_URL_ENV && API_URL_ENV.length > 0
    ? API_URL_ENV
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

  // Optional guard to skip remote fetches during build (configure in CI)
  const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
  const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);

  try {
    const settings: any[] = await (async () => {
      if (!API_URL || DISABLE_BUILD_FETCH) return [] as any[];
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 }, signal: controller.signal });
        if (!res.ok) return [] as any[];
        return await res.json();
      } catch {
        return [] as any[];
      } finally {
        clearTimeout(t);
      }
    })();
    const normalizeKeyName = (key: string) =>
      String(key)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    // Prefer canonical underscore keys (e.g., `site_name`) over legacy variants (e.g., `siteName`)
    const isCanonicalKey = (k: string) => {
      const t = String(k).trim();
      return /^[a-z0-9_]+$/.test(t) && normalizeKeyName(t) === t;
    };
    const map: Record<string, string> = {};
    const quality: Record<string, number> = {};
    (settings || []).forEach((s: any) => {
      if (s && s.key) {
        const nk = normalizeKeyName(s.key);
        if (!nk) return;
        const q = isCanonicalKey(s.key) ? 2 : 1;
        if (map[nk] === undefined || map[nk] === '' || q > (quality[nk] || 0)) {
          map[nk] = s.value;
          quality[nk] = q;
        }
      }
    });

    const title = map.meta_title || map.site_name || 'BlogCMS - Modern Blogging Platform';
    const description = map.meta_description || map.site_description || 'A full-stack blogging platform with comprehensive admin dashboard';
    const keywordsStr = map.meta_keywords || '';
    const keywords = keywordsStr ? keywordsStr.split(',').map((k) => k.trim()).filter(Boolean) : undefined;
    const favicon = map.favicon_url;
    const icon = assetUrl(favicon, API_URL) || undefined;
    const siteUrl = map.site_url && /^https?:\/\//i.test(map.site_url) ? map.site_url : undefined;
    const ogImageCandidate = map.og_image_url || map.site_logo_url || favicon;
    const ogImage = assetUrl(ogImageCandidate, API_URL) || undefined;

    return {
      metadataBase: siteUrl ? new URL(siteUrl) : undefined,
      title,
      description,
      icons: icon ? { icon } : undefined,
      keywords,
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: map.site_name || 'BlogCMS',
        images: ogImage ? [{ url: ogImage } as any] : undefined,
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    } as Metadata;
  } catch {
    return {
      title: 'BlogCMS - Modern Blogging Platform',
      description: 'A full-stack blogging platform with comprehensive admin dashboard',
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build-safe API URL resolution: avoid localhost fallback in production
  const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
  const API_URL = API_URL_ENV && API_URL_ENV.length > 0
    ? API_URL_ENV
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

  const normalizeKeyName = (key: string) =>
    String(key)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  let settingsMap: Record<string, string> = {};
  const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
  const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);
  try {
    const list: any[] = await (async () => {
      if (!API_URL || DISABLE_BUILD_FETCH) return [] as any[];
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), SETTINGS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 }, signal: controller.signal });
        if (!res.ok) return [] as any[];
        return await res.json();
      } catch {
        return [] as any[];
      } finally {
        clearTimeout(t);
      }
    })();
    // Prefer canonical underscore keys over legacy variants
    const isCanonicalKey = (k: string) => {
      const t = String(k).trim();
      return /^[a-z0-9_]+$/.test(t) && normalizeKeyName(t) === t;
    };
    const quality: Record<string, number> = {};
    (list || []).forEach((s: any) => {
      if (s && s.key) {
        const nk = normalizeKeyName(s.key);
        if (!nk) return;
        const q = isCanonicalKey(s.key) ? 2 : 1;
        if (settingsMap[nk] === undefined || settingsMap[nk] === '' || q > (quality[nk] || 0)) {
          settingsMap[nk] = s.value;
          quality[nk] = q;
        }
      }
    });
  } catch {}

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans antialiased`}
      >
        {/* Global top indeterminate progress bar for API requests */}
        <TopProgressBar />
        <SettingsProvider initialSettings={settingsMap}>
          {children}
        </SettingsProvider>
        {/* Global toast notifications */}
        <ToasterProvider />
      </body>
    </html>
  );
}


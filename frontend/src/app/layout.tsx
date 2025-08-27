import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from '@/components/public/SettingsContext';
import ToasterProvider from '@/components/system/ToasterProvider';
import TopProgressBar from '@/components/system/TopProgressBar';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
    const settings = await res.json();
    const normalizeKeyName = (key: string) =>
      String(key)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      if (s && s.key) {
        const nk = normalizeKeyName(s.key);
        if (nk) {
          if (map[nk] === undefined || map[nk] === '') {
            map[nk] = s.value;
          }
        }
      }
    });

    const title = map.meta_title || map.site_name || 'BlogCMS - Modern Blogging Platform';
    const description = map.meta_description || map.site_description || 'A full-stack blogging platform with comprehensive admin dashboard';
    const keywordsStr = map.meta_keywords || '';
    const keywords = keywordsStr ? keywordsStr.split(',').map((k) => k.trim()).filter(Boolean) : undefined;
    const favicon = map.favicon_url;
    const API_BASE = API_URL.replace(/\/?api\/?$/, '');
    const icon = favicon ? (favicon.startsWith('http') ? favicon : `${API_BASE}${favicon}`) : undefined;
    const siteUrl = map.site_url && /^https?:\/\//i.test(map.site_url) ? map.site_url : undefined;
    const ogImageCandidate = map.og_image_url || map.site_logo_url || favicon;
    const ogImage = ogImageCandidate ? (ogImageCandidate.startsWith('http') ? ogImageCandidate : `${API_BASE}${ogImageCandidate}`) : undefined;

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const normalizeKeyName = (key: string) =>
    String(key)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  let settingsMap: Record<string, string> = {};
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
    const settings = await res.json();
    (settings || []).forEach((s: any) => {
      if (s && s.key) {
        const nk = normalizeKeyName(s.key);
        if (nk) {
          if (settingsMap[nk] === undefined || settingsMap[nk] === '') {
            settingsMap[nk] = s.value;
          }
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


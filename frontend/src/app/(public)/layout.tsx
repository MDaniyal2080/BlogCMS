import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { SettingsProvider } from '@/components/public/SettingsContext';
import OfflineBanner from '@/components/system/OfflineBanner';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Build-safe API URL resolution: avoid localhost fallback in production
  const API_URL_ENV = process.env.NEXT_PUBLIC_API_URL?.trim();
  const API_URL = API_URL_ENV && API_URL_ENV.length > 0
    ? API_URL_ENV
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '');

  const normalizeKeyName = (key: string) =>
    key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const DISABLE_BUILD_FETCH = process.env.DISABLE_BUILD_TIME_SETTINGS_FETCH === 'true';
  const SETTINGS_FETCH_TIMEOUT_MS = Number(process.env.SETTINGS_FETCH_TIMEOUT_MS || 4000);

  let settingsMap: Record<string, string> = {};
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
  } catch (e) {
    // ignore, render with defaults
  }

  return (
    <SettingsProvider initialSettings={settingsMap}>
      <div className="sticky top-0 z-[60]">
        <OfflineBanner />
      </div>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </SettingsProvider>
  );
}



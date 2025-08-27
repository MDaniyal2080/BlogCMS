import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { SettingsProvider } from '@/components/public/SettingsContext';
import OfflineBanner from '@/components/system/OfflineBanner';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const normalizeKeyName = (key: string) =>
    key
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


'use client';

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { assetUrlFromApiBase } from '@/lib/assetUrl';

export type SettingsMap = Record<string, string>;

type SettingsContextValue = {
  settings: SettingsMap;
  apiBase: string;
  get: (key: string, fallback?: string) => string;
  assetUrl: (url?: string) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  initialSettings = {},
  children,
}: {
  initialSettings?: SettingsMap;
  children: React.ReactNode;
}) {
  // Compute API base origin from env; avoid defaulting to localhost in production when unset
  const API_BASE = useMemo(() => {
    const rawEnv = process.env.NEXT_PUBLIC_API_URL;
    if (typeof rawEnv === 'string') {
      const given = rawEnv.trim();
      if (!given) return '';
      return given.replace(/\/?api\/?$/, '').replace(/\/+$/, '');
    }
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
  }, []);

  const normalizeKeyName = (key: string) =>
    String(key)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const isCanonicalKey = (k: string) => {
    const t = String(k).trim();
    return /^[a-z0-9_]+$/.test(t) && normalizeKeyName(t) === t;
  };

  // Normalize provided settings so consumers can rely on underscored keys
  const initialNormalized: SettingsMap = useMemo(() => {
    const map: SettingsMap = {};
    const quality: Record<string, number> = {};
    Object.entries(initialSettings).forEach(([k, v]) => {
      const nk = normalizeKeyName(k);
      if (!nk) return;
      const q = isCanonicalKey(k) ? 2 : 1;
      if (map[nk] === undefined || map[nk] === '' || q > (quality[nk] || 0)) {
        map[nk] = v;
        quality[nk] = q;
      }
    });
    return map;
  }, [initialSettings]);

  const [settings, setSettings] = useState<SettingsMap>(initialNormalized);

  // Client-side hydration: fetch latest settings after mount to reflect admin changes even when SSR skipped
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    (async () => {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal });
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        const next: SettingsMap = {};
        const quality: Record<string, number> = {};
        for (const s of list) {
          if (s && s.key) {
            const nk = normalizeKeyName(s.key);
            if (!nk) continue;
            const q = isCanonicalKey(s.key) ? 2 : 1;
            if (next[nk] === undefined || next[nk] === '' || q > (quality[nk] || 0)) {
              next[nk] = s.value;
              quality[nk] = q;
            }
          }
        }
        if (!aborted && Object.keys(next).length) {
          setSettings((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(t);
      }
    })();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const get = (key: string, fallback = '') => {
      if (key in settings) return settings[key];
      const nk = normalizeKeyName(key);
      if (nk in settings) return settings[nk];
      return fallback;
    };
    const assetUrl = (url?: string) => assetUrlFromApiBase(url, API_BASE);
    return { settings, apiBase: API_BASE, get, assetUrl };
  }, [API_BASE, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

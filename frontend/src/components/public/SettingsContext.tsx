'use client';

import React, { createContext, useContext, useMemo } from 'react';

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
  const API_BASE = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return raw.replace(/\/?api\/?$/, '');
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const normalizeKeyName = (key: string) =>
      String(key)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    // Normalize provided settings so consumers can rely on underscored keys
    const normalized: SettingsMap = {};
    Object.entries(initialSettings).forEach(([k, v]) => {
      const nk = normalizeKeyName(k);
      if (nk && (normalized[nk] === undefined || normalized[nk] === '')) {
        normalized[nk] = v;
      }
    });

    const get = (key: string, fallback = '') => {
      // try exact, normalized, then fallback
      if (key in normalized) return normalized[key];
      const nk = normalizeKeyName(key);
      if (nk in normalized) return normalized[nk];
      return fallback;
    };
    const assetUrl = (url?: string) => {
      if (!url) return '';
      if (/^(https?:)?\/\//i.test(url)) return url;
      if (url.startsWith('data:')) return url;
      return `${API_BASE}${url}`;
    };
    return { settings: normalized, apiBase: API_BASE, get, assetUrl };
  }, [API_BASE, initialSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

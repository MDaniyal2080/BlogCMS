'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, ServerOff } from 'lucide-react';

/**
 * OfflineBanner
 * - Shows when the browser is offline (navigator.onLine === false)
 * - Also shows when the API becomes unreachable (network errors caught by axios interceptor)
 * - Listens to custom window events: 'api:unreachable' and 'api:recovered'
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [apiUnreachable, setApiUnreachable] = useState<boolean>(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    if (typeof window !== 'undefined') {
      // Initialize after mount to avoid SSR/client hydration mismatch
      setIsOffline(!navigator.onLine);
      window.addEventListener('offline', onOffline);
      window.addEventListener('online', onOnline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('online', onOnline);
      }
    };
  }, []);

  useEffect(() => {
    const onUnreachable = () => setApiUnreachable(true);
    const onRecovered = () => setApiUnreachable(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('api:unreachable', onUnreachable as EventListener);
      window.addEventListener('api:recovered', onRecovered as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('api:unreachable', onUnreachable as EventListener);
        window.removeEventListener('api:recovered', onRecovered as EventListener);
      }
    };
  }, []);

  const retryCheck = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API}/settings`, { cache: 'no-store' });
      if (res.ok) {
        setApiUnreachable(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('api:recovered'));
        }
      }
    } catch {
      // ignore; banner stays visible
    } finally {
      setChecking(false);
    }
  }, [checking]);

  if (!isOffline && !apiUnreachable) return null;

  const variant = isOffline ? 'offline' : 'server';
  const bg = variant === 'offline' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-red-100 text-red-900 border-red-200';
  const Icon = variant === 'offline' ? WifiOff : ServerOff;
  const title = variant === 'offline' ? 'You are offline' : "Can't reach server";
  const message = variant === 'offline'
    ? 'Some actions may be unavailable until your connection is restored.'
    : 'We will retry automatically. You can also try manually.';

  return (
    <div className={`w-full border-b shadow-sm animate-drop-in ${bg}`} role="status" aria-live="polite">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <div className="flex-1">
          <span className="font-medium mr-2">{title}</span>
          <span className="opacity-90">{message}</span>
        </div>
        {variant === 'server' && (
          <button
            type="button"
            onClick={retryCheck}
            disabled={checking}
            className="inline-flex items-center rounded border px-2 py-1 text-xs font-medium hover:bg-white/50 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}

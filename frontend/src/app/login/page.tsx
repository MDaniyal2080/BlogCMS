'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { profileAPI } from '@/lib/api';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ensure the server-set HttpOnly cookie is accepted before navigating
  const ensureAuthReady = async (retries = 5): Promise<boolean> => {
    try {
      await profileAPI.getMe();
      return true;
    } catch {
      if (retries <= 0) return false;
      await new Promise((r) => setTimeout(r, 200));
      return ensureAuthReady(retries - 1);
    }
  };

  // If we got bounced to /login?callbackUrl=... but cookies are now present,
  // auto-finish the navigation without requiring a manual refresh.
  // Only needed in cookie mode.
  const SEND_CREDENTIALS = process.env.NEXT_PUBLIC_SEND_CREDENTIALS === 'true';
  const cbUrl = searchParams.get('callbackUrl') || '/admin';
  
  const maybeAutoFinish = async () => {
    if (!SEND_CREDENTIALS) return;
    if (!cbUrl) return;
    // If user cookie exists, we likely already have auth; still probe the API to be sure
    if (auth.isAuthenticated()) {
      const ok = await ensureAuthReady(10);
      if (ok && typeof window !== 'undefined') {
        window.location.replace(cbUrl);
      }
    }
  };

  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void maybeAutoFinish(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await auth.login(email, password, rememberMe);
    
    if (result.success) {
      const callbackUrl = searchParams.get('callbackUrl') || '/admin';
      const SEND_CREDENTIALS = process.env.NEXT_PUBLIC_SEND_CREDENTIALS === 'true';
      if (SEND_CREDENTIALS) {
        // Probe the backend to make sure the cookie is recognized, then hard navigate
        await ensureAuthReady();
        if (typeof window !== 'undefined') {
          window.location.replace(callbackUrl);
          return;
        }
      }
      // Token mode can safely use client-side navigation
      router.replace(callbackUrl);
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="rememberMe" className="text-sm">Remember me</label>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link href="/" className="text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


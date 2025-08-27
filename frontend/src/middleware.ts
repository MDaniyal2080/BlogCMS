import { NextResponse, NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get('token')?.value;
  const userCookie = req.cookies.get('user')?.value;
  let role: 'admin' | 'editor' | undefined;
  if (userCookie) {
    try {
      const parsed = JSON.parse(userCookie);
      role = parsed?.role;
    } catch {}
  }

  // Helper: check token expiry from JWT payload (best-effort)
  const isExpired = (() => {
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const normalized = pad ? base64 + '='.repeat(4 - pad) : base64;
      const json = JSON.parse(atob(normalized));
      return json?.exp ? Date.now() >= json.exp * 1000 : false;
    } catch {
      return false;
    }
  })();

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    if (!token || isExpired) {
      const loginUrl = new URL('/login', req.url);
      // Preserve intended path to return after login
      loginUrl.searchParams.set('callbackUrl', pathname + search);
      const res = NextResponse.redirect(loginUrl);
      // Clear stale cookies if expired or missing
      res.cookies.set('token', '', { expires: new Date(0) });
      res.cookies.set('user', '', { expires: new Date(0) });
      return res;
    }

    // Role-based gating for admin-only pages
    const isAdminOnly = pathname.startsWith('/admin/settings');
    if (isAdminOnly && role !== 'admin') {
      // Redirect non-admins to admin home
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    return NextResponse.next();
  }

  // If user is already authenticated, redirect /login to /admin
  if (pathname === '/login' && token && !isExpired) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};

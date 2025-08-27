'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/public/SettingsContext';
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Tags, 
  Settings, 
  User,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import OfflineBanner from '@/components/system/OfflineBanner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { get, assetUrl } = useSettings();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const siteName = get('site_name', 'BlogCMS');
  const logoRaw = get('site_logo') || get('logo') || '';
  const logoUrl = assetUrl(logoRaw);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Avoid SSR/client mismatch by deferring any cookie-based reads until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure the mobile sidebar overlay never lingers and blocks content:
  // - Close it on route changes
  // - Close it when viewport is resized to desktop (>= lg)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Body scroll lock while sidebar is open (mobile)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    if (isSidebarOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      // Move focus to the sidebar for accessibility
      asideRef.current?.focus();
    } else {
      document.documentElement.style.overflow = prevHtmlOverflow || '';
      document.body.style.overflow = prevBodyOverflow || '';
    }
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow || '';
      document.body.style.overflow = prevBodyOverflow || '';
    };
  }, [isSidebarOpen]);

  // Close on Escape and return focus to toggle
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        // Slight delay to ensure element is visible before focusing
        setTimeout(() => toggleRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  const handleLogout = () => {
    auth.logout();
  };

  const user = mounted ? auth.getUser() : null;
  const role: 'admin' | 'editor' | undefined =
    user?.role === 'admin' || user?.role === 'editor' ? user.role : undefined;

  const menuItems: Array<{
    href: string;
    icon: LucideIcon;
    label: string;
    roles?: Array<'admin' | 'editor'>;
  }> = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'editor'] },
    { href: '/admin/posts', icon: FileText, label: 'Posts', roles: ['admin', 'editor'] },
    { href: '/admin/categories', icon: FolderOpen, label: 'Categories', roles: ['admin', 'editor'] },
    { href: '/admin/tags', icon: Tags, label: 'Tags', roles: ['admin', 'editor'] },
    { href: '/admin/comments', icon: MessageSquare, label: 'Comments', roles: ['admin'] },
    { href: '/admin/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
    { href: '/admin/profile', icon: User, label: 'Profile', roles: ['admin', 'editor'] },
  ];

  const visibleMenu = mounted
    ? menuItems.filter((item) => !item.roles || (role ? item.roles.includes(role) : false))
    : [];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const toTitle = (s: string) => s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const pathNoQuery = (pathname || '/admin').split('?')[0];
  const segments = pathNoQuery.split('/').filter(Boolean);

  // Accessibility props for the sidebar: treat as dialog on mobile when open
  const asideA11yProps = isSidebarOpen
    ? ({ role: 'dialog', 'aria-modal': true } as const)
    : ({ role: 'navigation' } as const);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        aria-label="Sidebar navigation"
        {...asideA11yProps}
        ref={asideRef}
        tabIndex={-1}
        className={cn(
          'w-64 border-r h-full transform transition-transform duration-200 z-50 lg:static lg:translate-x-0 bg-white text-gray-900 shadow-xl',
          isSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight"
              onClick={() => setIsSidebarOpen(false)}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={`${siteName} logo`} className="h-8 w-auto rounded-sm" />
              ) : null}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text">{siteName} Admin</span>
            </Link>
          </div>
          <nav className="p-4 flex-1 overflow-y-auto">
            {visibleMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors border border-transparent hover:bg-gray-100',
                  isActive(item.href) && 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay to close sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" aria-hidden={isSidebarOpen || undefined}>
        {/* Network/Server status banner */}
        <div className="sticky top-0 z-30">
          <OfflineBanner />
        </div>
        {/* Top Header with hamburger, breadcrumbs, and user menu */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Toggle navigation"
              aria-expanded={isSidebarOpen}
              aria-controls="admin-sidebar"
              ref={toggleRef}
              onClick={() => setIsSidebarOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link href="/admin" className={cn('hover:underline', segments.length === 1 && 'text-foreground font-medium pointer-events-none')}>
                Admin
              </Link>
              {segments.slice(1).map((seg, i) => {
                const href = '/' + segments.slice(0, i + 2).join('/');
                const isLast = i === segments.slice(1).length - 1;
                const label = toTitle(seg);
                return (
                  <span key={href} className="flex items-center">
                    <ChevronRight className="mx-1 h-4 w-4" />
                    {isLast ? (
                      <span className="text-foreground font-medium" aria-current="page">{label}</span>
                    ) : (
                      <Link href={href} className="hover:underline">{label}</Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
          {/* User menu */}
          <div className="relative" tabIndex={0} onBlur={() => setUserMenuOpen(false)}>
            <Button variant="ghost" onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{mounted ? (user?.name || 'User') : 'User'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-md border bg-white  text-foreground shadow-2xl ring-1 ring-black/5 p-1 z-[100]"
                role="menu"
                aria-orientation="vertical"
                aria-label="User menu"
              >
                <Link href="/admin/profile" className="block px-3 py-2 rounded-sm hover:bg-muted focus:bg-muted text-sm" onClick={() => setUserMenuOpen(false)}>
                  Profile
                </Link>
                {role === 'admin' && (
                  <Link href="/admin/settings" className="block px-3 py-2 rounded-sm hover:bg-muted focus:bg-muted text-sm" onClick={() => setUserMenuOpen(false)}>
                    Settings
                  </Link>
                )}
                <button className="w-full text-left block px-3 py-2 rounded-sm hover:bg-muted focus:bg-muted text-sm" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Search, Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/components/public/SettingsContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { settings, assetUrl } = useSettings();

  const siteName = settings.site_name || 'BlogCMS';
  const tagline = settings.site_tagline || '';
  const logoUrl = assetUrl(settings.site_logo_url);

  const social = [
    { key: 'facebook_url', Icon: Facebook },
    { key: 'twitter_url', Icon: Twitter },
    { key: 'instagram_url', Icon: Instagram },
    { key: 'linkedin_url', Icon: Linkedin },
    { key: 'github_url', Icon: Github },
  ] as const;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-8 rounded" />
            ) : (
              <span className="text-2xl font-bold text-primary">{siteName}</span>
            )}
            {tagline && (
              <span className="hidden sm:block text-xs text-muted-foreground">{tagline}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Social (desktop) */}
            <div className="hidden md:flex items-center space-x-2">
              {social.map(({ key, Icon }) => {
                const href = settings[key];
                if (!href) return null;
                return (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
            {/* Search */}
            <div className="hidden md:flex items-center">
              {isSearchOpen ? (
                <div className="flex items-center space-x-2">
                  <Input
                    type="search"
                    placeholder="Search posts..."
                    className="w-64"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Admin Link */}
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t">
                <Input
                  type="search"
                  placeholder="Search posts..."
                  className="w-full"
                />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}


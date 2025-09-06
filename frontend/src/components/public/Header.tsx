'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, Search, Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/components/public/SettingsContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { settings, assetUrl } = useSettings();
  const [logoError, setLogoError] = useState(false);

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
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="text-xl sm:text-2xl font-bold">
            {logoUrl && !logoError ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={32}
                height={32}
                className="h-8 w-8 rounded"
                priority
                unoptimized
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-2xl font-bold text-primary">{siteName}</span>
            )}
            {tagline && (
              <span className="hidden sm:block text-xs text-muted-foreground ml-2">{tagline}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link href="/" className="hover:text-primary transition-colors text-sm lg:text-base">Home</Link>
            <Link href="/blog" className="hover:text-primary transition-colors text-sm lg:text-base">Blog</Link>
            <Link href="/about" className="hover:text-primary transition-colors text-sm lg:text-base">About</Link>
            <Link href="/contact" className="hover:text-primary transition-colors text-sm lg:text-base">Contact</Link>
          </nav>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-sm">
            <nav className="container mx-auto px-4 py-4">
              <div className="flex flex-col space-y-3">
                <Link 
                  href="/" 
                  className="block py-3 px-2 hover:text-primary transition-colors text-base"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-3 px-2 hover:text-primary transition-colors text-base"
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
          </div>
        )}
      </div>
    </header>
  );
}


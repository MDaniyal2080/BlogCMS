'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, Github, Linkedin } from 'lucide-react';
import { useSettings } from '@/components/public/SettingsContext';
import { useEffect, useState } from 'react';
import { categoriesAPI } from '@/lib/api';
import type { Category } from '@/types';

export default function Footer() {
  const { settings } = useSettings();
  const siteName = settings.site_name || 'BlogCMS';
  const siteDesc = settings.site_description || 'A modern blogging platform built with Next.js and NestJS.';
  const social = [
    { key: 'facebook_url', Icon: Facebook },
    { key: 'twitter_url', Icon: Twitter },
    { key: 'instagram_url', Icon: Instagram },
    { key: 'linkedin_url', Icon: Linkedin },
    { key: 'github_url', Icon: Github },
  ] as const;
  const contactEmail = settings.contact_email;
  const contactPhone = settings.contact_phone;
  const contactAddress = settings.contact_address;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(res.data as Category[]);
      } catch (e) {
        console.error('Failed to load footer categories', e);
      } finally {
        setLoadingCats(false);
      }
    };
    run();
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* About */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{siteName}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{siteDesc}</p>
            {(contactEmail || contactPhone || contactAddress) && (
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {contactEmail && (
                  <li>
                    <a className="hover:text-primary" href={`mailto:${contactEmail}`}>{contactEmail}</a>
                  </li>
                )}
                {contactPhone && <li>{contactPhone}</li>}
                {contactAddress && <li>{contactAddress}</li>}
              </ul>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Categories</h4>
            {loadingCats ? (
              <ul className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="h-4 w-32 bg-muted animate-pulse rounded" />
                ))}
              </ul>
            ) : categories.length ? (
              <ul className="space-y-2">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/blog/category/${cat.slug}`} className="text-sm text-muted-foreground hover:text-primary">
                      {cat.name} {typeof cat.postCount === 'number' ? `(${cat.postCount})` : ''}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            )}
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Follow Us</h4>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {social.map(({ key, Icon }) => {
                const href = settings[key];
                if (!href) return null;
                return (
                  <a key={key} href={href} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}


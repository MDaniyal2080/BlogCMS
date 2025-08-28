'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BlogCard from '@/components/public/BlogCard';
import { Button } from '@/components/ui/button';
import { postsAPI, newsletterAPI } from '@/lib/api';
import { Post } from '@/types';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { useSettings } from '@/components/public/SettingsContext';
import CategoriesWidget from '@/components/public/CategoriesWidget';

export default function HomePageClient() {
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState<string | null>(null);
  const [subscribeErr, setSubscribeErr] = useState<string | null>(null);
  const { settings } = useSettings();
  const siteName = settings.site_name || 'BlogCMS';
  const heroTitle = settings.home_hero_title || `Welcome to ${siteName}`;
  const heroSubtitle =
    settings.home_hero_subtitle || settings.site_tagline || 'Discover amazing stories, insights, and ideas from our community of writers.';

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPosts = async () => {
    try {
      const featuredCount = Math.max(0, parseInt(settings.featured_posts_count || '3', 10) || 3);
      const recentCount = Math.max(1, parseInt(settings.posts_per_page || '9', 10) || 9);

      let featured: Post[] = [];
      if (featuredCount > 0) {
        const featuredRes = await postsAPI.getAll({
          limit: featuredCount,
          published: true,
          featured: true,
          sortBy: 'publishedAt',
          sortOrder: 'desc',
        });
        featured = featuredRes.data as Post[];
      }
      setFeaturedPosts(featured);

      const excludeIds = featured.map((p) => p.id);
      const recentRes = await postsAPI.getAll({
        limit: recentCount,
        published: true,
        excludeIds: excludeIds.length ? excludeIds.join(',') : undefined,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
      setRecentPosts(recentRes.data as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeMsg(null);
    setSubscribeErr(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSubscribeErr('Please enter a valid email address.');
      return;
    }
    try {
      setSubscribing(true);
      await newsletterAPI.subscribe({ email: trimmed, honeypot });
      setSubscribeMsg('Thanks for subscribing!');
      setEmail('');
      setHoneypot('');
    } catch (err: any) {
      setSubscribeErr(err?.response?.data?.message || 'Subscription failed. Please try again later.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">{heroTitle}</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{heroSubtitle}</p>
            <div className="flex gap-4 justify-center">
              <Link href="/blog">
                <Button size="lg">
                  Explore Articles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg">Learn More</Button>
              </Link>
            </div>
          </section>

          {/* Featured Posts */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Featured Posts</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: Math.max(1, parseInt(settings.featured_posts_count || '3', 10) || 3) }).map((_, i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Posts */}
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Recent Posts</h2>
              <Link href="/blog">
                <Button variant="ghost">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: Math.max(1, parseInt(settings.posts_per_page || '9', 10) || 9) }).map((_, i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>

          {/* Categories Widget */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Categories</h2>
            <CategoriesWidget limit={12} />
          </section>

          {/* Newsletter Section */}
          <section className="bg-muted rounded-lg p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Subscribe to our newsletter and never miss our latest articles and updates.
            </p>
            <form className="flex gap-4 max-w-md mx-auto" onSubmit={onSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-md border bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {/* Honeypot */}
              <input
                type="text"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
              <Button type="submit" disabled={subscribing}>{subscribing ? 'Subscribing…' : 'Subscribe'}</Button>
            </form>
            {subscribeMsg && (
              <p className="text-sm text-green-600 mt-3">{subscribeMsg}</p>
            )}
            {subscribeErr && (
              <p className="text-sm text-red-600 mt-3">{subscribeErr}</p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

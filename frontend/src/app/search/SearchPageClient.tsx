'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BlogCard from '@/components/public/BlogCard';
import { postsAPI } from '@/lib/api';
import { Post } from '@/types';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import SearchBar from '@/components/public/SearchBar';

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query) {
      searchPosts(query);
    }
  }, [query]);

  const searchPosts = async (searchQuery: string) => {
    try {
      setLoading(true);
      setSearched(true);
      const response = await postsAPI.search(searchQuery);
      setPosts(response.data);
    } catch (error) {
      console.error('Error searching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl font-bold mb-6 text-center">Search Posts</h1>
            <SearchBar />
          </div>

          {query && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">
                {loading ? (
                  'Searching...'
                ) : (
                  <>
                    Search results for{' '}
                    <span className="text-primary">&quot;{query}&quot;</span>
                    <span className="text-muted-foreground ml-2">
                      ({posts.length} {posts.length === 1 ? 'result' : 'results'})
                    </span>
                  </>
                )}
              </h2>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : searched && posts.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-6">
                Try searching with different keywords
              </p>
              <Link href="/blog">
                <Button>Browse All Posts</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {!query && !searched && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Start searching</h3>
              <p className="text-muted-foreground">
                Enter keywords to find posts
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

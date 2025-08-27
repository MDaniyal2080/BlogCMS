'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  target?: 'search' | 'blog'; // default 'search'
  placeholder?: string;
}

export default function SearchBar({ target = 'search', placeholder = 'Search posts...' }: Props) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (target === 'blog') {
        const params = new URLSearchParams(searchParams?.toString());
        params.set('q', query.trim());
        params.delete('page');
        router.push(`/blog?${params.toString()}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="absolute right-0 top-0 h-full px-3"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}

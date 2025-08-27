 'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDate, truncate, readingTime } from '@/lib/utils';
import { Post } from '@/types';
import { Calendar, Clock, Eye } from 'lucide-react';
import { useSettings } from '@/components/public/SettingsContext';

interface BlogCardProps {
  post: Post;
  highlight?: string;
}

export default function BlogCard({ post, highlight }: BlogCardProps) {
  const { settings } = useSettings();
  const tz = settings.timezone || 'UTC';
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
  const imgSrc = post.featuredImage && (post.featuredImage.startsWith('http') ? post.featuredImage : `${API_BASE}${post.featuredImage}`);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const renderHighlighted = (text: string, q?: string) => {
    if (!q) return text;
    const words = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (!words.length) return text;
    const re = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(re);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? (
        <mark key={idx} className="bg-yellow-200 dark:bg-yellow-900/40 rounded px-0.5">{part}</mark>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-[2px] hover:shadow-lg">
      {imgSrc && (
        <div className="relative w-full h-48">
          <Image
            src={imgSrc}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex flex-wrap gap-2 mb-2">
          {post.categories?.map((category) => (
            <Link
              key={category.id}
              href={`/blog/category/${category.slug}`}
              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
            >
              {category.name}
            </Link>
          ))}
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-xl font-semibold hover:text-primary transition-colors">
            {renderHighlighted(post.title, highlight)}
          </h2>
        </Link>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {renderHighlighted(truncate(post.excerpt || post.content, 150), highlight)}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(post.publishedAt || post.createdAt, { timeZone: tz })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime(post.content)} min read
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {post.viewCount || 0}
        </span>
      </CardFooter>
    </Card>
  );
}


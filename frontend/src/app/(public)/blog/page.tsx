import { Suspense } from 'react';
import BlogPageClient from './BlogPageClient';

export default function BlogPage() {
  return (
    <Suspense fallback={null}>
      <BlogPageClient />
    </Suspense>
  );
}

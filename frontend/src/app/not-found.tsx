import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-xl text-center">
        <SearchX className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" onClick={() => (typeof window !== 'undefined' ? window.history.back() : null)}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}

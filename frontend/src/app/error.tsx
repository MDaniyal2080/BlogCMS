'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for debugging/telemetry
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-20" role="alert" aria-live="assertive">
      <div className="mx-auto max-w-xl text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. You can try again, or go back to the homepage.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-muted-foreground/80">Error reference: {error.digest}</p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

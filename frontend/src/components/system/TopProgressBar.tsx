"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * TopProgressBar
 * - Listens to custom events: 'api:request-start' and 'api:request-end'
 * - Shows a thin top bar while there are pending requests (reference counted)
 * - Uses slight delay to avoid flicker for very fast requests
 */
export default function TopProgressBar() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimeout = useRef<number | null>(null);

  useEffect(() => {
    const onStart = () => {
      setPending((p) => p + 1);
      // show quickly
      setVisible(true);
      if (hideTimeout.current) {
        window.clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
    const onEnd = () => {
      setPending((p) => Math.max(0, p - 1));
    };

    window.addEventListener("api:request-start", onStart as EventListener);
    window.addEventListener("api:request-end", onEnd as EventListener);
    return () => {
      window.removeEventListener("api:request-start", onStart as EventListener);
      window.removeEventListener("api:request-end", onEnd as EventListener);
    };
  }, []);

  useEffect(() => {
    if (pending === 0) {
      // Delay hiding slightly for smoother UX
      hideTimeout.current = window.setTimeout(() => setVisible(false), 150) as unknown as number;
    }
  }, [pending]);

  const progressClass = useMemo(() => {
    // Use indeterminate animation when visible
    return visible ? "opacity-100" : "opacity-0 pointer-events-none";
  }, [visible]);

  return (
    <div className={`fixed top-0 left-0 right-0 z-[70] h-0.5 transition-opacity duration-200 ${progressClass}`} aria-hidden={!visible}>
      <div className="h-full w-1/3 bg-primary animate-progress rounded-r-sm shadow-[0_0_6px_theme(colors.primary.DEFAULT)]" />
    </div>
  );
}

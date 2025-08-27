"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className:
          "rounded-md bg-background text-foreground border border-border shadow-lg",
        success: {
          className:
            "rounded-md bg-[hsl(var(--color-success)/0.08)] text-foreground border border-[hsl(var(--color-success)/0.3)]",
          iconTheme: {
            primary: "hsl(var(--color-success))",
            secondary: "hsl(var(--color-success-foreground))",
          },
        },
        error: {
          className:
            "rounded-md bg-[hsl(var(--color-destructive)/0.08)] text-foreground border border-[hsl(var(--color-destructive)/0.3)]",
          iconTheme: {
            primary: "hsl(var(--color-destructive))",
            secondary: "hsl(var(--color-destructive-foreground))",
          },
        },
      }}
    />
  );
}

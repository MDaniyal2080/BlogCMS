import React from 'react';
import type { Components } from 'react-markdown';
import { createLowlight, common } from 'lowlight';
import { assetUrl } from '@/lib/assetUrl';

// Lowlight instance with common grammars
const lowlight = createLowlight(common);

// Minimal HAST types for rendering highlighted code
type HastText = { type: 'text'; value: string };
type HastElement = {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};
type HastNode = HastText | HastElement;

interface LowlightLike {
  highlight: (lang: string, code: string) => { children: HastNode[] };
  highlightAuto?: (code: string) => { children: HastNode[] };
}

// Render lowlight HAST nodes as React elements
function renderHast(node: HastNode | HastNode[] | null | undefined, key?: React.Key): React.ReactNode {
  if (!node) return null;
  if (Array.isArray(node)) return node.map((n: HastNode, i: number) => renderHast(n, i));
  if (node.type === 'text') return node.value;
  if (node.type === 'element') {
    const props: React.Attributes & Record<string, unknown> = { key, ...(node.properties || {}) };
    const children = (node.children || []).map((c: HastNode, i: number) => renderHast(c, i));
    return React.createElement(node.tagName, props, children);
  }
  return null;
}

// ReactMarkdown custom components (typed for v9)
export const markdownComponents: Components = {
  code(props: React.HTMLAttributes<HTMLElement> & {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) {
    const { className, children, inline, ...rest } = props;
    const code = String(children ?? '').replace(/\n$/, '');
    if (inline) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    const match = /language-(\w+)/.exec(className || '');
    try {
      const ll = lowlight as unknown as LowlightLike;
      const tree = match?.[1]
        ? ll.highlight(match[1], code).children
        : ll.highlightAuto
          ? ll.highlightAuto(code).children
          : [];
      return (
        <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
          <code className={className}>{renderHast(tree)}</code>
        </pre>
      );
    } catch {
      return (
        <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
          <code className={className}>{code}</code>
        </pre>
      );
    }
  },
  a({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...props}
        rel={isExternal ? 'nofollow noopener noreferrer' : props.rel}
        target={isExternal ? '_blank' : props.target}
      >
        {children}
      </a>
    );
  },
  img({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
    const normalized = typeof src === 'string' ? assetUrl(src) : undefined;
    return (
      // Use native img for markdown content; Next/Image is not necessary here
      <img
        src={normalized}
        alt={typeof alt === 'string' ? alt : ''}
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  },
};

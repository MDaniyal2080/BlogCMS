// Lightweight client-side HTML sanitizer for rendering trusted content safely in the browser.
// This is a defense-in-depth layer. Server-side sanitization is also performed.
import { assetUrl } from './assetUrl';
export function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined') return String(input || '');
  if (!input) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(input), 'text/html');

    const blockedTags = new Set([
      'script',
      'iframe',
      'object',
      'embed',
      'link',
      'meta',
      'style',
      'base',
      'form',
    ]);

    const walk = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (blockedTags.has(tag)) {
        el.remove();
        return;
      }

      // Remove dangerous attributes
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === 'style' || name === 'srcdoc') {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === 'href' || name === 'src') {
          const lower = value.toLowerCase();
          const isJs = lower.startsWith('javascript:');
          const isData = lower.startsWith('data:');
          const allowedDataImg = name === 'src' && /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(lower);
          const isHttp = lower.startsWith('http:') || lower.startsWith('https:') || lower.startsWith('//');
          if (isJs || (isData && !allowedDataImg) || (!isHttp && !allowedDataImg && !lower.startsWith('#') && !lower.startsWith('/'))) {
            el.removeAttribute(attr.name);
            continue;
          }
        }
      }

      // Normalize embedded asset URLs for images to avoid legacy /api//uploads and duplicate slashes.
      // Only touch <img src> and known asset-like paths to avoid rewriting internal links.
      if (tag === 'img' && el.hasAttribute('src')) {
        const original = (el.getAttribute('src') || '').trim();
        if (original) {
          // If it's an uploads path (with or without legacy /api) OR any absolute URL, normalize via assetUrl
          if (/^\/?(?:api\/+)?uploads\//i.test(original) || /^(https?:)?\/\//i.test(original)) {
            const fixed = assetUrl(original);
            if (fixed && fixed !== original) {
              el.setAttribute('src', fixed);
            }
          }
        }
      }

      for (const child of Array.from(el.children)) walk(child);
    };

    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      walk(el as Element);
    }

    return doc.body.innerHTML;
  } catch {
    // In case DOMParser fails, fall back to plain text escape.
    const txt = document.createElement('div');
    txt.innerText = String(input);
    return txt.innerHTML;
  }
}


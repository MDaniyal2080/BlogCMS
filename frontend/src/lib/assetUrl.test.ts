import { describe, it, expect } from 'vitest';
import { normalizeAssetPath, apiBaseFromRaw, assetUrlFromApiBase, assetUrl } from '@/lib/assetUrl';

describe('normalizeAssetPath', () => {
  it('keeps http/https, protocol-relative, and data URLs as-is', () => {
    expect(normalizeAssetPath('http://a/b.png')).toBe('http://a/b.png');
    expect(normalizeAssetPath('https://a/b.png')).toBe('https://a/b.png');
    expect(normalizeAssetPath('//cdn.example.com/img.png')).toBe('//cdn.example.com/img.png');
    const data = 'data:image/png;base64,abc';
    expect(normalizeAssetPath(data)).toBe(data);
  });

  it('normalizes relative paths and strips legacy /api for uploads', () => {
    expect(normalizeAssetPath('uploads/x.png')).toBe('/uploads/x.png');
    expect(normalizeAssetPath('/uploads/x.png')).toBe('/uploads/x.png');
    expect(normalizeAssetPath('/api/uploads/x.png')).toBe('/uploads/x.png');
    expect(normalizeAssetPath('')).toBe('');
  });
});

describe('apiBaseFromRaw', () => {
  it('derives base from provided raw values', () => {
    expect(apiBaseFromRaw('http://localhost:3001/api')).toBe('http://localhost:3001');
    expect(apiBaseFromRaw('https://api.example.com/api/')).toBe('https://api.example.com');
    expect(apiBaseFromRaw('https://api.example.com/')).toBe('https://api.example.com');
    expect(apiBaseFromRaw('https://api.example.com')).toBe('https://api.example.com');
  });

  it('returns empty string for empty raw', () => {
    expect(apiBaseFromRaw('')).toBe('');
    expect(apiBaseFromRaw('   ')).toBe('');
  });
});

describe('assetUrlFromApiBase', () => {
  it('returns unchanged for absolute and data URLs', () => {
    expect(assetUrlFromApiBase('https://a/b.png', 'https://api.example.com')).toBe('https://a/b.png');
    const data = 'data:image/png;base64,abc';
    expect(assetUrlFromApiBase(data, 'https://api.example.com')).toBe(data);
  });

  it('joins base and normalized path when base provided', () => {
    expect(assetUrlFromApiBase('uploads/x.png', 'https://api.example.com')).toBe('https://api.example.com/uploads/x.png');
    expect(assetUrlFromApiBase('/api/uploads/x.png', 'https://api.example.com')).toBe('https://api.example.com/uploads/x.png');
  });

  it('returns normalized relative when base empty', () => {
    expect(assetUrlFromApiBase('uploads/x.png', '')).toBe('/uploads/x.png');
    expect(assetUrlFromApiBase('/api/uploads/x.png', '')).toBe('/uploads/x.png');
  });
});

describe('assetUrl', () => {
  it('uses provided rawApiUrl when given', () => {
    expect(assetUrl('uploads/x.png', 'http://localhost:3001/api')).toBe('http://localhost:3001/uploads/x.png');
    expect(assetUrl('/api/uploads/x.png', 'https://api.example.com/api')).toBe('https://api.example.com/uploads/x.png');
  });

  it('returns normalized relative when rawApiUrl empty', () => {
    expect(assetUrl('uploads/x.png', '')).toBe('/uploads/x.png');
  });

  it('passes through absolute and data URLs', () => {
    expect(assetUrl('https://a/b.png', 'https://api.example.com/api')).toBe('https://a/b.png');
    const data = 'data:image/png;base64,abc';
    expect(assetUrl(data, 'https://api.example.com/api')).toBe(data);
  });
});

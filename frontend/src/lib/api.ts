import axios from 'axios';
import type { Post, Category, Tag, Setting } from '@/types';

// Always call the API via same-origin to ensure cookies are set for the site domain.
// The reverse proxy (Next.js rewrites) will forward to the real backend origin.
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_BASE = '/api';
const SEND_CREDENTIALS = process.env.NEXT_PUBLIC_SEND_CREDENTIALS === 'true';
const CSRF_HEADER_NAME = process.env.NEXT_PUBLIC_CSRF_HEADER_NAME || 'X-CSRF-Token';
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'csrf_token';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: SEND_CREDENTIALS,
  headers: {
    'Content-Type': 'application/json',
  },
  // Avoid indefinite pending UI if an upstream proxy/network stalls
  timeout: 15000,
});

// Browser-safe cookie helpers (avoid importing js-cookie on the server)
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const escaped = name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
};

// Mirror SameSite and Secure deletion behavior used in auth.ts
const forceSecure = process.env.NEXT_PUBLIC_FORCE_SECURE_COOKIES === 'true';
const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  const sameSite = '; SameSite=Lax';
  const secure = (isHttps || forceSecure) ? '; Secure' : '';
  document.cookie = `${name}=; Max-Age=0; Path=/${sameSite}${secure}`;
};

// Request interceptor to add auth token and CSRF header when needed
api.interceptors.request.use(
  (config) => {
    // If not using cookie-based auth, attach Bearer token from client cookie
    if (!SEND_CREDENTIALS) {
      const token = getCookie('token');
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }

    // For state-changing requests with cookie-based auth, add CSRF header
    const method = String(config.method || 'get').toLowerCase();
    const isSafe = method === 'get' || method === 'head' || method === 'options';
    if (SEND_CREDENTIALS && !isSafe) {
      const csrf = getCookie(CSRF_COOKIE_NAME);
      if (csrf) {
        (config.headers as any)[CSRF_HEADER_NAME] = csrf;
      }
    }
    // Notify global loader that a request started
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new Event('api:request-start')); } catch {}
    }
    return config;
  },
  (error) => {
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new Event('api:request-end')); } catch {}
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and network reachability status
api.interceptors.response.use(
  (response) => {
    // Any successful response implies API is reachable again
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new Event('api:recovered')); } catch {}
      // Notify global loader that a request ended
      try { window.dispatchEvent(new Event('api:request-end')); } catch {}
    }
    return response;
  },
  (error) => {
    // Always signal end of this request to the global loader
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new Event('api:request-end')); } catch {}
    }
    if (error.response?.status === 401) {
      const url: string = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

      if (isAuthEndpoint) {
        // Don't redirect on login/register errors; allow UI to show inline error
        return Promise.reject(error);
      }

      deleteCookie('token');
      deleteCookie('user');
      if (typeof window !== 'undefined') {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    // If there is no response, it's likely a network error or CORS/timeout
    if (!error.response) {
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new Event('api:unreachable')); } catch {}
      }
    }
    return Promise.reject(error);
  }
);

// Common list query params
type ListParams = {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  published?: boolean;
  featured?: boolean;
  excludeIds?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type SettingsUpdate = Partial<Setting> | { value?: string } | Record<string, unknown>;

// Auth APIs
export const authAPI = {
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; username: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

// Posts APIs
export const postsAPI = {
  getAll: (params?: ListParams) => api.get('/posts', { params }),
  getOne: (slug: string) => api.get(`/posts/slug/${slug}`),
  // Alias used by pages
  getBySlug: (slug: string) => api.get(`/posts/slug/${slug}`),
  // New: fetch by backend id (for admin edit page)
  getById: (id: string) => api.get(`/posts/${id}`),
  create: (data: Partial<Post>) => api.post('/posts', data),
  update: (id: string, data: Partial<Post>) => api.put(`/posts/${id}`, data),
  duplicate: (id: string) => api.post(`/posts/${id}/duplicate`),
  delete: (id: string) => api.delete(`/posts/${id}`),
  bulkStatus: (ids: string[], status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', publishedAt?: string) =>
    api.post('/posts/bulk/status', { ids, status, ...(publishedAt ? { publishedAt } : {}) }),
  bulkDelete: (ids: string[]) => api.post('/posts/bulk/delete', { ids }),
  getByCategory: (categorySlug: string) => 
    api.get(`/posts/category/${categorySlug}`),
  getByTag: (tagSlug: string) => 
    api.get(`/posts/tag/${tagSlug}`),
  search: (q: string, params?: Omit<ListParams, 'q'>) => 
    api.get('/posts/search', { params: { q, ...(params || {}) } }),
  stats: () => api.get('/posts/stats'),
  incrementView: (id: string) => api.post(`/posts/${id}/view`),
  related: (id: string, params?: { limit?: number }) => api.get(`/posts/${id}/related`, { params }),
  prevNext: (id: string) => api.get(`/posts/${id}/prev-next`),
};

// Categories APIs
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getOne: (id: string) => api.get(`/categories/${id}`),
  create: (data: Partial<Category>) => api.post('/categories', data),
  update: (id: string, data: Partial<Category>) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  reorder: (ids: string[]) => api.post('/categories/reorder', { ids }),
};

// Tags APIs
export const tagsAPI = {
  getAll: (params?: ListParams) => api.get('/tags', { params }),
  getOne: (id: string) => api.get(`/tags/${id}`),
  create: (data: Partial<Tag>) => api.post('/tags', data),
  update: (id: string, data: Partial<Tag>) => api.put(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  merge: (sourceIds: string[], targetId: string) =>
    api.post('/tags/merge', { sourceIds, targetId }),
  cleanupUnused: () => api.post('/tags/cleanup-unused'),
};

// Settings APIs
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (key: string, data: SettingsUpdate) => api.put(`/settings/${encodeURIComponent(key)}`, data),
};

// Comments APIs
export const commentsAPI = {
  byPost: (postId: string, params?: { limit?: number; offset?: number; approved?: boolean }) =>
    api.get(`/comments/by-post/${postId}`, { params }),
  create: (data: { postId: string; authorName?: string; authorEmail?: string; content: string; honeypot?: string }) =>
    api.post('/comments', data),
  // Admin
  adminList: (params?: { postId?: string; approved?: boolean; limit?: number; offset?: number }) =>
    api.get('/comments/admin', { params }),
  setApproval: (id: string, approved: boolean) =>
    api.patch(`/comments/${id}/approve`, { approved }),
  remove: (id: string) => api.delete(`/comments/${id}`),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Profile APIs (self-service)
export const profileAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: { email?: string; firstName?: string; lastName?: string; bio?: string; avatar?: string }) =>
    api.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),
  getNotifications: () => api.get('/users/me/notifications'),
  updateNotifications: (data: { emailOnComments?: boolean; emailOnMentions?: boolean; newsletter?: boolean }) =>
    api.put('/users/me/notifications', data),
  getActivity: () => api.get('/users/me/activity'),
};

// Newsletter API
export const newsletterAPI = {
  subscribe: (data: { email: string; honeypot?: string }) => api.post('/newsletter/subscribe', data),
};

// Public origin for assets (e.g., /uploads/*) derived from absolute API URL
// If NEXT_PUBLIC_API_URL is http://localhost:3001/api -> origin is http://localhost:3001
export const API_ORIGIN = (() => {
  try {
    const u = new URL(RAW_API_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3001';
  }
})();

// Resolve a possibly relative URL (e.g., "/uploads/avatars/...") to an absolute URL on the backend origin
export const toAbsoluteUrl = (url: string | undefined): string => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
};

export default api;

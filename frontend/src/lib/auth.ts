import { authAPI } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'author';
}

// Narrowly typed helper to extract an error message from Axios-like errors
type MaybeAxiosError = { response?: { data?: { message?: unknown } } };
function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as MaybeAxiosError;
    const msg = maybe.response?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const auth = {
  login: async (email: string, password: string, rememberMe?: boolean) => {
    try {
      const response = await authAPI.login({ email, password, rememberMe: !!rememberMe });
      const { access_token, user: rawUser } = response.data;

      // Normalize user for frontend consumption
      const normalizedUser: User = {
        id: rawUser.id,
        email: rawUser.email,
        name:
          [rawUser.firstName, rawUser.lastName].filter(Boolean).join(' ') ||
          rawUser.username ||
          (rawUser.email ? String(rawUser.email).split('@')[0] : 'User'),
        role: String(rawUser.role).toLowerCase() as User['role'],
      };

      // Persist cookies based on rememberMe (session cookie when false)
      // If using cookie-based auth (withCredentials), the server sets HttpOnly cookie.
      // Avoid duplicating the token in a readable cookie.
      const SEND_CREDENTIALS = process.env.NEXT_PUBLIC_SEND_CREDENTIALS === 'true';
      if (!SEND_CREDENTIALS) {
        // Token mode: persist readable token for app and middleware
        setCookie('token', access_token, rememberMe ? 30 : undefined);
      } else {
        // Cookie mode: do not duplicate the token in a readable cookie.
        // Ensure any old token cookie is cleared.
        deleteCookie('token');
      }
      setCookie('user', JSON.stringify(normalizedUser), rememberMe ? 30 : undefined);

      return { success: true, user: normalizedUser };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Login failed'),
      };
    }
  },

  register: async (
    email: string,
    password: string,
    username: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      const response = await authAPI.register({ email, password, username, firstName, lastName });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, 'Registration failed'),
      };
    }
  },

  logout: () => {
    // Attempt to clear server HttpOnly cookie if enabled
    authAPI.logout().catch(() => {/* ignore errors */});
    // Clear client cookies regardless
    deleteCookie('token');
    deleteCookie('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  getUser: (): User | null => {
    const userStr = getCookie('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    const SEND_CREDENTIALS = process.env.NEXT_PUBLIC_SEND_CREDENTIALS === 'true';
    if (SEND_CREDENTIALS) {
      // In cookie mode, client cannot read HttpOnly cookie; rely on presence of user cookie
      return !!getCookie('user');
    }
    return !!getCookie('token');
  },

  hasRole: (allowedRoles: string[]): boolean => {
    const user = auth.getUser();
    return user ? allowedRoles.includes(user.role) : false;
  },
};

// ---------- Cookie helpers (browser-only) ----------
const isBrowser = typeof document !== 'undefined';
const forceSecure = process.env.NEXT_PUBLIC_FORCE_SECURE_COOKIES === 'true';
const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';

function setCookie(name: string, value: string, days?: number) {
  if (!isBrowser) return;
  let expires = '';
  if (typeof days === 'number') {
    const date = new Date();
    date.setTime(date.getTime() + days * 864e5);
    expires = '; Expires=' + date.toUTCString();
  }
  // NOTE: HttpOnly cannot be set from client-side JavaScript. If you want HttpOnly,
  // set cookies from the server instead. Here we at least add SameSite and Secure flags.
  const sameSite = '; SameSite=Lax';
  const secure = (isHttps || forceSecure) ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; Path=/${sameSite}${secure}`;
}

function getCookie(name: string): string | undefined {
  if (!isBrowser) return undefined;
  const escaped = encodeURIComponent(name).replace(/[-.+*]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function deleteCookie(name: string) {
  if (!isBrowser) return;
  const sameSite = '; SameSite=Lax';
  const secure = (isHttps || forceSecure) ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/${sameSite}${secure}`;
}

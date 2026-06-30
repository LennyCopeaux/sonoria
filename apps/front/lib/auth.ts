import Cookies from "js-cookie";

const TOKEN_KEY = "access_token";
const AUTH_CHANGED_EVENT = "sonoria:auth-changed";

function notifyAuthChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export { AUTH_CHANGED_EVENT };

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
  exp?: number;
  iat?: number;
}

export function getAccessToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  // The cookie persists as a 7-day session marker (so the middleware keeps the
  // user in protected routes), while the JWT inside expires after ~15 min and
  // is silently renewed via the refresh token. Value is reset on each refresh.
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: "lax" });
  notifyAuthChanged();
}

export function clearAccessToken(): void {
  Cookies.remove(TOKEN_KEY);
  notifyAuthChanged();
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 > Date.now();
}

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  return decodeToken(token)?.role ?? null;
}

export function getCurrentUser(): JwtPayload | null {
  const token = getAccessToken();
  if (!token || !isLoggedIn()) return null;

  return decodeToken(token);
}

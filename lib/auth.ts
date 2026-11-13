// Remembers the last signed-in user so the app opens offline without a network login.
export type CachedUser = { id: string; email: string };
const KEY = 'et-user';

export function loadCachedUser(): CachedUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedUser) : null;
  } catch {
    return null;
  }
}
export function cacheUser(u: CachedUser) {
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
}
export function clearCachedUser() {
  try {
    localStorage.removeItem(KEY);
    Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

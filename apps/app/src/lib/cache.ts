/**
 * "Stale-while-revalidate": pichli baar ka data phone me rakho, app khulte hi turant dikhao,
 * aur background me server se taaza data laake chupchaap update karo. App "instant" lagta hai.
 */
export function readCache<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
}
export function writeCache(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* storage full / private mode */ }
}
export function clearUserCache() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('c:')).forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
}

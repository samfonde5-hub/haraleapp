/** India date helpers (app is used in IST). */
export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}
export function partOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date(Date.now() + 5.5 * 3600_000).getUTCHours()
  return h < 11 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

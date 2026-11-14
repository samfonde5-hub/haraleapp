/** Small "feel" helpers: haptics + smooth view transitions (fallback-safe). */
import { flushSync } from 'react-dom'

export function haptic(ms = 10) {
  try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(ms) } catch { /* not supported */ }
}

type VT = { startViewTransition?: (cb: () => void) => unknown }
/** Chrome/Android: native cross-fade between screens. Others: instant. */
export function transition(update: () => void) {
  const d = document as unknown as VT
  if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    d.startViewTransition(() => flushSync(update))
  } else update()
}

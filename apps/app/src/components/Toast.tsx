import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { haptic } from '../lib/feel'

type Toast = { id: number; text: string; ok: boolean }
const Ctx = createContext<(text: string, ok?: boolean) => void>(() => {})

/** Neeche se slide hone wala chhota message — "Saved ✓" jaisa. 2.6s me khud gayab. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(0)
  const show = useCallback((text: string, ok = true) => {
    haptic(ok ? 12 : 30)
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, ok })
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50">
        {toast && (
          <p key={toast.id} className={`toast absolute left-1/2 w-max max-w-[90vw] rounded-2xl px-5 py-3 text-center text-base font-semibold shadow-xl ${toast.ok ? 'bg-ink text-white' : 'bg-coral text-white'}`}>
            {toast.text}
          </p>
        )}
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => useContext(Ctx)

/** Animated green tick (check-in success) */
export function SuccessCheck() {
  return (
    <span className="relative inline-flex h-20 w-20 items-center justify-center">
      <span className="ring absolute inset-0 rounded-full bg-emerald/40" />
      <span className="pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald shadow-lg">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="check-path" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-3xl ${className}`} />
}

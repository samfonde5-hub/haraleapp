import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Bilingual helper: L('English', 'मराठी') — doctor panel ke bahut saare chhote labels ke liye. */
export function useL() {
  const { i18n } = useTranslation()
  return (en: string, mr: string) => (i18n.language === 'en' ? en : mr)
}

const AV_COLORS = [['#FCE3DA', '#B4472A'], ['#E4F8EE', '#0F6B4C'], ['#FDF3E2', '#B57414'], ['#E6EEFB', '#2E5AA8'], ['#F1E6FA', '#7A3FA8'], ['#F3EFE7', '#6B756F']]
/** Initials avatar — Devanagari ke liye pehle 2 akshar (मे, रा), English ke liye 1. */
export function Av({ name, size = 40 }: { name: string; size?: number }) {
  const n = (name || '?').trim()
  const isDeva = /[ऀ-ॿ]/.test(n)
  const init = isDeva ? Array.from(n).slice(0, 2).join('') : n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  let h = 0
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [bg, fg] = AV_COLORS[h % AV_COLORS.length]
  return <span className="flex shrink-0 items-center justify-center rounded-full font-display font-extrabold" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}>{init}</span>
}

export function Dc({ children, className = '', i = 0, style }: { children: ReactNode; className?: string; i?: number; style?: CSSProperties }) {
  return <section className={`dc rise ${className}`} style={{ '--i': i, ...style } as CSSProperties}>{children}</section>
}

export function Kpi({ label, value, sub, tone, children, i = 0 }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'co'; children?: ReactNode; i?: number }) {
  return (
    <div className="dc rise" style={{ '--i': i, ...(tone === 'co' ? { background: '#FFF4EF', borderColor: '#FFD9C9' } : {}) } as CSSProperties}>
      <div className={`text-sm font-medium ${tone === 'co' ? 'text-[#C2502A]' : 'text-mu'}`}>{label}</div>
      <div className={`mt-1.5 font-latin text-[32px] font-bold leading-tight ${tone === 'co' ? 'text-[#D9552B]' : ''}`}>{value}</div>
      {sub && <div className="mt-2">{sub}</div>}
      {children}
    </div>
  )
}

export function PageHead({ title, sub, chip, right }: { title: string; sub?: string; chip?: ReactNode; right?: ReactNode }) {
  return (
    <div className="rise flex flex-wrap items-center gap-3">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold lg:text-[26px]">{title}{chip}</h1>
        {sub && <p className="text-sm text-mu">{sub}</p>}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-sand/60 p-4 text-center text-mu">{children}</p>
}

/** Bottom sheet on phone, centered dialog on desktop. Esc + backdrop close. */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = o }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade-in absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className={`sheet relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl lg:rounded-3xl ${wide ? 'lg:max-w-3xl' : 'lg:max-w-lg'} max-w-full`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-full bg-sand text-lg" style={{ minHeight: 40 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current align-middle" aria-label="loading" />
}

export const fmtDate = (iso: string | null | undefined, lang: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(lang === 'en' ? 'en-IN' : 'mr-IN', { timeZone: 'Asia/Kolkata', ...opts }) : '—'
export const fmtTime = (iso: string, lang: string) =>
  new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-IN' : 'mr-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

/** wa.me link with optional prefilled text (doctor's own WhatsApp opens — nothing sent automatically). */
export function waLink(phone: string | null | undefined, text = '') {
  if (!phone) return null
  const p = phone.replace(/[^\d]/g, '')
  const full = p.length === 10 ? '91' + p : p
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
export const mask = (phone: string | null | undefined) => {
  if (!phone) return ''
  const d = phone.replace(/[^\d]/g, '').slice(-10)
  return `+91 ${d.slice(0, 2)}•••• ${d.slice(-4)}`
}

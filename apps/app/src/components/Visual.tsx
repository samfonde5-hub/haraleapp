import type { ReactNode } from 'react'
import doctor from '../assets/doctor.webp'

/** Real-photo banner with brand gradient. Text stays in code (translatable), not baked into the image. */
export function PhotoBanner({ src, children, tall = false, align = 'bottom' }: { src: string; children?: ReactNode; tall?: boolean; align?: 'bottom' | 'center' }) {
  return (
    <section className={`relative overflow-hidden rounded-3xl shadow-lg ${tall ? 'h-64' : 'h-44'}`}>
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-dark/95 via-emerald-dark/45 to-transparent" />
      <div className={`relative flex h-full flex-col p-5 text-white ${align === 'bottom' ? 'justify-end' : 'justify-center'}`}>{children}</div>
    </section>
  )
}

/** Doctor's real photo in a gold arch — the app's signature (not a stock face). */
export function DoctorArch({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-16 w-14' : size === 'lg' ? 'h-64 w-52' : 'h-28 w-24'
  return (
    <div className={`${dims} shrink-0 rounded-t-full rounded-b-2xl bg-gradient-to-b from-[#FFE7A3] via-gold to-[#B9821A] p-[3px] shadow-md`}>
      <img src={doctor} alt="Dr. Chandrashekhar Harale" className="h-full w-full rounded-t-full rounded-b-[14px] object-cover object-top" />
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>{children}</section>
}

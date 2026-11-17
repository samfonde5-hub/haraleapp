import { useTranslation } from 'react-i18next'
import { Card } from '../components/Visual'
import { partOfDay } from '../lib/dates'
import type { usePatientData } from '../lib/patient'

type Data = ReturnType<typeof usePatientData>

/**
 * Mentor note: ye "pipeline" patient ko har din dikhata hai — main kahaan hoon (12 hafte ka safar)
 * aur ABHI agla ek kaam kya hai. Ek hi bada button = confusion zero.
 */
export function NextStep({ data, go }: { data: Data; go: (tab: string) => void }) {
  const { t } = useTranslation('p')
  const { todayCheckins, todayLog, unread } = data
  const pod = partOfDay()
  const meal = pod === 'morning' ? 'breakfast' : pod === 'afternoon' ? 'lunch' : 'dinner'
  const has = (m: string) => todayCheckins.some((c) => c.meal === m)
  const water = todayLog?.water_glasses ?? 0

  let step: { icon: string; title: string; sub: string; cta: string; tab: string } | null = null
  if (unread) step = { icon: '💬', title: t('next.msg_t'), sub: t('next.msg_s'), cta: t('next.msg_c'), tab: 'msgs' }
  else if (!has(meal)) step = { icon: '📷', title: t(`next.${meal}_t`), sub: t('next.photo_s'), cta: t('next.photo_c'), tab: 'checkin' }
  else if (!todayLog?.weight_kg) step = { icon: '⚖️', title: t('next.weight_t'), sub: t('next.weight_s'), cta: t('next.weight_c'), tab: 'checkin' }
  else if (water < 8) step = { icon: '💧', title: t('next.water_t', { n: 8 - water }), sub: t('next.water_s'), cta: t('next.water_c'), tab: 'today' }

  if (!step) {
    return (
      <Card i={1} className="flex items-center gap-4 bg-mint/60">
        <span className="pop text-4xl">🎉</span>
        <div><p className="font-display text-xl font-bold text-emerald">{t('next.done_t')}</p><p className="text-ink/75">{t('next.done_s')}</p></div>
      </Card>
    )
  }
  return (
    <section className="rise rounded-3xl bg-coral p-5 text-white shadow-lg shadow-coral/30" style={{ '--i': 1 } as React.CSSProperties}>
      <p className="font-latin text-xs font-bold uppercase tracking-widest text-white/80">{t('next.label')}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-4xl">{step.icon}</span>
        <div className="min-w-0"><p className="font-display text-xl font-extrabold leading-snug">{step.title}</p><p className="text-white/85">{step.sub}</p></div>
      </div>
      <button onClick={() => (step.tab === 'today' ? document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth' }) : go(step.tab))}
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-white text-lg font-bold text-coral">{step.cta} →</button>
    </section>
  )
}

const PHASES = [
  { key: 'p1', from: 1, to: 4 },
  { key: 'p2', from: 5, to: 8 },
  { key: 'p3', from: 9, to: 12 },
  { key: 'p4', from: 13, to: 99 },
] as const

export function JourneyCard({ week, focus }: { week: number; focus: string | null | undefined }) {
  const { t } = useTranslation('p')
  const cur = PHASES.findIndex((p) => week >= p.from && week <= p.to)
  const pct = Math.min(100, (Math.min(week, 12) / 12) * 100)
  return (
    <Card i={2}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{t('journey.title')}</h2>
        <span className="rounded-full bg-mint/60 px-3 py-1 font-latin text-sm font-bold text-emerald">{week <= 12 ? t('journey.week', { w: week }) : t('journey.maint')}</span>
      </div>
      <div className="relative mt-4">
        <div className="absolute left-0 right-0 top-4 h-1.5 rounded-full bg-ink/10" />
        <div className="absolute left-0 top-4 h-1.5 rounded-full bg-gradient-to-r from-emerald to-[#2BA676] transition-[width] duration-700" style={{ width: `${pct}%` }} />
        <ol className="relative grid grid-cols-4 gap-1">
          {PHASES.map((p, k) => {
            const state = k < cur ? 'done' : k === cur ? 'now' : 'next'
            return (
              <li key={p.key} className="flex flex-col items-center text-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-sm font-bold shadow ${state === 'done' ? 'bg-emerald text-white' : state === 'now' ? 'pop bg-coral text-white ring-4 ring-coral/25' : 'bg-sand text-ink/50'}`}>
                  {state === 'done' ? '✓' : k + 1}
                </span>
                <span className={`mt-1.5 text-sm font-bold leading-tight ${state === 'next' ? 'text-ink/50' : 'text-ink'}`}>{t(`journey.${p.key}`)}</span>
                <span className="text-xs text-ink/55">{t(`journey.${p.key}s`)}</span>
              </li>
            )
          })}
        </ol>
      </div>
      {focus && (
        <div className="mt-4 rounded-2xl bg-[#FFF4EF] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-coral">{t('journey.focus')}</p>
          <p className="font-bold">{focus}</p>
        </div>
      )}
    </Card>
  )
}

/** Patient abhi approve nahi hua: "aage kya hoga" — 3 steps, taaki koi confuse na ho. */
export function WhatNext() {
  const { t } = useTranslation('p')
  const sent = (() => { try { return !!localStorage.getItem('intake') } catch { return false } })()
  const steps = [
    { done: true, t: t('after.s1t'), s: sent ? t('after.s1s') : t('after.s1n') },
    { done: false, now: true, t: t('after.s2t'), s: t('after.s2s') },
    { done: false, t: t('after.s3t'), s: t('after.s3s') },
    { done: false, t: t('after.s4t'), s: t('after.s4s') },
  ]
  return (
    <Card i={1} className="border-2 border-gold/50">
      <h2 className="font-display text-xl font-bold">{t('after.title')}</h2>
      <ol className="mt-3 flex flex-col">
        {steps.map((s, k) => (
          <li key={k} className="relative flex gap-3 pb-4 last:pb-0">
            {k < steps.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 bg-ink/10" />}
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-emerald text-white' : s.now ? 'bg-coral text-white' : 'bg-sand text-ink/50'}`}>{s.done ? '✓' : k + 1}</span>
            <div><p className="font-bold">{s.t}</p><p className="text-ink/70">{s.s}</p></div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

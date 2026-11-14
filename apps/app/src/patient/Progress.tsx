import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { todayIST } from '../lib/dates'
import type { usePatientData } from '../lib/patient'
import walk from '../assets/banners/onboard-progress.webp'

type Data = ReturnType<typeof usePatientData>

/** Tiny SVG line chart — no chart library (keeps the app light). */
function WeightChart({ points }: { points: { d: string; w: number }[] }) {
  const W = 320, H = 150, P = 18
  const ws = points.map((p) => p.w)
  const min = Math.min(...ws) - 0.5, max = Math.max(...ws) + 0.5
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1)
  const y = (w: number) => H - P - ((w - min) * (H - 2 * P)) / Math.max(0.1, max - min)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="weight chart">
      <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0F6B4C" stopOpacity=".25" /><stop offset="1" stopColor="#0F6B4C" stopOpacity="0" /></linearGradient></defs>
      <path d={`${path} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="url(#g)" className="fade-in" style={{ animationDelay: '.5s' }} />
      <path d={path} pathLength={1} className="draw" fill="none" stroke="#0F6B4C" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={p.d} cx={x(i)} cy={y(p.w)} r={i === points.length - 1 ? 5 : 3} fill={i === points.length - 1 ? '#FF7A50' : '#0F6B4C'} className="pop" style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${0.3 + (i / points.length) * 0.9}s` }} />)}
    </svg>
  )
}

export default function Progress({ data }: { data: Data }) {
  const { t } = useTranslation('p')
  const { logs, patient, active } = data
  const pts = logs.filter((l) => l.weight_kg).map((l) => ({ d: l.log_date, w: Number(l.weight_kg) }))
  const start = patient?.start_weight ? Number(patient.start_weight) : pts[0]?.w
  const now = pts[pts.length - 1]?.w
  const diff = start && now ? +(now - start).toFixed(1) : null
  const today = todayIST()
  let weekDays = 0
  for (let i = 0; i < 7; i++) if (active.has(new Date(Date.parse(today) - i * 86_400_000).toISOString().slice(0, 10))) weekDays++

  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={walk}><h1 className="font-display text-3xl font-extrabold">{t('progress.title')}</h1></PhotoBanner>
      <Card i={1}>
        <h2 className="font-display text-xl font-bold">{t('progress.weight')}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[[t('progress.start'), start], [t('progress.now'), now], [t('progress.change'), diff]].map(([l, v], k) => (
            <div key={k} className="pop rounded-2xl bg-paper p-3" style={{ animationDelay: `${150 + k * 80}ms` }}>
              <p className="text-sm text-ink/60">{l}</p>
              <p className={`font-latin text-xl font-semibold ${k === 2 && diff !== null ? (diff <= 0 ? 'text-emerald' : 'text-coral') : ''}`}>
                {v === undefined || v === null ? '—' : `${k === 2 && Number(v) > 0 ? '+' : ''}${v}`}
              </p>
            </div>
          ))}
        </div>
        {pts.length >= 2 ? <WeightChart points={pts} /> : <p className="mt-3 text-ink/60">{t('progress.empty')}</p>}
        <p className="mt-2 text-xs text-ink/50">{t('progress.disclaimer')}</p>
      </Card>
      <Card i={2}>
        <h2 className="font-display text-xl font-bold">{t('progress.week_checkins')}</h2>
        <div className="mt-3 flex gap-1.5">{Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.parse(today) - (6 - i) * 86_400_000).toISOString().slice(0, 10)
          return <span key={d} className={`grow h-10 flex-1 rounded-lg ${active.has(d) ? 'bg-emerald' : 'bg-ink/10'}`} style={{ '--i': i + 4 } as React.CSSProperties} />
        })}</div>
        <p className="mt-2 text-lg font-semibold">{t('progress.of', { a: weekDays, b: 7 })}</p>
      </Card>
    </div>
  )
}

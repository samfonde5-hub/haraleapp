import { useTranslation } from 'react-i18next'
import { Card } from '../components/Visual'
import { Skeleton } from '../components/Toast'
import type { useDoctorToday } from '../lib/doctor'
import PlateCard from './PlateCard'
import AlertList from './AlertList'

type Data = ReturnType<typeof useDoctorToday>

export default function DToday({ q, openPatient }: { q: Data; openPatient: (id: string) => void }) {
  const { t } = useTranslation('d')
  const d = q.data
  if (!d) return <div className="flex flex-col gap-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>
  const stats = [
    ['active', d.counts.active, 'text-emerald'], ['checkins', d.counts.checkins_today, 'text-ink'],
    ['to_react', d.counts.to_react, 'text-coral'], ['alerts', d.counts.open_alerts, d.counts.open_alerts ? 'text-coral' : 'text-ink'],
  ] as const
  const pending = d.checkins.filter((c) => !c.doctor_reaction)
  const done = d.checkins.filter((c) => c.doctor_reaction)
  return (
    <div className="flex flex-col gap-4">
      <section className="rise rounded-3xl bg-gradient-to-br from-emerald to-emerald-dark p-5 text-white shadow-lg">
        <p className="font-display text-2xl font-extrabold">{t('hello')}</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map(([k, v, c], i) => (
            <div key={k} className="pop rounded-2xl bg-white p-2 text-center" style={{ animationDelay: `${100 + i * 70}ms` }}>
              <p className={`font-latin text-2xl font-semibold ${c}`}>{v}</p>
              <p className="text-xs leading-tight text-ink/60">{t(`stats.${k}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {d.alerts.length > 0 && <AlertList alerts={d.alerts} onChange={q.reload} openPatient={openPatient} />}

      <div>
        <h2 className="rise mb-2 px-1 font-display text-xl font-bold">{t('plates.title')} {pending.length > 0 && <span className="ml-1 rounded-full bg-coral px-2 text-sm text-white">{pending.length}</span>}</h2>
        {d.checkins.length === 0 ? <Card><p className="text-ink/60">{t('plates.none')}</p></Card> : (
          <ul className="flex flex-col gap-4">{[...pending, ...done].map((c, i) => <PlateCard key={c.id} c={c} i={i} onPatient={openPatient} />)}</ul>
        )}
      </div>

      <Card i={3}>
        <h2 className="font-display text-xl font-bold">{t('quiet.title')}</h2>
        {d.quiet.length === 0 ? <p className="mt-2 text-ink/60">{t('quiet.none')}</p> : (
          <ul className="mt-2 divide-y divide-ink/10">{d.quiet.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <button onClick={() => openPatient(p.id)} className="min-w-0 text-left" style={{ minHeight: 44 }}>
                <span className="block truncate font-semibold">{p.full_name}</span>
                <span className="block text-sm text-ink/55">{p.last_active ? t('quiet.last', { d: p.last_active }) : t('quiet.never')}</span>
              </button>
              {p.phone && <a href={`tel:${p.phone}`} className="shrink-0 rounded-full bg-mint px-3 py-2 text-sm font-bold text-emerald">📞</a>}
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import { setAlertStatus, ago, type DAlert } from '../lib/doctor'

export default function AlertList({ alerts, onChange, openPatient }: { alerts: DAlert[]; onChange: () => void; openPatient?: (id: string) => void }) {
  const { t } = useTranslation('d')
  const toast = useToast()
  const [local, setLocal] = useState<Record<string, string>>({})
  async function mark(id: string, s: 'seen' | 'resolved') {
    setLocal((m) => ({ ...m, [id]: s }))
    const { error } = await setAlertStatus(id, s)
    if (error) { toast(t('fail'), false); setLocal((m) => { const n = { ...m }; delete n[id]; return n }) } else onChange()
  }
  const list = alerts.filter((a) => (local[a.id] ?? a.status) !== 'resolved')
  return (
    <section className="rise rounded-3xl border-2 border-coral/40 bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl font-bold text-coral">{t('alerts.title')}</h2>
      {list.length === 0 ? <p className="mt-2 text-ink/60">{t('alerts.none')}</p> : (
        <ul className="mt-3 flex flex-col gap-3">{list.map((a) => {
          const st = local[a.id] ?? a.status
          return (
            <li key={a.id} className={`rounded-2xl p-3 ${st === 'open' ? 'bg-coral/10' : 'bg-paper'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <button onClick={() => a.patient_id && openPatient?.(a.patient_id)} className="truncate text-left font-bold" style={{ minHeight: 0 }}>{a.full_name ?? ''}</button>
                <span className="shrink-0 text-sm text-ink/60">{ago(a.created_at, t)}</span>
              </div>
              <p className="mt-1 text-ink/80">{a.note || t('alerts.no_note')}</p>
              <div className="mt-2 flex gap-2">
                {a.phone && <a href={`tel:${a.phone}`} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-coral font-bold text-white">📞 {t('alerts.call')}</a>}
                {st === 'open' && <button onClick={() => mark(a.id, 'seen')} className="min-h-11 flex-1 rounded-xl bg-white font-semibold" style={{ minHeight: 44 }}>👁 {t('alerts.seen')}</button>}
                <button onClick={() => mark(a.id, 'resolved')} className="min-h-11 flex-1 rounded-xl bg-emerald font-semibold text-white" style={{ minHeight: 44 }}>✓ {t('alerts.resolve')}</button>
              </div>
            </li>
          )
        })}</ul>
      )}
    </section>
  )
}

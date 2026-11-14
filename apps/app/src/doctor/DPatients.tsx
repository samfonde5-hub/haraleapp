import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/Visual'
import { Skeleton, useToast } from '../components/Toast'
import { addPatient, type useDoctorPatients } from '../lib/doctor'
import { todayIST } from '../lib/dates'
import { haptic } from '../lib/feel'

type Data = ReturnType<typeof useDoctorPatients>
const CONDS = ['diabetes', 'thyroid', 'pcod', 'bp', 'pregnancy', 'other'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function AddSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation('d')
  const toast = useToast()
  const [f, setF] = useState({ name: '', email: '', phone: '', sw: '', tw: '', date: todayIST() })
  const [conds, setConds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 20 && n <= 300 ? n : null }
  async function save() {
    const email = f.email.trim().toLowerCase()
    if (!f.name.trim() || !EMAIL_RE.test(email)) return setErr(t('form.bad'))
    setBusy(true); setErr('')
    const phone = f.phone.replace(/[^\d+]/g, '')
    const { error } = await addPatient({ full_name: f.name.trim().slice(0, 120), invite_email: email, phone: phone.length >= 10 ? phone : null, start_weight: num(f.sw), target_weight: num(f.tw), start_date: f.date || null, conditions: conds })
    setBusy(false)
    if (error) return setErr(error.code === '23505' ? t('form.dup') : t('fail'))
    haptic(20); toast(t('form.saved')); onDone(); onClose()
  }
  const inp = 'mt-1 min-h-12 w-full rounded-xl border-2 border-ink/10 bg-white px-3 text-lg outline-none focus:border-emerald'
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="fade-in absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="sheet relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-ink/15" />
        <h2 className="font-display text-2xl font-bold">{t('form.title')}</h2>
        <label className="mt-3 block text-sm font-semibold">{t('form.name')}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></label>
        <label className="mt-3 block text-sm font-semibold">{t('form.email')}<input type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} placeholder="name@gmail.com" /></label>
        <label className="mt-3 block text-sm font-semibold">{t('form.phone')}<input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inp} placeholder="+91…" /></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">{t('form.start_w')}<input inputMode="decimal" value={f.sw} onChange={(e) => setF({ ...f, sw: e.target.value })} className={inp} /></label>
          <label className="text-sm font-semibold">{t('form.target_w')}<input inputMode="decimal" value={f.tw} onChange={(e) => setF({ ...f, tw: e.target.value })} className={inp} /></label>
        </div>
        <label className="mt-3 block text-sm font-semibold">{t('form.start_date')}<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inp} /></label>
        <p className="mt-3 text-sm font-semibold">{t('form.conditions')}</p>
        <div className="mt-1 flex flex-wrap gap-2">{CONDS.map((c) => {
          const on = conds.includes(c)
          return <button key={c} onClick={() => setConds(on ? conds.filter((x) => x !== c) : [...conds, c])} aria-pressed={on}
            className={`rounded-full px-3 text-sm font-semibold ${on ? 'bg-coral text-white' : 'bg-white text-ink'}`} style={{ minHeight: 40 }}>{t(`form.cond.${c}`)}</button>
        })}</div>
        {err && <p role="alert" className="mt-3 rounded-xl bg-coral/10 p-2 text-center font-semibold text-coral">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-4 min-h-14 w-full rounded-2xl bg-emerald text-lg font-bold text-white shadow-lg shadow-emerald/30 disabled:opacity-60">
          {busy ? <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" /> : t('form.save')}
        </button>
        <button onClick={onClose} className="mt-1 w-full text-ink/60">✕</button>
      </div>
    </div>
  )
}

export default function DPatients({ q, openPatient }: { q: Data; openPatient: (id: string) => void }) {
  const { t } = useTranslation('d')
  const [s, setS] = useState('')
  const [adding, setAdding] = useState(false)
  const list = (q.data ?? []).filter((p) => p.full_name.toLowerCase().includes(s.trim().toLowerCase()))
  return (
    <div className="flex flex-col gap-3">
      <div className="rise flex gap-2">
        <input value={s} onChange={(e) => setS(e.target.value)} placeholder={t('patients.search')} className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-ink/10 bg-white px-4 text-lg outline-none focus:border-emerald" />
        <button onClick={() => setAdding(true)} className="shrink-0 rounded-2xl bg-coral px-4 font-bold text-white shadow-md shadow-coral/30">{t('patients.add')}</button>
      </div>
      {q.loading && !q.data ? <Skeleton className="h-40" /> : list.length === 0 ? <Card><p className="text-ink/60">{t('patients.empty')}</p></Card> : (
        <ul className="flex flex-col gap-2">{list.map((p, i) => {
          const diff = p.start_weight && p.last_weight ? +(Number(p.last_weight) - Number(p.start_weight)).toFixed(1) : null
          return (
            <li key={p.id} className="rise" style={{ '--i': Math.min(i, 8) } as React.CSSProperties}>
              <button onClick={() => openPatient(p.id)} className="lift flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mint font-display text-xl font-bold text-emerald">{p.full_name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold">{p.full_name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${p.joined ? 'bg-mint text-emerald' : 'bg-gold/30 text-[#7a5600]'}`}>{p.joined ? t('patients.joined') : t('patients.invited')}</span>
                    {p.doctor_only && <span className="rounded-full bg-coral/15 px-2 py-0.5 font-semibold text-coral">⚕︎</span>}
                    {p.last_active && <span className="text-ink/50">{t('quiet.last', { d: p.last_active })}</span>}
                  </span>
                </span>
                {diff !== null && <span className={`shrink-0 font-latin text-lg font-semibold ${diff <= 0 ? 'text-emerald' : 'text-coral'}`}>{diff > 0 ? '+' : ''}{diff}</span>}
              </button>
            </li>
          )
        })}</ul>
      )}
      {adding && <AddSheet onClose={() => setAdding(false)} onDone={q.reload} />}
    </div>
  )
}

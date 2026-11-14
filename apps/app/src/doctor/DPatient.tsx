import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/Visual'
import { Skeleton, useToast } from '../components/Toast'
import { WeightChart } from '../patient/Progress'
import { savePlan, useDoctorPatient, type DPlan } from '../lib/doctor'
import { haptic } from '../lib/feel'
import PlateCard from './PlateCard'
import AlertList from './AlertList'

function toText(p?: DPlan) {
  return (p?.body.days?.[0]?.meals ?? []).map((m) => `${m.time} - ${m.text}`).join('\n')
}
function fromText(s: string) {
  const meals = s.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [time, ...rest] = l.split(/\s+-\s+/)
    return rest.length ? { time: time.trim().slice(0, 20), text: rest.join(' - ').trim().slice(0, 200) } : { time: '', text: l.slice(0, 200) }
  })
  return { days: [{ label: 'रोज / Daily', meals }] }
}

function PlanEditor({ patientId, plan, nextWeek, onSaved }: { patientId: string; plan?: DPlan; nextWeek: number; onSaved: () => void }) {
  const { t } = useTranslation('d')
  const toast = useToast()
  const [open, setOpen] = useState(!!plan && plan.status === 'draft')
  const [week, setWeek] = useState(plan?.week_no ?? nextWeek)
  const [focus, setFocus] = useState(plan?.focus_goal ?? '')
  const [note, setNote] = useState(plan?.doctor_note ?? '')
  const [meals, setMeals] = useState(toText(plan))
  const [busy, setBusy] = useState(false)
  async function save(status: 'draft' | 'approved') {
    setBusy(true)
    const { error } = await savePlan({ id: plan?.id, patient_id: patientId, week_no: week, focus_goal: focus.trim() || null, doctor_note: note.trim() || null, body: fromText(meals), status })
    setBusy(false)
    if (error) return toast(t('fail'), false)
    haptic(20); toast(status === 'approved' ? t('plan.sent') : t('plan.saved')); onSaved()
  }
  if (!open) return <button onClick={() => setOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-emerald/50 bg-mint/10 font-bold text-emerald" style={{ minHeight: 56 }}>{plan ? `✎ ${t('plan.week')} ${plan.week_no}` : t('plan.new')}</button>
  const inp = 'mt-1 w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-lg outline-none focus:border-emerald'
  return (
    <div className="rise rounded-2xl bg-paper p-4">
      <label className="block text-sm font-semibold">{t('plan.week')}<input inputMode="numeric" value={week} onChange={(e) => setWeek(Math.max(1, Math.min(104, parseInt(e.target.value) || 1)))} className={inp} /></label>
      <label className="mt-3 block text-sm font-semibold">{t('plan.focus')}<input value={focus} maxLength={200} onChange={(e) => setFocus(e.target.value)} className={inp} /></label>
      <label className="mt-3 block text-sm font-semibold">{t('plan.meals')}<textarea rows={5} value={meals} onChange={(e) => setMeals(e.target.value)} placeholder={t('plan.meals_ph')} className={inp} /></label>
      <label className="mt-3 block text-sm font-semibold">{t('plan.note')}<textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inp} /></label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => save('draft')} disabled={busy} className="flex-1 rounded-xl bg-white font-semibold disabled:opacity-60">{t('plan.draft')}</button>
        <button onClick={() => save('approved')} disabled={busy} className="flex-[1.4] rounded-xl bg-emerald font-bold text-white shadow-md shadow-emerald/30 disabled:opacity-60">{t('plan.approve')}</button>
      </div>
    </div>
  )
}

export default function DPatient({ id, back, openPatient }: { id: string; back: () => void; openPatient: (id: string) => void }) {
  const { t } = useTranslation('d')
  const q = useDoctorPatient(id)
  const d = q.data
  if (!d?.patient) return <div className="flex flex-col gap-4"><Skeleton className="h-32" /><Skeleton className="h-60" /></div>
  const p = d.patient
  const pts = d.logs.filter((l) => l.weight_kg).map((l) => ({ d: l.log_date, w: Number(l.weight_kg) }))
  const now = pts[pts.length - 1]?.w
  const nextWeek = (d.plans[0]?.week_no ?? 0) + 1
  const draft = d.plans.find((x) => x.status === 'draft')
  return (
    <div className="flex flex-col gap-4">
      <button onClick={back} className="rise w-fit px-1 font-semibold text-emerald" style={{ minHeight: 40 }}>{t('profile.back')}</button>
      <section className="rise rounded-3xl bg-gradient-to-br from-emerald to-emerald-dark p-5 text-white shadow-lg">
        <h1 className="font-display text-3xl font-extrabold">{p.full_name}</h1>
        <p className="text-white/80">{p.invite_email}{p.phone ? ` · ${p.phone}` : ''}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {!p.joined && <span className="rounded-full bg-gold px-3 py-0.5 font-bold text-ink">{t('profile.not_joined')}</span>}
          {p.doctor_only && <span className="rounded-full bg-coral px-3 py-0.5 font-bold">{t('profile.doctor_only')}</span>}
          {p.conditions?.map((c) => <span key={c} className="rounded-full bg-white/20 px-3 py-0.5">{t(`form.cond.${c}`)}</span>)}
        </div>
        {p.phone && <a href={`tel:${p.phone}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-bold text-emerald">📞 {t('alerts.call')}</a>}
      </section>

      {d.alerts.some((a) => a.status !== 'resolved') && <AlertList alerts={d.alerts.map((a) => ({ ...a, full_name: p.full_name, phone: p.phone, patient_id: p.id }))} onChange={q.reload} />}

      <Card i={1}>
        <h2 className="font-display text-xl font-bold">{t('profile.weight')}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {([['start', p.start_weight], ['now', now], ['target', p.target_weight]] as const).map(([k, v], i) => (
            <div key={k} className="pop rounded-2xl bg-paper p-3" style={{ animationDelay: `${120 + i * 70}ms` }}>
              <p className="text-sm text-ink/60">{t(`profile.${k}`)}</p>
              <p className="font-latin text-xl font-semibold">{v ?? '—'}</p>
            </div>
          ))}
        </div>
        {pts.length >= 2 ? <WeightChart points={pts} /> : <p className="mt-3 text-ink/60">{t('profile.no_logs')}</p>}
      </Card>

      <Card i={2}>
        <h2 className="font-display text-xl font-bold">{t('profile.plans')}</h2>
        <div className="mt-3 flex flex-col gap-2">
          <PlanEditor key={draft?.id ?? 'new'} patientId={p.id} plan={draft} nextWeek={nextWeek} onSaved={q.reload} />
          {d.plans.filter((x) => x.status !== 'draft').map((x) => (
            <div key={x.id} className="rounded-2xl bg-paper p-3">
              <div className="flex items-center justify-between"><b>{t('plan.week')} {x.week_no}</b><span className="rounded-full bg-mint px-2 text-sm font-bold text-emerald">{t('plan.approved')}</span></div>
              {x.focus_goal && <p className="mt-1">{x.focus_goal}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="mb-2 px-1 font-display text-xl font-bold">{t('profile.checkins')}</h2>
        {d.checkins.length === 0 ? <Card><p className="text-ink/60">{t('plates.none')}</p></Card> : (
          <ul className="flex flex-col gap-4">{d.checkins.slice(0, 12).map((c, i) => <PlateCard key={c.id} c={c} i={i} showName={false} onPatient={openPatient} />)}</ul>
        )}
      </div>
    </div>
  )
}

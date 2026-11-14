import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { saveAppt, saveSetting, useAppointments, useSettings, type DAppt } from '../lib/doctor'
import { useAuth } from '../lib/auth'
import ApptForm from './ApptForm'
import { kindLabel } from './DToday'
import { Dc, Modal, PageHead, Spinner, fmtDate, fmtTime, useL } from './ui'

type Slots = { days: number[]; start: string; end: string; length: number; location: string }
const DEF: Slots = { days: [1, 2, 3, 4, 5, 6], start: '17:00', end: '20:00', length: 30, location: 'Clinic · Kolhapur' }
const KIND_STYLE: Record<string, string> = { first_consult: 'bg-[#FFEDE6] border-coral text-[#B4472A]', review: 'bg-mintl border-emerald text-emerald', maintenance: 'bg-ambl border-amb text-[#8A5A10]', video: 'bg-[#E6EEFB] border-[#2E5AA8] text-[#2E5AA8]' }

const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600e3)
function mondayOf(offsetWeeks: number) {
  const now = ist(new Date())
  const dow = (now.getUTCDay() + 6) % 7
  const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow + offsetWeeks * 7))
  return m // UTC date representing IST calendar day
}
const isoAt = (day: Date, hhmm: string) => new Date(`${day.toISOString().slice(0, 10)}T${hhmm}:00+05:30`).toISOString()
const hhmmOf = (iso: string) => ist(new Date(iso)).toISOString().slice(11, 16)
const dayKey = (iso: string) => ist(new Date(iso)).toISOString().slice(0, 10)

function SlotEditor({ s, onClose, onSaved }: { s: Slots; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const [f, setF] = useState(s)
  const [busy, setBusy] = useState(false)
  const DAYS = [[1, 'Mon', 'सोम'], [2, 'Tue', 'मंगळ'], [3, 'Wed', 'बुध'], [4, 'Thu', 'गुरु'], [5, 'Fri', 'शुक्र'], [6, 'Sat', 'शनि'], [0, 'Sun', 'रवि']] as const
  async function save() {
    if (f.start >= f.end) return toast(L('End must be after start.', 'शेवटची वेळ सुरुवातीनंतर हवी.'), false)
    setBusy(true)
    const { error } = await saveSetting('slots', f)
    setBusy(false)
    if (error) return toast(L('Only the doctor can change slots.', 'फक्त डॉक्टर वेळा बदलू शकतात.'), false)
    toast(L('Slots saved ✓', 'वेळा सेव्ह ✓')); onSaved(); onClose()
  }
  return (
    <Modal title={L('Available slots', 'उपलब्ध वेळा')} onClose={onClose}>
      <p className="dlabel">{L('Clinic days', 'क्लिनिकचे दिवस')}</p>
      <div className="mt-1 flex flex-wrap gap-2">{DAYS.map(([n, en, mr]) => {
        const on = f.days.includes(n)
        return <button key={n} onClick={() => setF({ ...f, days: on ? f.days.filter((x) => x !== n) : [...f.days, n] })} aria-pressed={on} className={`rounded-xl px-3 text-sm font-bold ${on ? 'bg-emerald text-white' : 'bg-sand'}`} style={{ minHeight: 40 }}>{L(en, mr)}</button>
      })}</div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <label className="dlabel">{L('From', 'पासून')}<input type="time" className="dfield mt-1" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
        <label className="dlabel">{L('To', 'पर्यंत')}<input type="time" className="dfield mt-1" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
        <label className="dlabel">{L('Slot (min)', 'स्लॉट (मि.)')}<select className="dfield mt-1" value={f.length} onChange={(e) => setF({ ...f, length: parseInt(e.target.value) })}>{[15, 20, 30, 45, 60].map((n) => <option key={n}>{n}</option>)}</select></label>
      </div>
      <label className="dlabel mt-3">{L('Location', 'ठिकाण')}<input className="dfield mt-1" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
      <button onClick={save} disabled={busy} className="dbtn e mt-4 w-full">{busy ? <Spinner /> : L('Save slots', 'वेळा सेव्ह')}</button>
    </Modal>
  )
}

export default function DAppointments({ go, onChange }: { go: (h: string) => void; onChange: () => void }) {
  const L = useL()
  const { i18n } = useTranslation()
  const toast = useToast()
  const { profile } = useAuth()
  const [wk, setWk] = useState(0)
  const mon = mondayOf(wk)
  const from = isoAt(mon, '00:00')
  const to = isoAt(new Date(mon.getTime() + 7 * 864e5), '00:00')
  const q = useAppointments(from, to)
  const set = useSettings()
  const slots = { ...DEF, ...((set.data?.find((x) => x.key === 'slots')?.value as Partial<Slots>) ?? {}) }
  const [form, setForm] = useState<{ appt?: DAppt; preset?: Partial<DAppt> } | null>(null)
  const [slotEdit, setSlotEdit] = useState(false)
  const lastMon = mondayOf(wk - 1)
  const prev = useAppointments(isoAt(lastMon, '00:00'), from)

  const days = Array.from({ length: 7 }, (_, i) => new Date(mon.getTime() + i * 864e5)).filter((d) => slots.days.includes(d.getUTCDay()) || (q.data ?? []).some((a) => dayKey(a.starts_at) === d.toISOString().slice(0, 10)))
  const times = useMemo(() => {
    const out: string[] = []
    const [sh, sm] = slots.start.split(':').map(Number), [eh, em] = slots.end.split(':').map(Number)
    for (let m = sh * 60 + sm; m < eh * 60 + em; m += slots.length) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    for (const a of q.data ?? []) { const t = hhmmOf(a.starts_at); if (!out.includes(t)) out.push(t) }
    return out.sort()
  }, [slots.start, slots.end, slots.length, q.data])
  const list = q.data ?? []
  const at = (d: Date, t: string) => list.filter((a) => dayKey(a.starts_at) === d.toISOString().slice(0, 10) && hhmmOf(a.starts_at) === t)
  const todayKey = ist(new Date()).toISOString().slice(0, 10)
  const stat = (k: string) => list.filter((a) => a.kind === k).length
  const paid = list.filter((a) => a.paid).reduce((s, a) => s + (a.amount ?? 0), 0)

  async function quick(a: DAppt, status: string) {
    const { error } = await saveAppt({ id: a.id, name: a.name, starts_at: a.starts_at, status })
    toast(error ? L('Failed', 'झालं नाही') : L('Updated ✓', 'बदललं ✓'), !error)
    q.reload(); onChange()
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Appointments', 'भेटी')}
        sub={`${fmtDate(mon.toISOString(), i18n.language)} – ${fmtDate(new Date(mon.getTime() + 6 * 864e5).toISOString(), i18n.language)} · ${slots.location} ${slots.start}–${slots.end}`}
        right={<>
          <div className="flex rounded-xl border border-line bg-white">
            <button onClick={() => setWk(wk - 1)} className="px-3" aria-label="Previous week" style={{ minHeight: 42 }}>‹</button>
            <button onClick={() => setWk(0)} className="px-3 text-sm font-semibold" style={{ minHeight: 42 }}>{L('This week', 'हा आठवडा')}</button>
            <button onClick={() => setWk(wk + 1)} className="px-3" aria-label="Next week" style={{ minHeight: 42 }}>›</button>
          </div>
          {profile?.role === 'doctor' && <button onClick={() => setSlotEdit(true)} className="dbtn g">{L('Edit available slots', 'वेळा बदला')}</button>}
          <button onClick={() => setForm({})} className="dbtn p">+ {L('Book', 'बुक करा')}</button>
        </>} />
      {!q.data ? <Skeleton className="h-96" /> : (
        <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
          <Dc className="min-w-0 overflow-x-auto p-3!">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
              <thead><tr><th className="w-14" />{days.map((d) => {
                const k = d.toISOString().slice(0, 10)
                return <th key={k} className={`rounded-lg py-2 font-display text-[15px] ${k === todayKey ? 'bg-emerald text-white' : 'bg-sand'}`}>{d.toLocaleDateString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })}</th>
              })}</tr></thead>
              <tbody>{times.map((t) => (
                <tr key={t}><td className="pr-1 text-right align-top font-latin text-xs text-mu">{t}</td>
                  {days.map((d) => {
                    const items = at(d, t)
                    const closed = !slots.days.includes(d.getUTCDay())
                    return (
                      <td key={d.toISOString() + t} className="align-top">
                        {items.length ? items.map((a) => (
                          <button key={a.id} onClick={() => setForm({ appt: a })} className={`pop mb-1 block w-full rounded-lg border-l-4 p-1.5 text-left ${KIND_STYLE[a.kind]} ${a.status === 'no_show' ? 'opacity-50 line-through' : ''}`} style={{ minHeight: 0 }}>
                            <b className="block truncate text-[13px]">{a.name}</b>
                            <span className="block truncate text-[11px]">{kindLabel(a.kind, L)}{a.paid ? ` · ₹${a.amount ?? ''} ✓` : ''}{a.status === 'done' ? ' · ✓' : ''}</span>
                          </button>
                        )) : closed ? <span className="block h-10 rounded-lg bg-sand/40" /> : (
                          <button onClick={() => setForm({ preset: { starts_at: isoAt(d, t), name: '' } })} className="block h-10 w-full rounded-lg border border-dashed border-line text-xs text-mu opacity-0 transition-opacity hover:opacity-100 focus:opacity-100" style={{ minHeight: 40 }} aria-label={L(`Book ${t}`, `${t} बुक`)}>+</button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}</tbody>
            </table>
            {list.length === 0 && <p className="p-3 text-center text-sm text-mu">{L('No appointments this week. Tap an empty slot or “+ Book”.', 'या आठवड्यात भेटी नाहीत. रिकाम्या वेळेवर टॅप करा किंवा “+ बुक करा”.')}</p>}
          </Dc>
          <div className="flex flex-col gap-4">
            <Dc i={1}>
              <h2 className="font-display text-[19px] font-bold">{L('This week', 'हा आठवडा')}</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex justify-between"><span>{L('First consults', 'पहिल्या भेटी')}</span><b className="font-latin">{stat('first_consult')}</b></li>
                <li className="flex justify-between"><span>{L('Reviews', 'रिव्ह्यू')}</span><b className="font-latin">{stat('review')}</b></li>
                <li className="flex justify-between"><span>{L('Maintenance', 'मेंटेनन्स')}</span><b className="font-latin">{stat('maintenance')}</b></li>
                <li className="flex justify-between"><span>{L('Video calls', 'व्हिडिओ कॉल')}</span><b className="font-latin">{stat('video')}</b></li>
                <li className="flex justify-between border-t border-line pt-1.5"><span>{L('Paid assessments', 'मिळालेली फी')}</span><b className="font-latin">₹{paid.toLocaleString('en-IN')}</b></li>
              </ul>
            </Dc>
            <Dc i={2}>
              <h2 className="font-display text-[19px] font-bold">{L('Reminders', 'आठवण')}</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex justify-between"><span>{L('24-hr sent', '24 तास आधी पाठवली')}</span><b className="font-latin">{list.filter((a) => a.reminded_at).length} / {list.length}</b></li>
                <li className="flex justify-between"><span>{L('Confirmed', 'पक्कं')}</span><b className="font-latin">{list.filter((a) => a.status === 'confirmed' || a.status === 'done').length}</b></li>
                <li className="flex justify-between"><span>{L('Not confirmed', 'पक्कं नाही')}</span><b className="font-latin">{list.filter((a) => a.status === 'booked').length}</b></li>
                <li className="flex justify-between"><span>{L('Last week no-shows', 'मागच्या आठवड्यात आले नाहीत')}</span><b className="font-latin">{(prev.data ?? []).filter((a) => a.status === 'no_show').length}</b></li>
              </ul>
              <p className="mt-2 text-xs text-mu">{L('Automatic WhatsApp reminders start when the WhatsApp number goes live.', 'WhatsApp नंबर सुरू झाल्यावर आठवण आपोआप जाईल.')}</p>
            </Dc>
            <Dc i={3}>
              <h2 className="font-display text-[19px] font-bold">{L('Legend', 'रंग')}</h2>
              <ul className="mt-2 space-y-1.5 text-sm">{(['first_consult', 'review', 'maintenance', 'video'] as const).map((k) => <li key={k} className="flex items-center gap-2"><span className={`h-3 w-3 rounded border-l-4 ${KIND_STYLE[k]}`} />{kindLabel(k, L)}</li>)}</ul>
            </Dc>
            {list.filter((a) => dayKey(a.starts_at) === todayKey && (a.status === 'booked' || a.status === 'confirmed')).length > 0 && (
              <Dc i={4}>
                <h2 className="font-display text-[19px] font-bold">{L('Today — mark', 'आज — नोंद करा')}</h2>
                <ul className="mt-2 space-y-2">{list.filter((a) => dayKey(a.starts_at) === todayKey && (a.status === 'booked' || a.status === 'confirmed')).map((a) => (
                  <li key={a.id} className="text-sm"><b>{fmtTime(a.starts_at, i18n.language)} · {a.name}</b>
                    <div className="mt-1 flex gap-1.5"><button onClick={() => quick(a, 'done')} className="mini bg-emerald text-white">✓ {L('Came', 'आले')}</button><button onClick={() => quick(a, 'no_show')} className="mini bg-sand">{L('No-show', 'आले नाहीत')}</button>
                      {a.patient_id && <button onClick={() => go(`p/${a.patient_id}`)} className="mini bg-sand">{L('Open', 'उघडा')}</button>}</div></li>
                ))}</ul>
              </Dc>
            )}
          </div>
        </div>
      )}
      {form && <ApptForm appt={form.appt} preset={form.preset} onClose={() => setForm(null)} onSaved={() => { q.reload(); onChange() }} />}
      {slotEdit && <SlotEditor s={slots} onClose={() => setSlotEdit(false)} onSaved={set.reload} />}
    </div>
  )
}

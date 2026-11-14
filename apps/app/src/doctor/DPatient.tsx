import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { VoicePlayer, VoiceRecorder } from '../components/Voice'
import { WeightChart } from '../patient/Progress'
import { addNote, deleteNote, markThreadRead, saveStory, sendMessage, uploadVoice, useDoctorPatient, useTemplates, type DPatient as DP, type DPlan } from '../lib/doctor'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { haptic } from '../lib/feel'
import AlertList from './AlertList'
import ApptForm from './ApptForm'
import PatientForm from './PatientForm'
import PlanEditor from './PlanEditor'
import PlateCard from './PlateCard'
import { kindLabel } from './DToday'
import { Av, Dc, Empty, Spinner, fmtDate, fmtTime, useL, waLink } from './ui'

const TABS = [['overview', 'Overview', 'आढावा'], ['checkins', 'Check-ins', 'चेक-इन'], ['plan', 'Plan', 'प्लॅन'], ['notes', 'Notes', 'नोंदी'], ['consents', 'Consents', 'संमती'], ['messages', 'Messages', 'संदेश']] as const
type Tab = (typeof TABS)[number][0]
const COND: Record<string, [string, string]> = { diabetes: ['Diabetes', 'मधुमेह'], thyroid: ['Thyroid', 'थायरॉईड'], pcod: ['PCOD', 'PCOD'], bp: ['BP', 'BP'], pregnancy: ['Pregnancy', 'गर्भावस्था'], other: ['Other', 'इतर'] }
const TAGTONE: Record<string, string> = { balanced: 't-em', rice_extra: 't-amb', low_veg: 't-amb', fried: 't-co', sweet: 't-co', unclear: 't-gr' }

function ymd(d: Date) { return new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10) }

function Overview({ d, L, go, setTab }: { d: DP; L: (a: string, b: string) => string; go: (h: string) => void; setTab: (t: Tab) => void }) {
  const { i18n } = useTranslation()
  const { t } = useTranslation('p')
  const { profile } = useAuth()
  const tpl = useTemplates()
  const p = d.patient
  const pts = d.logs.filter((l) => l.weight_kg).map((l) => ({ d: l.log_date, w: Number(l.weight_kg) }))
  const now = pts.length ? Math.round(pts[pts.length - 1].w * 10) / 10 : undefined
  const active = new Set([...d.logs.map((l) => l.log_date), ...d.checkins.map((c) => c.log_date ?? '')])
  const today = ymd(new Date())
  const start = p.start_date ? new Date(p.start_date + 'T00:00:00+05:30') : null
  const days = start ? Math.max(1, Math.min(84, Math.floor((Date.now() - start.getTime()) / 864e5) + 1)) : 0
  const cal = start ? Array.from({ length: days }, (_, i) => ymd(new Date(start.getTime() + i * 864e5))) : []
  const rate = cal.length ? Math.round((cal.filter((x) => active.has(x)).length / cal.length) * 100) : 0
  const waist = d.measurements.filter((m) => m.waist_cm)
  const w0 = waist[0]?.waist_cm, w1 = waist[waist.length - 1]?.waist_cm
  const water = d.logs.slice(-7).filter((l) => l.water_glasses != null)
  const avgWater = water.length ? (water.reduce((s, l) => s + (l.water_glasses ?? 0), 0) / water.length).toFixed(1) : '—'
  const last6 = Array.from({ length: 6 }, (_, i) => ymd(new Date(Date.now() - (5 - i) * 864e5)))
  const plan = d.plans.find((x) => x.status === 'approved' || x.status === 'sent')
  const diet = tpl.data?.find((x) => x.id === p.diet_template_id)
  const work = tpl.data?.find((x) => x.id === p.workout_template_id)
  const consent = (k: string) => d.consents.find((c) => c.type === k)
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Dc i={1}>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-[19px] font-bold">{L('Weight', 'वजन')}</h2>
            <span className="text-sm text-mu">{L('Start', 'सुरुवात')} <b className="font-latin text-ink">{p.start_weight ?? '—'}</b> · {L('Now', 'आता')} <b className="font-latin text-emerald">{now ?? '—'}</b> · {L('Target', 'लक्ष्य')} <b className="font-latin text-ink">{p.target_weight ?? '—'}</b></span></div>
          {pts.length >= 2 ? <WeightChart points={pts} /> : <Empty>{L('Weight graph appears after 2 entries.', '2 नोंदींनंतर ग्राफ दिसेल.')}</Empty>}
        </Dc>
        <div className="grid grid-cols-3 gap-3">
          <div className="dc rise" style={{ '--i': 2 } as React.CSSProperties}><p className="text-sm text-mu">{L('Check-in rate', 'चेक-इन दर')}</p><p className="mt-1 font-latin text-2xl font-bold">{rate}%</p></div>
          <div className="dc rise" style={{ '--i': 3 } as React.CSSProperties}><p className="text-sm text-mu">{L('Waist', 'कंबर')}</p><p className="mt-1 font-latin text-2xl font-bold">{w1 ?? '—'}{w0 && w1 && w0 !== w1 ? <span className="ml-1 text-sm text-emerald">{(w1 - w0).toFixed(0)}</span> : null}</p></div>
          <div className="dc rise" style={{ '--i': 4 } as React.CSSProperties}><p className="text-sm text-mu">{L('Avg water', 'सरासरी पाणी')}</p><p className="mt-1 font-latin text-2xl font-bold">{avgWater} <span className="text-sm text-mu">gl</span></p></div>
        </div>
        {cal.length > 0 && (
          <Dc i={5}>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-[19px] font-bold">{L('Check-in calendar', 'चेक-इन कॅलेंडर')}</h2><span className="text-sm text-mu">{fmtDate(cal[0], i18n.language)} – {fmtDate(cal[cal.length - 1], i18n.language)}</span></div>
            <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
              {cal.map((x, i) => <span key={x} title={x} className={`grow flex aspect-square items-center justify-center rounded-lg font-latin text-[11px] font-semibold ${x === today ? 'bg-coral text-white' : active.has(x) ? 'bg-emerald text-white' : 'bg-redl text-red'}`} style={{ '--i': Math.min(i, 20) } as React.CSSProperties}>{i + 1}</span>)}
            </div>
            <div className="mt-2 flex gap-3 text-xs text-mu"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-emerald" />{L('Done', 'झालं')}</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-redl" />{L('Missed', 'चुकलं')}</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded bg-coral" />{L('Today', 'आज')}</span></div>
          </Dc>
        )}
        <Dc i={6}>
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[19px] font-bold">{L('Plate check-ins', 'ताट चेक-इन')}</h2><span className="text-sm text-mu">{L('Last 6 days', 'मागचे 6 दिवस')}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {last6.map((day) => {
              const c = d.checkins.find((x) => x.log_date === day)
              return (
                <button key={day} onClick={() => setTab('checkins')} className="rounded-xl bg-sand/70 p-2 text-center" style={{ minHeight: 0 }}>
                  <p className="text-xs font-semibold">{fmtDate(day, i18n.language, { weekday: 'short' })}</p>
                  {c ? <span className={`tag mt-1 ${TAGTONE[c.ai_tag ?? ''] ?? 't-em'}`}>{c.ai_tag ? t(`ai.tags.${c.ai_tag}`).replace(' 👍', '') : t(`checkin.${c.meal}`)}</span> : <span className="tag t-red mt-1">{L('Missed', 'नाही')}</span>}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-mu">{L('Tap a plate → react “छान!” or add a 1-line tip. Patient gets it in the app.', 'ताटावर टॅप करा → “छान!” किंवा एक ओळ टीप. पेशंटला ॲपमध्ये दिसेल.')}</p>
        </Dc>
      </div>
      <div className="flex flex-col gap-4">
        {profile?.role === 'doctor' && (
          <Dc i={2}>
            <div className="flex items-baseline justify-between"><h2 className="font-display text-[19px] font-bold">{L('Medical notes', 'वैद्यकीय नोंदी')}</h2><span className="tag t-red">🔒 {L('Doctor only', 'फक्त डॉक्टर')}</span></div>
            {d.notes?.length ? <p className="mt-2 whitespace-pre-line text-sm">{d.notes[0].body}</p> : <p className="mt-2 text-sm text-mu">{L('No notes yet.', 'अजून नोंद नाही.')}</p>}
            <button onClick={() => setTab('notes')} className="mt-2 text-sm font-semibold text-emerald" style={{ minHeight: 32 }}>{L('All notes →', 'सर्व नोंदी →')}</button>
          </Dc>
        )}
        <Dc i={3}>
          <h2 className="font-display text-[19px] font-bold">{L('Assigned plan', 'दिलेला प्लॅन')}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex justify-between gap-2"><span className="text-mu">{L('Diet', 'आहार')}</span><b className="text-right">{diet ? diet.name : '—'}{plan ? ` · ${L('Week', 'आठवडा')} ${plan.week_no}` : ''}</b></li>
            <li className="flex justify-between gap-2"><span className="text-mu">{L('Workout', 'व्यायाम')}</span><b className="text-right">{work?.name ?? plan?.body.workout ?? '—'}</b></li>
            <li className="flex justify-between gap-2"><span className="text-mu">{L('Focus', 'लक्ष्य')}</span><b className="text-right">{plan?.focus_goal ?? '—'}</b></li>
          </ul>
          <button onClick={() => setTab('plan')} className="mt-2 text-sm font-semibold text-emerald" style={{ minHeight: 32 }}>{L('Plans →', 'प्लॅन →')}</button>
        </Dc>
        <Dc i={4}>
          <h2 className="font-display text-[19px] font-bold">{L('Consents', 'संमती')}</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {([['health_data', 'Health data storage', 'आरोग्य माहिती'], ['story', 'Photos in marketing', 'मार्केटिंगमध्ये फोटो'], ['reminders', 'Reminders', 'आठवण']] as const).map(([k, en, mr]) => {
              const c = consent(k)
              return <li key={k} className="flex justify-between gap-2"><span>{L(en, mr)}</span><span className={`tag ${c?.granted ? 't-em' : 't-gr'}`}>{c ? (c.granted ? `${L('Given', 'दिली')} · ${fmtDate(c.created_at, i18n.language)}` : L('Not given', 'नाही')) : L('Not asked', 'विचारलं नाही')}</span></li>
            })}
            <li className="flex justify-between gap-2"><span>{L('Testimonial', 'अनुभव')}</span><span className="tag t-amb">{d.stories.length ? d.stories[0].status : p.week && p.week < 4 ? L('Ask at Week 4', 'आठवडा 4 ला विचारा') : L('Not asked', 'विचारलं नाही')}</span></li>
          </ul>
        </Dc>
        {d.appointments.length > 0 && (
          <Dc i={5}>
            <h2 className="font-display text-[19px] font-bold">{L('Appointments', 'भेटी')}</h2>
            <ul className="mt-2 space-y-1.5 text-sm">{d.appointments.slice(0, 4).map((a) => (
              <li key={a.id} className="flex justify-between gap-2"><span>{fmtDate(a.starts_at, i18n.language)} · {fmtTime(a.starts_at, i18n.language)}</span><span className="tag t-gr">{kindLabel(a.kind, L)} · {a.status}</span></li>
            ))}</ul>
            <button onClick={() => go('appointments')} className="mt-2 text-sm font-semibold text-emerald" style={{ minHeight: 32 }}>{L('Calendar →', 'कॅलेंडर →')}</button>
          </Dc>
        )}
      </div>
    </div>
  )
}

function Notes({ d, reload, L }: { d: DP; reload: () => void; L: (a: string, b: string) => string }) {
  const { i18n } = useTranslation()
  const toast = useToast()
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  if (d.notes === null) return <Empty>🔒 {L('Medical notes are visible to the doctor only.', 'वैद्यकीय नोंदी फक्त डॉक्टरांना दिसतात.')}</Empty>
  async function add() {
    if (!txt.trim()) return
    setBusy(true)
    const { error } = await addNote(d.patient.id, txt.trim())
    setBusy(false)
    if (error) return toast(L('Could not save', 'सेव्ह झालं नाही'), false)
    setTxt(''); toast(L('Note saved ✓', 'नोंद सेव्ह ✓')); reload()
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Dc>
        <h2 className="font-display text-[19px] font-bold">{L('Add medical note', 'वैद्यकीय नोंद जोडा')} <span className="tag t-red">🔒 {L('Doctor only', 'फक्त डॉक्टर')}</span></h2>
        <textarea className="dfield mt-3" rows={6} maxLength={4000} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={L('History, medicines, lab values, observations…', 'इतिहास, औषधं, लॅब रिपोर्ट, निरीक्षण…')} />
        <button onClick={add} disabled={busy || !txt.trim()} className="dbtn e mt-3 w-full disabled:opacity-50">{busy ? <Spinner /> : L('Save note', 'नोंद सेव्ह करा')}</button>
        <p className="mt-2 text-xs text-mu">{L('Staff can never see these notes. Every change is logged.', 'स्टाफला या नोंदी कधीच दिसत नाहीत. प्रत्येक बदलाची नोंद होते.')}</p>
      </Dc>
      <div className="flex flex-col gap-3">
        {d.notes.length === 0 ? <Empty>{L('No notes yet.', 'अजून नोंद नाही.')}</Empty> : d.notes.map((n, i) => (
          <Dc key={n.id} i={i}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs text-mu">{fmtDate(n.created_at, i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(n.created_at, i18n.language)}</span>
              <button onClick={async () => { if (!window.confirm(L('Delete this note?', 'ही नोंद काढायची?'))) return; await deleteNote(n.id); reload() }} className="text-xs text-red" style={{ minHeight: 30 }}>{L('Delete', 'काढा')}</button></div>
            <p className="mt-1 whitespace-pre-line">{n.body}</p>
          </Dc>
        ))}
      </div>
    </div>
  )
}

function Thread({ d, reload, L }: { d: DP; reload: () => void; L: (a: string, b: string) => string }) {
  const { i18n } = useTranslation()
  const toast = useToast()
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState(d.messages)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => setMsgs(d.messages), [d.messages])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])
  useEffect(() => { if (d.messages.some((m) => !m.from_doctor && !m.read_at)) markThreadRead(d.patient.id).then(() => reload()) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Live: naya message aate hi dikhe (Supabase Realtime, RLS respected)
    const ch = supabase.channel(`thread-${d.patient.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${d.patient.id}` }, () => reload()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [d.patient.id]) // eslint-disable-line react-hooks/exhaustive-deps
  async function send(body: string | null, voice: string | null) {
    setBusy(true)
    const tmp = { id: 'tmp' + Date.now(), from_doctor: true, body, voice_path: voice, read_at: null, created_at: new Date().toISOString() }
    setMsgs((m) => [...m, tmp])
    const { error } = await sendMessage(d.patient.id, body, voice)
    setBusy(false)
    if (error) { setMsgs((m) => m.filter((x) => x.id !== tmp.id)); return toast(L('Not sent — try again', 'पाठवलं नाही — पुन्हा करा'), false) }
    haptic(10); reload()
  }
  async function voice(b: Blob) {
    setBusy(true)
    const path = await uploadVoice(b)
    setBusy(false)
    if (!path) return toast(L('Voice upload failed', 'व्हॉइस अपलोड झाला नाही'), false)
    send(null, path)
  }
  return (
    <Dc className="flex flex-col p-0! overflow-hidden">
      {!d.patient.joined && <p className="bg-ambl px-4 py-2 text-sm text-[#B57414]">{L('Patient has not logged in yet — they will see messages once they join the app.', 'पेशंटने अजून लॉगिन केलं नाही — ॲपमध्ये आल्यावर संदेश दिसतील.')}</p>}
      <div className="flex max-h-[60dvh] min-h-[300px] flex-col gap-2 overflow-y-auto bg-sand/40 p-4">
        {msgs.length === 0 && <p className="m-auto text-center text-sm text-mu">{L('No messages yet. A short voice note feels personal 🎙️', 'अजून संदेश नाहीत. छोटी व्हॉइस नोट जास्त आपुलकीची वाटते 🎙️')}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`pop max-w-[85%] rounded-2xl px-3 py-2 ${m.from_doctor ? 'self-end rounded-br-md bg-emerald text-white' : 'self-start rounded-bl-md bg-white'}`}>
            {m.voice_path && <VoicePlayer path={m.voice_path} />}
            {m.body && <p className="whitespace-pre-line">{m.body}</p>}
            <p className={`mt-0.5 text-[11px] ${m.from_doctor ? 'text-white/70' : 'text-mu'}`}>{fmtDate(m.created_at, i18n.language)} · {fmtTime(m.created_at, i18n.language)}{m.from_doctor && m.read_at ? ' · ✓✓' : ''}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
        <VoiceRecorder onDone={voice} label={L('● Voice note', '● व्हॉइस नोट')} stopLabel={L('■ Send', '■ पाठवा')} />
        <input className="dfield min-w-0 flex-1" placeholder={L('Type a message…', 'संदेश लिहा…')} value={txt} maxLength={2000} onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && txt.trim() && !busy) { send(txt.trim(), null); setTxt('') } }} />
        <button disabled={!txt.trim() || busy} onClick={() => { send(txt.trim(), null); setTxt('') }} className="dbtn e disabled:opacity-50">{busy ? <Spinner /> : L('Send', 'पाठवा')}</button>
      </div>
    </Dc>
  )
}

function Plans({ d, reload, L }: { d: DP; reload: () => void; L: (a: string, b: string) => string }) {
  const { i18n } = useTranslation()
  const [edit, setEdit] = useState<DPlan | 'new' | null>(null)
  const next = (d.plans[0]?.week_no ?? (d.patient.week ? d.patient.week - 1 : 0)) + 1
  const STATUS: Record<string, [string, string, string]> = { draft: ['Draft', 'मसुदा', 't-amb'], approved: ['Approved', 'मंजूर', 't-em'], sent: ['Sent', 'पाठवला', 't-em'], archived: ['Rejected', 'नाकारला', 't-gr'] }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {d.patient.doctor_only && <span className="tag t-red">⚕ {L('Doctor-only: AI will not write this plan', 'फक्त डॉक्टर: AI प्लॅन लिहिणार नाही')}</span>}
        <button onClick={() => setEdit('new')} className="dbtn p ml-auto">+ {L(`Plan for week ${next}`, `आठवडा ${next} चा प्लॅन`)}</button>
      </div>
      {d.plans.length === 0 ? <Empty>{L('No plans yet.', 'अजून प्लॅन नाही.')}</Empty> : d.plans.map((x, i) => (
        <Dc key={x.id} i={i}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold">{L(`Week ${x.week_no}`, `आठवडा ${x.week_no}`)}</h3>
            <span className={`tag ${STATUS[x.status]?.[2] ?? 't-gr'}`}>{L(STATUS[x.status]?.[0] ?? x.status, STATUS[x.status]?.[1] ?? x.status)}</span>
            {x.source === 'ai' && <span className="tag t-em">✨ AI draft</span>}
            {x.approved_at && <span className="text-xs text-mu">{fmtDate(x.approved_at, i18n.language)}</span>}
            {x.status !== 'archived' && <button onClick={() => setEdit(x)} className="mini ml-auto bg-sand">{L('Edit', 'बदला')}</button>}
          </div>
          {x.focus_goal && <p className="mt-1 text-sm"><b>{L('Focus', 'लक्ष्य')}:</b> {x.focus_goal}</p>}
          {x.body.days?.length ? <div className="mt-2 grid gap-1">{x.body.days.map((dd) => <p key={dd.label} className="text-sm"><b className="mr-2 inline-block w-10">{dd.label}</b>{dd.meals.map((m) => m.text).join(' · ')}</p>)}</div> : null}
          {x.doctor_note && <p className="mt-2 rounded-xl bg-mintl/60 p-2 text-sm">“{x.doctor_note}”</p>}
        </Dc>
      ))}
      {edit && <PlanEditor patientId={d.patient.id} plan={edit === 'new' ? undefined : edit} nextWeek={next} onClose={() => setEdit(null)} onSaved={reload} />}
    </div>
  )
}

export default function DPatient({ id, tab: tab0, go }: { id: string; tab: string | null; go: (h: string) => void }) {
  const L = useL()
  const toast = useToast()
  const { i18n } = useTranslation()
  const q = useDoctorPatient(id)
  const [tab, setTab] = useState<Tab>(((TABS.map((x) => x[0]) as readonly string[]).includes(tab0 ?? '') ? tab0 : 'overview') as Tab)
  const [edit, setEdit] = useState(false)
  const [book, setBook] = useState(false)
  const [plan, setPlan] = useState(false)
  const d = q.data
  if (q.error && !d) return <Empty>{L('Could not load this patient.', 'हा पेशंट उघडता आला नाही.')} <button className="font-semibold text-emerald" onClick={() => go('patients')}>{L('Back', 'मागे')}</button></Empty>
  if (!d?.patient) return <div className="flex flex-col gap-4"><Skeleton className="h-36" /><Skeleton className="h-80" /></div>
  const p = d.patient
  const age = p.dob ? Math.floor((Date.now() - Date.parse(p.dob)) / (365.25 * 864e5)) : null
  const streak = (() => {
    const act = new Set([...d.logs.map((l) => l.log_date), ...d.checkins.map((c) => c.log_date ?? '')])
    let n = 0
    for (let i = act.has(ymd(new Date())) ? 0 : 1; i < 120; i++) { if (act.has(ymd(new Date(Date.now() - i * 864e5)))) n++; else break }
    return n
  })()
  const unread = d.messages.filter((m) => !m.from_doctor && !m.read_at).length
  const setT = (t: Tab) => { setTab(t); history.replaceState(null, '', `#/p/${id}/${t}`) } // replaceState: no hashchange → no remount
  return (
    <div className="flex flex-col gap-4">
      <p className="rise text-sm text-mu"><button onClick={() => go('patients')} className="font-semibold text-emerald" style={{ minHeight: 32 }}>{L('Patients', 'पेशंट्स')}</button> / {p.full_name}</p>
      <Dc>
        <div className="flex flex-wrap items-center gap-4">
          <Av name={p.full_name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">{p.full_name}</h1>
            <p className="text-sm text-mu">{[age ? L(`${age} yrs`, `${age} वर्षे`) : null, p.city, p.start_date ? L(`joined ${fmtDate(p.start_date, 'en')}`, `सुरुवात ${fmtDate(p.start_date, i18n.language)}`) : null].filter(Boolean).join(' · ')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="tag t-em">{p.program === '12w' ? '12-week' : p.program}{p.week ? ` · ${L('Week', 'आठवडा')} ${p.week}` : ''}</span>
              {streak > 0 && <span className="tag t-amb">🔥 {L(`Streak ${streak} days`, `सलग ${streak} दिवस`)}</span>}
              {p.conditions.map((c) => <span key={c} className="tag t-red">{L(COND[c]?.[0] ?? c, COND[c]?.[1] ?? c)}</span>)}
              {p.on_medication && <span className="tag t-red">{L('On medication', 'औषधं चालू')}</span>}
              {!p.joined && <span className="tag t-gr">{L('Not on app yet', 'अजून ॲपवर नाही')}</span>}
              {p.status !== 'active' && <span className="tag t-gr">{p.status}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setBook(true)} className="dbtn g">{L('Book review', 'रिव्ह्यू बुक')}</button>
            <button onClick={() => setPlan(true)} className="dbtn g">{L('Update plan', 'प्लॅन बदला')}</button>
            <button onClick={() => setT('messages')} className="dbtn e">● {L('Record voice note', 'व्हॉइस नोट')}</button>
            <button onClick={() => setEdit(true)} className="dbtn g" aria-label={L('Edit details', 'माहिती बदला')}>✎</button>
            {waLink(p.phone) && <a href={waLink(p.phone)!} target="_blank" rel="noreferrer" className="dbtn g">WhatsApp</a>}
          </div>
        </div>
      </Dc>
      {d.alerts.some((a) => a.status !== 'resolved') && <AlertList alerts={d.alerts.map((a) => ({ ...a, full_name: p.full_name, phone: p.phone, patient_id: p.id }))} onChange={q.reload} />}
      <div className="rise -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="tablist">
        {TABS.map(([k, en, mr]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setT(k)} className={`relative shrink-0 rounded-xl px-4 text-[15px] font-semibold ${tab === k ? 'bg-ink text-white' : 'bg-white text-ink/70'}`} style={{ minHeight: 42 }}>
            {L(en, mr)}{k === 'messages' && unread > 0 && <span className="ml-1.5 rounded-full bg-coral px-1.5 text-xs text-white">{unread}</span>}
          </button>
        ))}
      </div>
      <div key={tab} className="fade-in">
        {tab === 'overview' && <Overview d={d} L={L} go={go} setTab={setT} />}
        {tab === 'checkins' && (d.checkins.length === 0 ? <Empty>{L('No plate photos yet.', 'अजून ताटाचे फोटो नाहीत.')}</Empty> : <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{d.checkins.map((c, i) => <PlateCard key={c.id} c={c} i={i} showName={false} />)}</ul>)}
        {tab === 'plan' && <Plans d={d} reload={q.reload} L={L} />}
        {tab === 'notes' && <Notes d={d} reload={q.reload} L={L} />}
        {tab === 'consents' && (
          <Dc>
            {d.consents.length === 0 ? <Empty>{L('Patient has not logged in yet, so no consents recorded.', 'पेशंटने अजून लॉगिन केलं नाही, संमती नोंद नाही.')}</Empty> : (
              <ul className="divide-y divide-line">{d.consents.map((c) => (
                <li key={c.type} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold">{({ health_data: L('Health data storage', 'आरोग्य माहिती'), ai_drafts: L('AI help (plate tags, plan drafts)', 'AI मदत'), reminders: L('Reminders', 'आठवण'), story: L('Share story (name hidden)', 'कथा शेअर (नाव लपवून)') } as Record<string, string>)[c.type] ?? c.type}</span>
                  <span className={`tag ${c.granted ? 't-em' : 't-gr'}`}>{c.granted ? L('Given', 'दिली') : L('Not given', 'नाही')} · {fmtDate(c.created_at, i18n.language)}</span></li>
              ))}</ul>
            )}
            <p className="mt-3 text-xs text-mu">{L('Only the patient can change consents (from their app). Every change is kept as history.', 'संमती फक्त पेशंट (त्यांच्या ॲपमधून) बदलू शकतात. प्रत्येक बदलाचा इतिहास राहतो.')}</p>
            {!d.stories.length && <button onClick={async () => { const { error } = await saveStory({ patient_id: p.id, status: 'requested', kind: 'text' }); toast(error ? L('Failed', 'झालं नाही') : L('Testimonial request added ✓', 'अनुभव विनंती जोडली ✓'), !error); q.reload() }} className="dbtn g mt-3">{L('Ask for testimonial', 'अनुभव विचारा')}</button>}
          </Dc>
        )}
        {tab === 'messages' && <Thread d={d} reload={q.reload} L={L} />}
      </div>
      {edit && <PatientForm p={p} onClose={() => setEdit(false)} onSaved={q.reload} />}
      {book && <ApptForm preset={{ name: p.full_name, phone: p.phone, kind: 'review', patient_id: p.id }} onClose={() => setBook(false)} onSaved={q.reload} />}
      {plan && <PlanEditor patientId={p.id} plan={d.plans.find((x) => x.status === 'draft')} nextWeek={(d.plans[0]?.week_no ?? 0) + 1} onClose={() => setPlan(false)} onSaved={q.reload} />}
    </div>
  )
}

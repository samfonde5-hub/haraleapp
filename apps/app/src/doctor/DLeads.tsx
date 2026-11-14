import { useEffect, useState } from 'react'
import { Skeleton, useToast } from '../components/Toast'
import { convertLead, saveLead, useLeads, type Lead } from '../lib/doctor'
import { haptic } from '../lib/feel'
import ApptForm from './ApptForm'
import LeadForm from './LeadForm'
import { Dc, Modal, PageHead, Spinner, mask, useL, waLink } from './ui'

const STAGES = [['new', 'New', 'नवीन'], ['qualified', 'Qualified', 'पात्र'], ['booked', 'Consult booked', 'भेट बुक'], ['joined', 'Joined', 'जॉइन'], ['lost', 'Lost', 'गेले']] as const
type Stage = (typeof STAGES)[number][0]
const age = (iso: string) => { const m = (Date.now() - Date.parse(iso)) / 60000; return m < 60 ? `${Math.max(1, Math.round(m))}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d` }

function csv(rows: Lead[]) {
  const cols = ['full_name', 'phone', 'source', 'keyword', 'stage', 'goal', 'medical', 'tried_before', 'can_come', 'note', 'created_at'] as const
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const blob = new Blob(['﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `chinmay-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function LeadDetail({ lead, onClose, onChanged, go }: { lead: Lead; onClose: () => void; onChanged: () => void; go: (h: string) => void }) {
  const L = useL()
  const toast = useToast()
  const [mode, setMode] = useState<'view' | 'edit' | 'book' | 'convert' | 'lost'>('view')
  const [email, setEmail] = useState('')
  const [sw, setSw] = useState('')
  const [tw, setTw] = useState('')
  const [reason, setReason] = useState('Cost')
  const [retry, setRetry] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  async function convert() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return toast(L('Enter the email they will log in with.', 'ते ज्या ईमेलने लॉगिन करतील तो टाका.'), false)
    setBusy(true)
    const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) && x >= 20 && x <= 300 ? x : null }
    const { data, error } = await convertLead(lead.id, email, n(sw), n(tw))
    setBusy(false)
    if (error) return toast(error.message.includes('duplicate') ? L('This email is already used by another patient.', 'हा ईमेल आधीच वापरला आहे.') : L('Could not convert.', 'झालं नाही.'), false)
    haptic(25); toast(L('Patient created ✓ They get linked when they log in with this email.', 'पेशंट बनला ✓ या ईमेलने लॉगिन करताच जोडले जातील.'))
    onChanged(); onClose(); go(`p/${data}`)
  }
  async function markLost() {
    setBusy(true)
    const { error } = await saveLead({ id: lead.id, full_name: lead.full_name, stage: 'lost', lost_reason: reason, retry_at: retry || null })
    setBusy(false)
    toast(error ? L('Failed', 'झालं नाही') : L('Marked lost — re-try date saved', 'गेले म्हणून नोंद — पुन्हा प्रयत्न तारीख सेव्ह'), !error)
    onChanged(); onClose()
  }
  if (mode === 'edit') return <LeadForm lead={lead} onClose={onClose} onSaved={onChanged} />
  if (mode === 'book') return <ApptForm preset={{ name: lead.full_name, phone: lead.phone, kind: 'first_consult', lead_id: lead.id, amount: 499 }} onClose={onClose}
    onSaved={async () => { if (lead.stage === 'new' || lead.stage === 'qualified') await saveLead({ id: lead.id, full_name: lead.full_name, stage: 'booked' }); onChanged() }} />
  return (
    <Modal title={lead.full_name} onClose={onClose}>
      <div className="flex flex-wrap gap-1.5">
        {lead.keyword && <span className="tag t-amb">“{lead.keyword}”</span>}
        <span className="tag t-gr">{lead.source}</span>
        <span className="tag t-em">{L(`${lead.answers_count}/4 answered`, `${lead.answers_count}/4 उत्तरं`)}</span>
        {lead.is_demo && <span className="tag t-gr">Demo</span>}
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        {([['Phone', 'फोन', lead.phone], ['Goal', 'लक्ष्य', lead.goal], ['Medical', 'आजार', lead.medical], ['Tried before', 'आधी काय केलं', lead.tried_before], ['Can come', 'कधी येतील', lead.can_come], ['Note', 'नोंद', lead.note], ['Lost reason', 'कारण', lead.lost_reason], ['Re-try on', 'पुन्हा संपर्क', lead.retry_at]] as const)
          .filter(([, , v]) => v).map(([en, mr, v]) => <div key={en} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-mu">{L(en, mr)}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      {mode === 'convert' ? (
        <div className="mt-4 grid gap-2 rounded-2xl bg-mintl/60 p-3">
          <label className="dlabel">{L('Email for app login *', 'ॲप लॉगिनसाठी ईमेल *')}<input className="dfield mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="dlabel">{L('Start weight', 'सुरुवातीचं वजन')}<input className="dfield mt-1" inputMode="decimal" value={sw} onChange={(e) => setSw(e.target.value)} /></label>
            <label className="dlabel">{L('Target weight', 'लक्ष्य वजन')}<input className="dfield mt-1" inputMode="decimal" value={tw} onChange={(e) => setTw(e.target.value)} /></label>
          </div>
          <button onClick={convert} disabled={busy} className="dbtn e">{busy ? <Spinner /> : L('Create patient', 'पेशंट बनवा')}</button>
        </div>
      ) : mode === 'lost' ? (
        <div className="mt-4 grid gap-2 rounded-2xl bg-redl/60 p-3">
          <label className="dlabel">{L('Reason', 'कारण')}<select className="dfield mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
            {['Cost', 'Timing', 'Distance', 'Not interested', 'No reply', 'Other'].map((r) => <option key={r}>{r}</option>)}</select></label>
          <label className="dlabel">{L('Re-try on', 'पुन्हा संपर्क तारीख')}<input type="date" className="dfield mt-1" value={retry} onChange={(e) => setRetry(e.target.value)} /></label>
          <button onClick={markLost} disabled={busy} className="dbtn g">{busy ? <Spinner /> : L('Mark lost', 'गेले म्हणून नोंद')}</button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {lead.patient_id ? <button onClick={() => { onClose(); go(`p/${lead.patient_id}`) }} className="dbtn e col-span-2">{L('Open patient →', 'पेशंट उघडा →')}</button> : <>
            <button onClick={() => setMode('book')} className="dbtn p">{L('Book consult', 'भेट बुक करा')}</button>
            <button onClick={() => setMode('convert')} className="dbtn e">{L('Joined → patient', 'जॉइन → पेशंट')}</button>
          </>}
          {waLink(lead.phone) && <a href={waLink(lead.phone)!} target="_blank" rel="noreferrer" className="dbtn g">WhatsApp</a>}
          {lead.phone && <a href={`tel:${lead.phone}`} className="dbtn g">{L('Call', 'कॉल')}</a>}
          <button onClick={() => setMode('edit')} className="dbtn g">{L('Edit', 'बदला')}</button>
          {lead.stage !== 'lost' && !lead.patient_id && <button onClick={() => setMode('lost')} className="dbtn g text-red">{L('Mark lost', 'गेले')}</button>}
        </div>
      )}
    </Modal>
  )
}

export default function DLeads({ go, onChange, sub }: { go: (h: string) => void; onChange: () => void; sub?: string | null }) {
  const L = useL()
  const toast = useToast()
  const q = useLeads()
  const [kw, setKw] = useState<string | null>(null)
  const [s, setS] = useState('')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<string | null>(sub ?? null)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  useEffect(() => { if (sub) setOpen(sub) }, [sub])
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const all = q.data
  const kws = Object.entries(all.reduce<Record<string, number>>((m, l) => { const k = l.keyword || (l.source === 'website' ? 'Website' : l.source === 'referral' ? 'Referral' : ''); if (k) m[k] = (m[k] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1])
  const list = all.filter((l) => (!kw || l.keyword === kw || (kw === 'Website' && l.source === 'website') || (kw === 'Referral' && l.source === 'referral')) && (!s.trim() || l.full_name.toLowerCase().includes(s.toLowerCase()) || (l.phone ?? '').includes(s)))
  const cur = all.find((l) => l.id === open)
  const reload = () => { q.reload(); onChange() }

  async function move(id: string, stage: Stage) {
    const l = all.find((x) => x.id === id)
    if (!l || l.stage === stage) return
    if (stage === 'joined' && !l.patient_id) { setOpen(id); return toast(L('Add their email to create the patient.', 'पेशंट बनवण्यासाठी ईमेल टाका.')) }
    haptic(10)
    q.setData(all.map((x) => (x.id === id ? { ...x, stage } : x)))
    const { error } = await saveLead({ id, full_name: l.full_name, stage })
    if (error) { toast(L('Move failed', 'हलवता आलं नाही'), false); q.reload() } else onChange()
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Leads', 'लीड्स')} sub={L('Instagram keyword → WhatsApp → 4 questions → consult', 'Instagram कीवर्ड → WhatsApp → 4 प्रश्न → भेट')}
        right={<>
          <input className="dfield w-48!" placeholder={L('Search lead…', 'लीड शोधा…')} value={s} onChange={(e) => setS(e.target.value)} />
          <button onClick={() => csv(list)} className="dbtn g">{L('Export', 'Export')}</button>
          <button onClick={() => setAdding(true)} className="dbtn p">+ {L('Add lead', 'नवीन लीड')}</button>
        </>} />
      <div className="rise flex flex-wrap items-center gap-2">
        <span className="text-sm text-mu">{L('Source keyword:', 'कीवर्ड:')}</span>
        <button onClick={() => setKw(null)} className={`tag t-gr ${!kw ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>{L('All', 'सर्व')}</button>
        {kws.map(([k, n]) => <button key={k} onClick={() => setKw(k)} className={`tag t-amb ${kw === k ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>{/^[A-Z]/.test(k) ? k : `“${k}”`} · {n}</button>)}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {STAGES.map(([st, en, mr], ci) => {
          const col = list.filter((l) => l.stage === st)
          return (
            <section key={st} onDragOver={(e) => { e.preventDefault(); setOver(st) }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) move(drag, st); setDrag(null); setOver(null) }}
              className={`rise w-[78vw] max-w-[300px] shrink-0 snap-start rounded-2xl p-2 transition-colors lg:w-auto lg:max-w-none ${over === st ? 'bg-mintl' : 'bg-sand/70'}`} style={{ '--i': ci } as React.CSSProperties}>
              <h2 className="flex items-center justify-between px-1.5 pb-2 pt-1 font-display font-bold">{L(en, mr)} <span className="font-latin text-sm text-mu">{col.length}</span></h2>
              <ul className="flex flex-col gap-2">
                {col.map((l) => (
                  <li key={l.id} draggable onDragStart={() => setDrag(l.id)} onDragEnd={() => setDrag(null)}>
                    <button onClick={() => setOpen(l.id)} className={`lift w-full rounded-xl border border-line bg-white p-3 text-left ${drag === l.id ? 'opacity-50' : ''}`} style={{ minHeight: 0 }}>
                      <div className="flex items-baseline justify-between gap-2"><b className="truncate">{l.full_name}</b><span className="shrink-0 text-xs text-mu">{age(l.stage === 'new' ? l.created_at : l.stage_changed_at)}</span></div>
                      {l.phone && <p className="text-xs text-mu">{mask(l.phone)}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {l.keyword && <span className="tag t-amb">“{l.keyword}”</span>}
                        {l.goal && <span className="tag t-gr">{L('Goal', 'लक्ष्य')} {l.goal}</span>}
                        {l.medical && <span className="tag t-red">{l.medical}</span>}
                      </div>
                      {st === 'new' && <p className="mt-1.5 text-xs text-mu">{l.answers_count < 4 ? L(`Waiting for answers (${l.answers_count}/4)`, `उत्तरांची वाट (${l.answers_count}/4)`) : L('All 4 answered ✓', '4 उत्तरं ✓')}</p>}
                      {st === 'lost' && l.lost_reason && <p className="mt-1.5 text-xs text-mu">{L('Reason', 'कारण')}: {l.lost_reason}{l.retry_at ? ` · ${L('re-try', 'पुन्हा')} ${l.retry_at}` : ''}</p>}
                      {l.tried_before && st !== 'lost' && <p className="mt-1.5 text-xs text-mu">● {l.tried_before}</p>}
                    </button>
                    {st !== 'joined' && st !== 'lost' && (
                      <div className="mt-1 flex justify-end lg:hidden">
                        <select aria-label={L('Move to', 'इथे हलवा')} value={st} onChange={(e) => move(l.id, e.target.value as Stage)} className="rounded-lg border border-line bg-white px-2 text-xs" style={{ minHeight: 32 }}>
                          {STAGES.map(([v, e2, m2]) => <option key={v} value={v}>{L(e2, m2)}</option>)}
                        </select>
                      </div>
                    )}
                  </li>
                ))}
                {col.length === 0 && <li className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-mu">{L('Drop here', 'इथे टाका')}</li>}
              </ul>
            </section>
          )
        })}
      </div>
      {all.length === 0 && <Dc><p className="text-mu">{L('No leads yet. Add one, or they will flow in from the landing page / WhatsApp once those go live.', 'अजून लीड्स नाहीत. नवीन लीड जोडा — लँडिंग पेज / WhatsApp सुरू झाल्यावर आपोआप येतील.')}</p></Dc>}
      {adding && <LeadForm onClose={() => setAdding(false)} onSaved={reload} />}
      {cur && <LeadDetail key={cur.id} lead={cur} onClose={() => { setOpen(null); if (location.hash.startsWith('#/leads/')) history.replaceState(null, '', '#/leads') }} onChanged={reload} go={go} />}
    </div>
  )
}

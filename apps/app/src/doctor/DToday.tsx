import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { saveStory, useDoctorToday, type useDashboard } from '../lib/doctor'
import { useAuth } from '../lib/auth'
import AlertList from './AlertList'
import LeadForm from './LeadForm'
import Pipeline from './Pipeline'
import { Av, Dc, Empty, Kpi, PageHead, fmtTime, useL, waLink } from './ui'

type Dash = ReturnType<typeof useDashboard>
type Item = { key: string; kind: 'patient' | 'lead'; id: string; name: string; sub: string; tag: string; tone: string; note?: string; actions: { label: string; primary?: boolean; href?: string | null; onClick?: () => void }[] }

export default function DToday({ dash, go }: { dash: Dash; go: (h: string) => void }) {
  const L = useL()
  const { i18n } = useTranslation()
  const toast = useToast()
  const { profile } = useAuth()
  const [filter, setFilter] = useState<'all' | 'patient' | 'lead'>('all')
  const [adding, setAdding] = useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const d = dash.data
  if (!d) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-80" /></div>

  const hr = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }))
  const greet = hr < 12 ? L('Good morning', 'शुभ सकाळ') : hr < 17 ? L('Good afternoon', 'नमस्कार') : L('Good evening', 'शुभ संध्याकाळ')
  const dateStr = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })
  const wk = (w: number | null) => (w ? L(`Week ${w} · 12-week program`, `आठवडा ${w} · 12 आठवड्यांचा प्रोग्राम`) : L('Not started', 'सुरू नाही'))

  const items: Item[] = []
  for (const p of d.radar.filter((x) => x.score >= 35)) {
    const reasons: string[] = []
    if (p.days_quiet >= 2 && p.days_quiet < 99) reasons.push(L(`No check-in · ${p.days_quiet} days`, `चेक-इन नाही · ${p.days_quiet} दिवस`))
    if (p.days_quiet >= 99) reasons.push(L('Never checked in', 'अजून चेक-इन नाही'))
    if (p.weight_change_9d !== null && Math.abs(p.weight_change_9d) < 0.2) reasons.push(L('Weight plateau · 9 days', 'वजन स्थिर · 9 दिवस'))
    if (p.mood_recent !== null && p.mood_prev !== null && p.mood_recent < p.mood_prev - 0.7) reasons.push(L('Mood dip', 'मूड खाली'))
    items.push({ key: 'r' + p.id, kind: 'patient', id: p.id, name: p.full_name, sub: wk(p.week), tag: reasons[0] ?? L('Needs attention', 'लक्ष हवं'), tone: 't-red', note: L(`Risk ${p.score}`, `धोका ${p.score}`),
      actions: [{ label: L('● Voice note', '● व्हॉइस नोट'), primary: true, onClick: () => go(`p/${p.id}/messages`) }, { label: 'WhatsApp', href: waLink(p.phone) }] })
  }
  for (const g of d.good_week) {
    if (items.some((x) => x.id === g.id)) continue
    items.push({ key: 'g' + g.id, kind: 'patient', id: g.id, name: g.full_name, sub: wk(g.week), tag: L(`Good week · ${g.change} kg`, `छान आठवडा · ${g.change} kg`), tone: 't-em', note: L('Say well done', 'शाबासकी द्या'),
      actions: [{ label: L('● Voice note', '● व्हॉइस नोट'), primary: true, onClick: () => go(`p/${g.id}/messages`) }, { label: 'WhatsApp', href: waLink(g.phone, 'छान प्रगती! असंच सुरू ठेवा 👏') }] })
  }
  for (const t of d.testimonial_due) {
    items.push({ key: 't' + t.id, kind: 'patient', id: t.id, name: t.full_name, sub: wk(t.week), tag: L('Testimonial + consent due', 'अनुभव + संमती विचारायची'), tone: 't-amb', note: L('Request ready', 'विनंती तयार'),
      actions: [{ label: L('Send request', 'विनंती पाठवा'), primary: true, onClick: async () => { const { error } = await saveStory({ patient_id: t.id, status: 'requested', kind: 'text' }); toast(error ? L('Failed', 'झालं नाही') : L('Added to Proof & stories ✓', 'अनुभव यादीत जोडलं ✓'), !error); dash.reload() } },
        { label: L('Skip', 'वगळा'), onClick: () => setSkipped((s) => [...s, 't' + t.id]) }] })
  }
  for (const l of d.leads_followup) {
    const answered = l.answers_count === 4
    items.push({ key: 'l' + l.id, kind: 'lead', id: l.id, name: l.full_name, sub: L(`Lead · keyword “${l.keyword ?? '—'}”`, `लीड · कीवर्ड “${l.keyword ?? '—'}”`),
      tag: answered ? L('Answered 4 Qs · not booked', '4 उत्तरं · बुकिंग नाही') : L(`Didn't book · Day ${l.age_days}`, `बुकिंग नाही · दिवस ${l.age_days}`), tone: 't-amb', note: L(`Since ${l.age_days} day(s)`, `${l.age_days} दिवसांपासून`),
      actions: [{ label: L('Send slots', 'वेळा पाठवा'), primary: true, href: waLink(l.phone, 'नमस्कार! डॉ. हराळे यांच्या क्लिनिकमध्ये भेटीसाठी वेळ: संध्याकाळी 5 ते 8. कोणता दिवस सोयीचा?') }, { label: L('Call', 'कॉल'), href: l.phone ? `tel:${l.phone}` : null }] })
  }
  const visible = items.filter((x) => !skipped.includes(x.key) && (filter === 'all' || x.kind === filter))
  const patientsN = items.filter((x) => x.kind === 'patient' && !skipped.includes(x.key)).length
  const leadsN = items.filter((x) => x.kind === 'lead' && !skipped.includes(x.key)).length
  const f = d.funnel
  const fmax = Math.max(1, f.inquiries)

  return (
    <div className="flex flex-col gap-5">
      <PageHead title={`${greet}, ${profile?.role === 'doctor' ? 'Dr. Harale' : L('team', 'टीम')}`} sub={`${dateStr} · ${d.kpi.active} ${L('active patients', 'सक्रिय पेशंट्स')}`}
        right={<button onClick={() => setAdding(true)} className="dbtn p">+ {L('Add lead', 'नवीन लीड')}</button>} />

      {d.counts.alerts > 0 && <AlertsBlock reload={dash.reload} go={go} />}

      <Pipeline dash={dash} go={go} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi i={0} label={L('New leads · this week', 'नवीन लीड्स · हा आठवडा')} value={d.kpi.leads_week}
          sub={<span className="tag t-em">{d.kpi.leads_week - d.kpi.leads_prev_week >= 0 ? '+' : ''}{d.kpi.leads_week - d.kpi.leads_prev_week} {L('vs last week', 'मागच्या आठवड्यापेक्षा')}</span>} />
        <Kpi i={1} label={L('Consults today', 'आजच्या भेटी')} value={d.kpi.consults_today} sub={<span className="tag t-gr">{d.kpi.first_today} {L('first consults', 'पहिली भेट')}</span>} />
        <Kpi i={2} label={L('Checked in today', 'आज चेक-इन')} value={<>{d.kpi.checked_in_today}<span className="text-xl text-[#9AA29D]">/{d.kpi.active}</span></>}>
          <div className="mt-3 h-2 rounded bg-sand"><div className="h-2 rounded bg-emerald transition-[width] duration-700" style={{ width: `${d.kpi.active ? (d.kpi.checked_in_today / d.kpi.active) * 100 : 0}%` }} /></div>
        </Kpi>
        <Kpi i={3} tone="co" label={L('Needs your attention', 'तुमचं लक्ष हवं')} value={patientsN + leadsN} sub={<span className="tag t-co">{L('Auto-generated queue ↓', 'आपोआप बनलेली यादी ↓')}</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Dc i={4} className="min-w-0 scroll-mt-20"><span id="queue" />
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-display text-[19px] font-bold">{L('Follow-up queue', 'फॉलो-अप यादी')}</h2><p className="text-[13px] text-mu">{L('Built automatically — nobody gets missed', 'सिस्टमने आपोआप बनवली — कोणी सुटणार नाही')}</p></div>
            <div className="flex gap-2">
              {([['all', L(`All ${patientsN + leadsN}`, `सर्व ${patientsN + leadsN}`), 't-gr'], ['patient', L(`Patients ${patientsN}`, `पेशंट ${patientsN}`), 't-red'], ['lead', L(`Leads ${leadsN}`, `लीड ${leadsN}`), 't-amb']] as const).map(([k, lab, tone]) => (
                <button key={k} onClick={() => setFilter(k)} className={`tag ${tone} ${filter === k ? 'ring-2 ring-ink/20' : 'opacity-80'}`} style={{ minHeight: 28 }}>{lab}</button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? <Empty>{L('All caught up ✓ Nothing needs you right now.', 'सगळं ठीक आहे ✓ आत्ता काही बाकी नाही.')}</Empty> : (
            <ul className="flex flex-col">
              {visible.map((it, k) => (
                <li key={it.key} className="rise flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0 lg:flex-nowrap lg:gap-3.5" style={{ '--i': Math.min(k, 8) } as React.CSSProperties}>
                  <Av name={it.name} />
                  <button onClick={() => go(it.kind === 'patient' ? `p/${it.id}` : `leads/${it.id}`)} className="min-w-0 text-left lg:w-[180px]" style={{ minHeight: 0 }}>
                    <span className="block truncate text-[15px] font-bold">{it.name}</span><span className="block truncate text-[12.5px] text-mu">{it.sub}</span>
                  </button>
                  <div className="min-w-0 flex-1"><span className={`tag ${it.tone} max-w-full overflow-hidden text-ellipsis`}>{it.tag}</span></div>
                  {it.note && <span className="hidden w-[90px] shrink-0 text-right text-xs text-mu xl:block">{it.note}</span>}
                  <div className="flex gap-2">
                    {it.actions.map((a) => a.href !== undefined ? (
                      a.href ? <a key={a.label} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={`mini ${a.primary ? 'bg-emerald text-white' : 'bg-sand'}`}>{a.label}</a>
                        : <span key={a.label} className="mini bg-sand opacity-40" title={L('No phone saved', 'फोन नाही')}>{a.label}</span>
                    ) : <button key={a.label} onClick={a.onClick} className={`mini ${a.primary ? 'bg-emerald text-white' : 'bg-sand'}`}>{a.label}</button>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Dc>

        <div className="flex flex-col gap-4">
          <Dc i={5}>
            <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-[19px] font-bold">{L("Today's consults", 'आजच्या भेटी')}</h2><span className="tag t-gr">{L('Clinic · Kolhapur', 'क्लिनिक · कोल्हापूर')}</span></div>
            {d.consults.length === 0 ? <Empty>{L('No consults booked today.', 'आज भेटी नाहीत.')}</Empty> : (
              <ul className="flex flex-col">{d.consults.map((a) => (
                <li key={a.id} className="flex gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="w-16 shrink-0 font-latin text-sm font-semibold text-emerald">{fmtTime(a.starts_at, i18n.language)}</span>
                  <button onClick={() => a.patient_id ? go(`p/${a.patient_id}`) : go('appointments')} className="min-w-0 flex-1 text-left" style={{ minHeight: 0 }}>
                    <span className="block truncate font-bold">{a.name}</span>
                    <span className="block text-[12.5px] text-mu">{kindLabel(a.kind, L)}{a.note ? ` · ${a.note}` : ''}</span>
                  </button>
                  <span className={`tag self-center ${a.status === 'confirmed' || a.reminded_at ? 't-em' : 't-amb'}`}>{a.status === 'confirmed' || a.reminded_at ? L('Reminded ✓', 'आठवण ✓') : L('Not confirmed', 'पक्कं नाही')}</span>
                </li>
              ))}</ul>
            )}
          </Dc>
          <Dc i={6}>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[19px] font-bold">{new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { month: 'long' })} {L('funnel', 'फनेल')}</h2><span className="tag t-gr">{L('Month to date', 'या महिन्यात')}</span></div>
            {([['Inquiries', 'चौकशी', f.inquiries], ['Consult booked', 'भेट बुक', f.booked], ['Showed up', 'आले', f.showed], ['Joined', 'जॉइन', f.joined]] as const).map(([en, mr, v], k) => (
              <div key={en} className="mb-2.5">
                <div className="mb-1 flex justify-between text-sm"><span>{L(en, mr)}</span><b className="font-latin">{v}</b></div>
                <div className="h-2.5 rounded bg-sand"><div className="h-2.5 rounded transition-[width] duration-700" style={{ width: `${(v / fmax) * 100}%`, background: ['#0F6B4C', '#2BA676', '#E8A33D', '#FF7A50'][k] }} /></div>
              </div>
            ))}
          </Dc>
        </div>
      </div>
      {adding && <LeadForm onClose={() => setAdding(false)} onSaved={dash.reload} />}
    </div>
  )
}

export function kindLabel(k: string, L: (en: string, mr: string) => string) {
  return k === 'first_consult' ? L('First consult', 'पहिली भेट') : k === 'review' ? L('Review', 'रिव्ह्यू') : k === 'maintenance' ? L('Maintenance', 'मेंटेनन्स') : L('Video call', 'व्हिडिओ कॉल')
}

function AlertsBlock({ reload, go }: { reload: () => void; go: (h: string) => void }) {
  // Alerts list lives in doctor_today (already deployed RPC)
  return <AlertsFetcher reload={reload} go={go} />
}
function AlertsFetcher({ reload, go }: { reload: () => void; go: (h: string) => void }) {
  const t = useDoctorToday()
  if (!t.data || t.data.alerts.length === 0) return null
  return <AlertList alerts={t.data.alerts} onChange={() => { t.reload(); reload() }} openPatient={(id) => go(`p/${id}`)} />
}

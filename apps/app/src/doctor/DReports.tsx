import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../components/Toast'
import { useReport } from '../lib/doctor'
import { Dc, Kpi, PageHead, useL } from './ui'

function months() {
  const out: string[] = []
  const d = new Date(Date.now() + 5.5 * 3600e3)
  for (let i = 0; i < 12; i++) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(x.toISOString().slice(0, 10)) }
  return out
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function DReports() {
  const L = useL()
  const { i18n } = useTranslation()
  const ms = months()
  const [m, setM] = useState(ms[0])
  const q = useReport(m)
  const r = q.data
  const label = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const summary: string[] = []
  if (r) {
    const top = r.by_keyword[0]
    if (top) summary.push(L(`“${top.keyword}” brought the most leads (${top.leads}) and ${top.joined} joins — make more content around it this month.`, `“${top.keyword}” ने सर्वात जास्त लीड्स (${top.leads}) आणि ${top.joined} जॉइन आणले — या महिन्यात यावर आणखी कंटेंट करा.`))
    const f = r.funnel
    const steps = [[L('Inquiry → Booked', 'चौकशी → बुक'), pct(f.booked, f.inquiries)], [L('Booked → Showed up', 'बुक → आले'), pct(f.showed, f.booked)], [L('Showed up → Joined', 'आले → जॉइन'), pct(f.joined, f.showed)]] as const
    const worst = [...steps].filter(() => f.inquiries > 0).sort((a, b) => a[1] - b[1])[0]
    if (worst) summary.push(L(`Biggest drop: ${worst[0]} (${worst[1]}%).`, `सर्वात मोठी घट: ${worst[0]} (${worst[1]}%).`))
    if (worst && worst[0].includes('Book')) summary.push(L('Suggestion: send booking slots right after question 2, and add a voice note from you in the welcome message.', 'सुचवलेलं: प्रश्न 2 नंतर लगेच वेळा पाठवा आणि स्वागत संदेशात तुमची व्हॉइस नोट जोडा.'))
    if (r.week4.cohort && pct(r.week4.active, r.week4.cohort) < 85) summary.push(L('Week-4 retention is below the 85% target — check the Retention radar weekly.', 'आठवडा-4 टिकाव 85% पेक्षा कमी — रडार दर आठवड्याला पाहा.'))
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L(`${label(m).split(' ')[0]} report`, `${label(m).split(' ')[0]} रिपोर्ट`)} sub={L(`${label(m)} · generated from live data`, `${label(m)} · थेट डेटावरून`)}
        right={<div className="no-print flex gap-2">
          <select className="dfield w-auto!" value={m} onChange={(e) => setM(e.target.value)} aria-label="Month">{ms.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select>
          <button onClick={() => window.print()} className="dbtn p">{L('Download PDF', 'PDF डाउनलोड')}</button>
        </div>} />
      {!r ? <Skeleton className="h-96" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
            <Kpi i={0} label={L('Inquiries', 'चौकशी')} value={r.inquiries} sub={<span className="tag t-em">{r.inquiries - r.inquiries_prev >= 0 ? '+' : ''}{r.inquiries - r.inquiries_prev} {L('vs last month', 'मागच्या महिन्यापेक्षा')}</span>} />
            <Kpi i={1} label={L('Joined', 'जॉइन')} value={r.joined} sub={<span className="tag t-gr">{pct(r.joined, r.inquiries)}% {L('conversion', 'रूपांतरण')}</span>} />
            <Kpi i={2} label={L('Active patients', 'सक्रिय पेशंट्स')} value={r.active} sub={<span className="tag t-em">+{r.new_patients} {L('new', 'नवीन')}{r.dropped ? ` · −${r.dropped}` : ''}</span>} />
            <Kpi i={3} label={L('Still active at Week 4', 'आठवडा 4 ला सक्रिय')} value={r.week4.cohort ? `${pct(r.week4.active, r.week4.cohort)}%` : '—'} sub={<span className={`tag ${pct(r.week4.active, r.week4.cohort) >= 85 ? 't-em' : 't-amb'}`}>{L('target 85%', 'लक्ष्य 85%')}</span>} />
            <Kpi i={4} label={L('Maintenance members', 'मेंटेनन्स सदस्य')} value={r.maintenance} sub={<span className="tag t-gr">{L('new revenue', 'नवं उत्पन्न')}</span>} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Dc i={5}>
              <h2 className="font-display text-[19px] font-bold">{L('Leads by Instagram keyword', 'Instagram कीवर्डनुसार लीड्स')}</h2>
              <p className="text-sm text-mu">{L('Which content actually brought clients', 'कोणत्या कंटेंटने खरंच क्लायंट आणले')}</p>
              {r.by_keyword.length === 0 ? <p className="mt-3 text-sm text-mu">{L('No leads this month.', 'या महिन्यात लीड्स नाहीत.')}</p> : (
                <ul className="mt-3 space-y-2.5">{r.by_keyword.map((k) => (
                  <li key={k.keyword}><div className="mb-1 flex justify-between text-sm"><span>{/^[A-Z]/.test(k.keyword) ? k.keyword : `“${k.keyword}”`}</span><span><b className="font-latin">{k.leads}</b> · <span className="text-emerald">{k.joined} {L('joined', 'जॉइन')}</span></span></div>
                    <div className="relative h-2.5 rounded bg-sand"><div className="h-2.5 rounded bg-amb" style={{ width: `${pct(k.leads, r.by_keyword[0].leads)}%` }} /><div className="absolute top-0 h-2.5 rounded bg-emerald" style={{ width: `${pct(k.joined, r.by_keyword[0].leads)}%` }} /></div></li>
                ))}</ul>
              )}
              {r.best_story && (
                <div className="mt-4 rounded-xl bg-mintl/60 p-3">
                  <p className="font-latin text-xs font-semibold tracking-widest text-emerald">{L('BEST CONTENT THIS MONTH', 'या महिन्याचा सर्वोत्तम कंटेंट')}</p>
                  <p className="mt-1 font-bold">{r.best_story.title} · {r.best_story.kind}</p>
                  <p className="text-sm">{r.best_story.leads_count} {L('leads', 'लीड्स')}{r.best_story.keyword ? ` · ${L('keyword', 'कीवर्ड')} “${r.best_story.keyword}”` : ''}</p>
                </div>
              )}
            </Dc>
            <Dc i={6}>
              <h2 className="font-display text-[19px] font-bold">{L('Funnel', 'फनेल')}</h2>
              <p className="text-sm text-mu">{L('Where people dropped', 'लोक कुठे थांबले')}</p>
              <ul className="mt-3 space-y-3">{([[L('Inquiry → Booked', 'चौकशी → बुक'), r.funnel.booked, r.funnel.inquiries], [L('Booked → Showed up', 'बुक → आले'), r.funnel.showed, r.funnel.booked], [L('Showed up → Joined', 'आले → जॉइन'), r.funnel.joined, r.funnel.showed]] as const).map(([lab, a, b]) => (
                <li key={lab}><div className="mb-1 flex justify-between text-sm"><span>{lab}</span><b className="font-latin">{pct(a, b)}%</b></div><div className="h-2.5 rounded bg-sand"><div className="h-2.5 rounded bg-coral transition-[width] duration-700" style={{ width: `${pct(a, b)}%` }} /></div><p className="mt-0.5 text-xs text-mu">{b} → {a}</p></li>
              ))}</ul>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-sand p-2"><b className="block font-latin text-lg">{r.plates}</b>{L('plates', 'ताटं')}</div>
                <div className="rounded-xl bg-sand p-2"><b className="block font-latin text-lg">{r.consults}</b>{L('consults', 'भेटी')}</div>
                <div className="rounded-xl bg-sand p-2"><b className="block font-latin text-lg">₹{r.revenue_assess.toLocaleString('en-IN')}</b>{L('fees', 'फी')}</div>
              </div>
            </Dc>
          </div>
          {summary.length > 0 && (
            <Dc i={7} className="border-l-4 border-l-emerald">
              <p className="font-bold text-emerald">✨ {L('Summary', 'सारांश')}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="mt-2 text-xs text-mu">{L('Suggestions are generated from your numbers · please verify before acting', 'सूचना तुमच्या आकड्यांवरून · कृतीआधी तपासा')}</p>
            </Dc>
          )}
        </>
      )}
    </div>
  )
}

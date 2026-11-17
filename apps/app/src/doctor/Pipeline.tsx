import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { useDashboard } from '../lib/doctor'
import { Dc, useL } from './ui'

type Dash = ReturnType<typeof useDashboard>

/**
 * Mentor note: Doctor ko ek nazar me pura business dikhe — lead se maintenance tak (pipeline),
 * aur aaj ka 20-minute routine (kaun sa kaam pehle). Har box click karo → seedha us screen par.
 */
export default function Pipeline({ dash, go }: { dash: Dash; go: (h: string) => void }) {
  const L = useL()
  const d = dash.data!
  const [maint, setMaint] = useState<number | null>(null)
  useEffect(() => {
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'maintenance').then(({ count }) => setMaint(count ?? 0))
  }, [])

  const stages = [
    { n: d.counts.leads_new, en: 'New leads', mr: 'नवीन लीड्स', sen: 'Instagram / WhatsApp', smr: 'Instagram / WhatsApp', to: 'leads', c: '#E8A33D' },
    { n: d.funnel.booked, en: 'Consult booked', mr: 'भेट बुक', sen: 'this month', smr: 'या महिन्यात', to: 'appointments', c: '#2BA676' },
    { n: d.kpi.active, en: 'In program', mr: 'प्रोग्राममध्ये', sen: '12-week plan', smr: '12 आठवड्यांचा प्लॅन', to: 'patients', c: '#0F6B4C' },
    { n: d.counts.radar_high, en: 'At risk', mr: 'धोक्यात', sen: 'may drop out', smr: 'सोडू शकतात', to: 'radar', c: '#D64545' },
    { n: maint ?? '…', en: 'Maintenance', mr: 'मेंटेनन्स', sen: '₹999 / month', smr: '₹999 / महिना', to: 'patients', c: '#7B5CFF' },
  ]
  const routine = [
    { n: d.counts.plates_todo, en: 'Plate review', mr: 'ताट पाहा', sen: 'AI tagged · 1-tap reply', smr: 'AI ने टॅग केले · 1 टॅप उत्तर', min: 5, to: 'plates' },
    { n: d.counts.approvals, en: 'Approve plans', mr: 'प्लॅन मंजूर करा', sen: 'AI drafted · you approve', smr: 'AI ने तयार केले · तुम्ही मंजूर करा', min: 5, to: 'approvals' },
    { n: d.counts.unread, en: 'Reply messages', mr: 'संदेशांना उत्तर', sen: 'voice or text', smr: 'आवाज किंवा मजकूर', min: 5, to: 'patients' },
    { n: d.counts.radar_high + d.leads_followup.length, en: 'Follow-ups', mr: 'फॉलो-अप', sen: 'queue below ↓', smr: 'खालील यादी ↓', min: 5, to: '' },
  ]
  const left = routine.filter((r) => r.n > 0).reduce((a, r) => a + r.min, 0)

  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <Dc i={0} className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div><h2 className="font-display text-[19px] font-bold">{L('Patient pipeline', 'पेशंट पाइपलाइन')}</h2>
            <p className="text-[13px] text-mu">{L('Every person, from first reel to membership', 'पहिल्या रीलपासून मेंबरशिपपर्यंत प्रत्येक जण')}</p></div>
        </div>
        <ol className="grid grid-cols-5 gap-1.5">
          {stages.map((s, k) => (
            <li key={s.en} className="relative">
              <button onClick={() => go(s.to)} className="rise flex h-full w-full flex-col items-start rounded-2xl border border-line bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md" style={{ '--i': k, minHeight: 0 } as React.CSSProperties}>
                <span className="h-1.5 w-8 rounded-full" style={{ background: s.c }} />
                <span className="mt-2 font-latin text-[26px] font-bold leading-none" style={{ color: s.c }}>{s.n}</span>
                <span className="mt-1 text-[13px] font-bold leading-tight">{L(s.en, s.mr)}</span>
                <span className="text-[11px] leading-tight text-mu">{L(s.sen, s.smr)}</span>
              </button>
              {k < stages.length - 1 && <span aria-hidden className="absolute -right-[9px] top-1/2 z-[1] -translate-y-1/2 text-sm text-mu">›</span>}
            </li>
          ))}
        </ol>
      </Dc>
      <Dc i={1} className="min-w-0">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div><h2 className="font-display text-[19px] font-bold">{L("Today's routine", 'आजचं रुटीन')}</h2>
            <p className="text-[13px] text-mu">{L('AI does the prep — you only decide', 'तयारी AI करतं — निर्णय फक्त तुमचा')}</p></div>
          <span className={`tag ${left ? 't-co' : 't-em'}`}>{left ? L(`~${left} min left`, `~${left} मिनिटं बाकी`) : L('All done ✓', 'सगळं झालं ✓')}</span>
        </div>
        <ol className="flex flex-col gap-1.5">
          {routine.map((r, k) => {
            const done = r.n === 0
            return (
              <li key={r.en}>
                <button onClick={() => (r.to ? go(r.to) : document.getElementById('queue')?.scrollIntoView({ behavior: 'smooth' }))}
                  className="rise flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-sand" style={{ '--i': k + 1, minHeight: 0 } as React.CSSProperties}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald text-white' : 'bg-coral/15 text-coral'}`}>{done ? '✓' : k + 1}</span>
                  <span className="min-w-0 flex-1"><span className={`block text-[14px] font-bold ${done ? 'text-mu line-through' : ''}`}>{L(r.en, r.mr)}</span><span className="block truncate text-[12px] text-mu">{L(r.sen, r.smr)}</span></span>
                  {!done && <span className="tag t-gr font-latin">{r.n}</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </Dc>
    </div>
  )
}

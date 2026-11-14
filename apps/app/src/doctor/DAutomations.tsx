import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { saveSetting, useRuns, useSettings } from '../lib/doctor'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Dc, PageHead, fmtDate, fmtTime, useL } from './ui'

type Status = 'live' | 'wa' | 'domain'
const AUTOS: { key: string; ch: string; en: string; mr: string; when_en: string; when_mr: string; status: Status }[] = [
  { key: 'lead_autoreply', ch: 'WA', en: 'Lead auto-reply + 4 questions', mr: 'लीडला आपोआप उत्तर + 4 प्रश्न', when_en: 'When someone messages a keyword', when_mr: 'कोणी कीवर्ड पाठवला की', status: 'wa' },
  { key: 'booking_link', ch: 'WA', en: 'Booking slots link', mr: 'भेटीच्या वेळांची लिंक', when_en: 'When lead answers all 4 questions', when_mr: '4 उत्तरं दिल्यावर', status: 'wa' },
  { key: 'appt_reminders', ch: 'WA', en: 'Appointment reminders', mr: 'भेटीची आठवण', when_en: '24 hrs + 2 hrs before', when_mr: '24 तास + 2 तास आधी', status: 'wa' },
  { key: 'lead_nurture', ch: 'WA', en: 'Lead nurture (Day 0·1·3·5·7)', mr: 'लीड फॉलो-अप (दिवस 0·1·3·5·7)', when_en: 'Lead didn’t book', when_mr: 'लीडने बुकिंग केलं नाही', status: 'wa' },
  { key: 'missed_checkin', ch: 'WA', en: 'Missed check-in nudge', mr: 'चेक-इन चुकल्यास आठवण', when_en: 'No check-in by 8 PM · max 1/day', when_mr: 'रात्री 8 पर्यंत चेक-इन नाही · दिवसातून 1', status: 'wa' },
  { key: 'plan_drafts', ch: 'AI', en: 'Weekly plan drafts', mr: 'आठवड्याचे प्लॅन मसुदे', when_en: 'Every Saturday → doctor approval', when_mr: 'दर शनिवारी → डॉक्टर मंजुरी', status: 'live' },
  { key: 'plate_tags', ch: 'AI', en: 'Plate photo tags', mr: 'ताट फोटो टॅग', when_en: 'On every photo upload', when_mr: 'प्रत्येक फोटोवर', status: 'live' },
  { key: 'daily_digest', ch: '@', en: 'Doctor daily digest', mr: 'डॉक्टरांसाठी रोजचा सारांश', when_en: 'Every day 7:00 AM · email', when_mr: 'रोज सकाळी 7 · ईमेल', status: 'domain' },
  { key: 'testimonial_request', ch: '★', en: 'Testimonial + consent request', mr: 'अनुभव + संमती विनंती', when_en: 'Week 4 · 8 · 12 (in Today queue)', when_mr: 'आठवडा 4 · 8 · 12 (आजच्या यादीत)', status: 'live' },
  { key: 'maintenance_offer', ch: '₹', en: 'Maintenance plan offer', mr: 'मेंटेनन्स ऑफर', when_en: 'Week 11 of program', when_mr: 'प्रोग्रामचा आठवडा 11', status: 'wa' },
]

export default function DAutomations() {
  const L = useL()
  const { i18n } = useTranslation()
  const toast = useToast()
  const { profile } = useAuth()
  const set = useSettings()
  const runs = useRuns()
  const [stats, setStats] = useState<{ tags: number; lastTag: string | null; drafts: number; lastDraft: string | null; stories: number } | null>(null)
  const on = (set.data?.find((x) => x.key === 'automations')?.value ?? {}) as Record<string, boolean>
  useEffect(() => {
    const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0)
    Promise.all([
      supabase.from('checkins').select('id', { count: 'exact', head: true }).not('ai_tag', 'is', null).gte('created_at', ms.toISOString()),
      supabase.from('checkins').select('created_at').not('ai_tag', 'is', null).order('created_at', { ascending: false }).limit(1),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('source', 'ai').gte('created_at', ms.toISOString()),
      supabase.from('plans').select('created_at').eq('source', 'ai').order('created_at', { ascending: false }).limit(1),
      supabase.from('stories').select('id', { count: 'exact', head: true }).gte('requested_at', ms.toISOString()),
    ]).then(([a, b, c, d, e]) => setStats({ tags: a.count ?? 0, lastTag: b.data?.[0]?.created_at ?? null, drafts: c.count ?? 0, lastDraft: d.data?.[0]?.created_at ?? null, stories: e.count ?? 0 }))
  }, [])
  async function toggle(k: string) {
    if (profile?.role !== 'doctor') return toast(L('Only the doctor can change automations.', 'फक्त डॉक्टर बदलू शकतात.'), false)
    const next = { ...on, [k]: !(on[k] ?? true) }
    set.setData((set.data ?? []).map((x) => (x.key === 'automations' ? { ...x, value: next } : x)))
    const { error } = await saveSetting('automations', next)
    if (error) { toast(L('Failed', 'झालं नाही'), false); set.reload() } else toast(next[k] ? L('Turned on ✓', 'चालू ✓') : L('Turned off', 'बंद'))
  }
  if (!set.data || !stats) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const last = (k: string) => k === 'plate_tags' ? stats.lastTag : k === 'plan_drafts' ? stats.lastDraft : runs.data?.find((r) => r.key === k)?.ran_at ?? null
  const month = (k: string) => k === 'plate_tags' ? stats.tags : k === 'plan_drafts' ? stats.drafts : k === 'testimonial_request' ? stats.stories : (runs.data ?? []).filter((r) => r.key === k).reduce((s, r) => s + r.items, 0)
  const saved = Math.round((stats.tags * 1.5 + stats.drafts * 8 + stats.stories * 3) / 60 * 10) / 10
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Automations', 'ऑटोमेशन')} sub={L('All of this runs on its own · turn any of it on or off', 'हे सगळं आपोआप चालतं · कोणतंही चालू/बंद करा')} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Dc className="min-w-0 p-0! overflow-hidden">
          <div className="hidden grid-cols-[44px_1fr_140px_90px_70px] gap-3 border-b border-line px-5 py-2.5 font-latin text-xs font-semibold tracking-wider text-mu md:grid">
            <span /><span>AUTOMATION</span><span>LAST RUN</span><span>THIS MONTH</span><span>ON</span>
          </div>
          <ul>{AUTOS.map((a, i) => {
            const isOn = on[a.key] ?? true
            const l = last(a.key)
            return (
              <li key={a.key} className="rise grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[44px_1fr_140px_90px_70px] md:px-5" style={{ '--i': i } as React.CSSProperties}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-latin text-xs font-bold ${a.ch === 'AI' ? 'bg-mintl text-emerald' : a.ch === 'WA' ? 'bg-[#E3F6E9] text-[#1E8E4E]' : 'bg-sand text-mu'}`}>{a.ch}</span>
                <span className="min-w-0"><b className="block">{L(a.en, a.mr)}</b><span className="block text-xs text-mu">{L(a.when_en, a.when_mr)}</span>
                  {a.status === 'wa' && <span className="tag t-amb mt-1">{L('Starts when WhatsApp number is live', 'WhatsApp नंबर सुरू झाल्यावर')}</span>}
                  {a.status === 'domain' && <span className="tag t-amb mt-1">{L('Starts when clinic email domain is set', 'क्लिनिक ईमेल डोमेन झाल्यावर')}</span>}
                  <span className="mt-1 block text-xs text-mu md:hidden">{l ? `${fmtDate(l, i18n.language)} ${fmtTime(l, i18n.language)}` : '—'} · {month(a.key)}</span></span>
                <span className="hidden text-sm text-mu md:block">{l ? `${fmtDate(l, i18n.language)} · ${fmtTime(l, i18n.language)}` : '—'}</span>
                <span className="hidden font-latin font-semibold md:block">{month(a.key)}</span>
                <button role="switch" aria-checked={isOn} aria-label={L(a.en, a.mr)} onClick={() => toggle(a.key)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${isOn ? 'bg-emerald' : 'bg-ink/20'}`} style={{ minHeight: 28 }}>
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${isOn ? 'translate-x-5' : ''}`} />
                </button>
              </li>
            )
          })}</ul>
        </Dc>
        <div className="flex flex-col gap-4">
          <Dc i={1}>
            <h2 className="font-display text-[19px] font-bold">{new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { month: 'long' })} {L('usage', 'वापर')}</h2>
            <p className="text-xs text-mu">{L('Billed to the clinic’s own accounts', 'क्लिनिकच्या स्वतःच्या खात्यांवर')}</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex justify-between gap-2"><span>WhatsApp<br /><span className="text-xs text-mu">{L('Test mode — not live yet', 'टेस्ट मोड — अजून सुरू नाही')}</span></span><b className="font-latin">₹0</b></li>
              <li className="flex justify-between gap-2"><span>{L('AI drafts & tags', 'AI मसुदे व टॅग')}<br /><span className="text-xs text-mu">{stats.tags + stats.drafts} {L('requests · Gemini free tier', 'विनंत्या · Gemini free')}</span></span><b className="font-latin">₹0</b></li>
              <li className="flex justify-between gap-2"><span>{L('Email digest', 'ईमेल सारांश')}<br /><span className="text-xs text-mu">Resend free</span></span><b className="font-latin">₹0</b></li>
              <li className="flex justify-between gap-2"><span>{L('Hosting & database', 'होस्टिंग व डेटाबेस')}<br /><span className="text-xs text-mu">Cloudflare + Supabase</span></span><b className="font-latin">₹0</b></li>
            </ul>
          </Dc>
          <Dc i={2} className="bg-mintl! border-[#BFE9D3]!">
            <p className="text-sm font-medium text-emerald">{L('Time saved', 'वाचलेला वेळ')}</p>
            <p className="mt-1 font-latin text-[32px] font-bold text-emerald">~{saved} {L('hrs', 'तास')}</p>
            <p className="text-xs text-mu">{L('this month · estimate from AI tags, plan drafts and requests done automatically', 'या महिन्यात · AI टॅग, मसुदे व विनंत्यांवरून अंदाज')}</p>
          </Dc>
        </div>
      </div>
    </div>
  )
}

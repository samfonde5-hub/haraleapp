import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { search, useDashboard } from '../lib/doctor'
import { haptic, transition } from '../lib/feel'
import { LANGS } from '../i18n'
import { Skeleton } from '../components/Toast'
import { Av, useL } from './ui'
import DToday from './DToday'

// Har screen alag chhoti file — sirf jab khulti hai tab download hoti hai
const DApprovals = lazy(() => import('./DApprovals'))
const DRadar = lazy(() => import('./DRadar'))
const DLeads = lazy(() => import('./DLeads'))
const DPatients = lazy(() => import('./DPatients'))
const DPatient = lazy(() => import('./DPatient'))
const DPlates = lazy(() => import('./DPlates'))
const DAppointments = lazy(() => import('./DAppointments'))
const DLibrary = lazy(() => import('./DLibrary'))
const DAutomations = lazy(() => import('./DAutomations'))
const DStories = lazy(() => import('./DStories'))
const DReports = lazy(() => import('./DReports'))
const DSettings = lazy(() => import('./DSettings'))

type NavId = 'today' | 'plates' | 'approvals' | 'radar' | 'leads' | 'patients' | 'appointments' | 'library' | 'automations' | 'stories' | 'reports' | 'settings'
const ICON: Record<NavId, string> = { today: '🏠', plates: '🍽️', approvals: '✨', radar: '📡', leads: '🎯', patients: '👥', appointments: '📅', library: '📚', automations: '⚙️', stories: '⭐', reports: '📊', settings: '👤' }

function readRoute(): { id: NavId; pid: string | null; tab: string | null; sub: string | null } {
  const h = location.hash.replace(/^#\/?/, '')
  const [a, b, c] = h.split('/')
  if (a === 'p' && b) return { id: 'patients', pid: b, tab: c ?? null, sub: null }
  const ids = Object.keys(ICON) as NavId[]
  return { id: ids.includes(a as NavId) ? (a as NavId) : 'today', pid: null, tab: null, sub: b ?? null }
}

function Search({ go }: { go: (h: string) => void }) {
  const L = useL()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ type: string; id: string; full_name: string; phone: string | null }[]>([])
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return }
    const id = setTimeout(async () => { const { data } = await search(q); setRes((data as typeof res) ?? []) }, 220)
    return () => clearTimeout(id)
  }, [q])
  useEffect(() => {
    const f = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [])
  return (
    <div ref={box} className="relative w-full lg:w-[300px]">
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={L('Search patient, lead or phone…', 'पेशंट, लीड किंवा फोन शोधा…')}
        className="dfield" aria-label="Search" />
      {open && res.length > 0 && (
        <ul className="pop absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          {res.map((r) => (
            <li key={r.type + r.id}>
              <button onClick={() => { setOpen(false); setQ(''); go(r.type === 'patient' ? `p/${r.id}` : `leads/${r.id}`) }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-sand" style={{ minHeight: 48 }}>
                <Av name={r.full_name} size={32} />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.full_name}</span>
                <span className={`tag ${r.type === 'patient' ? 't-em' : 't-amb'}`}>{r.type === 'patient' ? L('Patient', 'पेशंट') : L('Lead', 'लीड')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DoctorApp() {
  const L = useL()
  const { i18n } = useTranslation()
  const { profile } = useAuth()
  const [r, setR] = useState(readRoute)
  const [drawer, setDrawer] = useState(false)
  const dash = useDashboard()
  const c = dash.data?.counts

  useEffect(() => {
    const f = () => transition(() => { setR(readRoute()); setDrawer(false) })
    window.addEventListener('hashchange', f)
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') dash.reload() }, 60_000)
    return () => { window.removeEventListener('hashchange', f); clearInterval(id) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (h: string) => { haptic(8); if (location.hash === `#/${h}`) return; location.hash = `#/${h}`; window.scrollTo(0, 0) }
  const NAV: { id: NavId; label: string; cnt?: number }[] = [
    { id: 'today', label: L('Today', 'आज'), cnt: c?.alerts || undefined },
    { id: 'plates', label: L('Plate review', 'ताट पुनरावलोकन'), cnt: c?.plates_todo || undefined },
    { id: 'approvals', label: L('AI approvals', 'AI मंजुरी'), cnt: c?.approvals || undefined },
    { id: 'radar', label: L('Retention radar', 'रिटेन्शन रडार'), cnt: c?.radar_high || undefined },
    { id: 'leads', label: L('Leads', 'लीड्स'), cnt: c?.leads_new || undefined },
    { id: 'patients', label: L('Patients', 'पेशंट्स'), cnt: c?.unread || undefined },
    { id: 'appointments', label: L('Appointments', 'भेटी') },
    { id: 'library', label: L('Plans & food', 'प्लॅन व आहार') },
    { id: 'automations', label: L('Automations', 'ऑटोमेशन') },
    { id: 'stories', label: L('Proof & stories', 'अनुभव व कथा') },
    { id: 'reports', label: L('Reports', 'रिपोर्ट') },
  ]
  const name = profile?.full_name || (profile?.role === 'doctor' ? 'Dr. C. Harale' : 'Staff')
  const roleLabel = profile?.role === 'doctor' ? L('Doctor · Admin', 'डॉक्टर · ॲडमिन') : L('Staff', 'स्टाफ')

  const navList = (
    <>
      {NAV.map((n) => {
        const on = r.id === n.id
        return (
          <button key={n.id} onClick={() => go(n.id)} aria-current={on ? 'page' : undefined}
            className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors ${on ? 'bg-white/12 font-bold text-white' : 'font-medium text-[#BFD9CD] hover:bg-white/6'}`} style={{ minHeight: 42 }}>
            <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 text-[10px] ${on ? 'border-coral bg-coral' : 'border-[#7FB39C]'}`} aria-hidden />
            <span className="flex-1 truncate">{n.label}</span>
            {n.cnt ? <span key={n.cnt} className="pop rounded-[10px] bg-coral px-2 font-latin text-[11px] font-semibold text-white">{n.cnt}</span> : null}
          </button>
        )
      })}
    </>
  )
  const meCard = (
    <button onClick={() => go('settings')} className="mt-auto flex w-full items-center gap-2.5 rounded-2xl bg-white/8 p-2.5 text-left" style={{ minHeight: 58 }}>
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-mint font-display text-[13px] font-extrabold text-emd">डॉ.</span>
      <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{name}</span><span className="block text-xs text-[#9CC5B3]">{roleLabel}</span></span>
    </button>
  )

  let screen
  if (r.pid) screen = <DPatient id={r.pid} tab={r.tab} go={go} />
  else switch (r.id) {
    case 'today': screen = <DToday dash={dash} go={go} />; break
    case 'plates': screen = <DPlates go={go} onChange={dash.reload} />; break
    case 'approvals': screen = <DApprovals go={go} onChange={dash.reload} />; break
    case 'radar': screen = <DRadar go={go} />; break
    case 'leads': screen = <DLeads go={go} onChange={dash.reload} sub={r.sub} />; break
    case 'patients': screen = <DPatients go={go} />; break
    case 'appointments': screen = <DAppointments go={go} onChange={dash.reload} />; break
    case 'library': screen = <DLibrary />; break
    case 'automations': screen = <DAutomations />; break
    case 'stories': screen = <DStories go={go} />; break
    case 'reports': screen = <DReports />; break
    case 'settings': screen = <DSettings onChange={dash.reload} />; break
  }

  return (
    <div className="print-bg flex min-h-dvh bg-canvas">
      {/* Desktop sidebar (prototype) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col overflow-y-auto bg-emd px-4 py-5 lg:flex">
        <div className="mb-6 rounded-2xl bg-white px-3 py-2.5"><img src="/logo.png" alt="Chinmay Wellness Club" className="block w-full" /></div>
        {navList}
        <div className="mt-4 flex rounded-full bg-white/10 p-1">
          {LANGS.map((l) => <button key={l.code} onClick={() => i18n.changeLanguage(l.code)} aria-pressed={i18n.language === l.code} className={`flex-1 rounded-full text-sm font-semibold ${i18n.language === l.code ? 'bg-white text-emd' : 'text-[#BFD9CD]'}`} style={{ minHeight: 34 }}>{l.label}</button>)}
        </div>
        <div className="mt-3">{meCard}</div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fade-in absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <aside className="slide-r absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col overflow-y-auto bg-emd px-4 py-5">
            <div className="mb-5 rounded-2xl bg-white px-3 py-2.5"><img src="/logo.png" alt="Chinmay Wellness Club" className="block w-full" /></div>
            {navList}
            <div className="mt-4 flex rounded-full bg-white/10 p-1">
              {LANGS.map((l) => <button key={l.code} onClick={() => i18n.changeLanguage(l.code)} aria-pressed={i18n.language === l.code} className={`flex-1 rounded-full text-sm font-semibold ${i18n.language === l.code ? 'bg-white text-emd' : 'text-[#BFD9CD]'}`} style={{ minHeight: 34 }}>{l.label}</button>)}
            </div>
            <div className="mt-3">{meCard}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/95 px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-8 lg:pt-6">
          <button onClick={() => setDrawer(true)} className="h-11 w-11 shrink-0 rounded-xl border border-line bg-white text-xl lg:hidden" aria-label="Menu" style={{ minHeight: 44 }}>☰</button>
          <img src="/logo.png" alt="" className="h-8 lg:hidden" />
          <div className="ml-auto hidden lg:block"><Search go={go} /></div>
        </header>
        <div className="no-print px-4 pt-3 lg:hidden"><Search go={go} /></div>

        <main key={r.pid ? r.pid + (r.tab ?? '') : r.id + (r.id === 'leads' ? '' : r.sub ?? '')} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-10">
          <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>}>{screen}</Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {(['today', 'plates', 'patients', 'leads'] as NavId[]).map((id) => {
            const n = NAV.find((x) => x.id === id)!
            const on = r.id === id
            return (
              <li key={id}><button onClick={() => go(id)} className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? 'text-emerald' : 'text-ink/55'}`}>
                <span className={`text-xl transition-transform duration-300 ${on ? '-translate-y-0.5 scale-110' : ''}`}>{ICON[id]}</span>{n.label.split(' ')[0]}
                {n.cnt ? <span className="absolute right-[calc(50%-24px)] top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{n.cnt}</span> : null}
              </button></li>
            )
          })}
          <li><button onClick={() => setDrawer(true)} className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink/55"><span className="text-xl">☰</span>{L('More', 'अधिक')}</button></li>
        </ul>
      </nav>
    </div>
  )
}

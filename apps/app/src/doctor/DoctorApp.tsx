import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { useDoctorPatients, useDoctorToday } from '../lib/doctor'
import { haptic, transition } from '../lib/feel'
import { LANGS } from '../i18n'
import { Card } from '../components/Visual'
import DToday from './DToday'
import DPatients from './DPatients'
import DPatient from './DPatient'
import AlertList from './AlertList'

const TABS = [
  { id: 'today', icon: '🏠' },
  { id: 'patients', icon: '👥' },
  { id: 'alerts', icon: '🆘' },
  { id: 'me', icon: '👤' },
] as const

function readRoute() {
  const h = location.hash.replace(/^#\/?/, '')
  if (h.startsWith('p/')) return { tab: 'patients', pid: h.slice(2) }
  return { tab: TABS.some((x) => x.id === h) ? h : 'today', pid: null as string | null }
}

/** Doctor/staff panel — same app, different home (role database decide karta hai, browser nahi). */
export default function DoctorApp() {
  const { t, i18n } = useTranslation('d')
  const { t: tt } = useTranslation()
  const { profile, signOut } = useAuth()
  const [r, setR] = useState(readRoute)
  const today = useDoctorToday()
  const patients = useDoctorPatients()

  useEffect(() => {
    const f = () => transition(() => setR(readRoute()))
    window.addEventListener('hashchange', f)
    // Har 60 sec me "Today" taaza karo (naye photos / alerts)
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') today.reload() }, 60_000)
    return () => { window.removeEventListener('hashchange', f); clearInterval(id) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (h: string) => { haptic(8); location.hash = `#/${h}`; window.scrollTo(0, 0) }
  const openPatient = (id: string) => go(`p/${id}`)
  const idx = TABS.findIndex((x) => x.id === r.tab)
  const alertCount = today.data?.counts.open_alerts ?? 0

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-paper px-4 py-3 shadow-[0_1px_0_rgba(30,42,38,.06)]">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Chinmay Wellness Club" className="h-9 w-auto" width="120" height="36" />
          <span className="rounded-full bg-ink px-2 py-0.5 font-latin text-[10px] font-semibold uppercase tracking-wider text-gold">Doctor</span>
        </div>
        <div className="relative flex rounded-full bg-white p-1 shadow-sm">
          <span aria-hidden className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-emerald transition-transform duration-300" style={{ transform: `translateX(${i18n.language === 'en' ? '100%' : '0'})` }} />
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => i18n.changeLanguage(l.code)} aria-pressed={i18n.language === l.code}
              className={`relative z-[1] min-h-9 flex-1 rounded-full px-3 text-sm font-semibold ${i18n.language === l.code ? 'text-white' : 'text-ink/70'}`}>{l.label}</button>
          ))}
        </div>
      </header>

      <main key={r.pid ?? r.tab} className="px-4 pb-28 pt-2">
        {r.pid ? <DPatient id={r.pid} back={() => go('patients')} openPatient={openPatient} />
          : r.tab === 'today' ? <DToday q={today} openPatient={openPatient} />
          : r.tab === 'patients' ? <DPatients q={patients} openPatient={openPatient} />
          : r.tab === 'alerts' ? <AlertList alerts={today.data?.alerts ?? []} onChange={today.reload} openPatient={openPatient} />
          : (
            <div className="flex flex-col gap-4">
              <Card>
                <h1 className="font-display text-2xl font-bold">{t('me.title')}</h1>
                <p className="mt-1 text-ink/70">{profile?.email}</p>
                <p className="mt-2 w-fit rounded-full bg-mint px-3 py-0.5 font-semibold text-emerald">{profile?.role === 'doctor' ? t('me.role_doctor') : t('me.role_staff')}</p>
              </Card>
              <button onClick={signOut} className="min-h-14 rounded-2xl border-2 border-ink/15 text-lg font-semibold text-ink/70">{tt('signout')}</button>
            </div>
          )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-ink/10 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(30,42,38,.06)]">
        <ul className="relative grid grid-cols-4">
          <span aria-hidden className="absolute top-1.5 h-10 w-1/4 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]" style={{ transform: `translateX(${idx * 100}%)` }}>
            <span className="mx-auto block h-full w-14 rounded-full bg-mint/70" />
          </span>
          {TABS.map((x) => (
            <li key={x.id} className="relative">
              <button onClick={() => go(x.id)} aria-current={r.tab === x.id ? 'page' : undefined}
                className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${r.tab === x.id ? 'text-emerald' : 'text-ink/55'}`}>
                <span className="text-xl">{x.icon}</span>
                {t(`nav.${x.id}`)}
                {x.id === 'alerts' && alertCount > 0 && <span className="pop absolute right-[calc(50%-22px)] top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold text-white">{alertCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

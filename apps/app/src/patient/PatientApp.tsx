import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { usePatientData } from '../lib/patient'
import { flushQueue } from '../lib/offline'
import { haptic, transition } from '../lib/feel'
import { LANGS } from '../i18n'
import { Skeleton } from '../components/Toast'
import Today from './Today'
import Checkin from './Checkin'
import Progress from './Progress'
import Plan from './Plan'
import Me from './Me'
import Onboarding from './Onboarding'

const TABS = [
  { id: 'today', icon: '🏠' },
  { id: 'checkin', icon: '📷' },
  { id: 'progress', icon: '📈' },
  { id: 'plan', icon: '📋' },
  { id: 'me', icon: '👤' },
] as const

function readTab() {
  const h = location.hash.replace('#/', '')
  return TABS.some((x) => x.id === h) ? h : 'today'
}

export default function PatientApp() {
  const { t, i18n } = useTranslation('p')
  const { session, profile } = useAuth()
  const uid = session!.user.id
  const data = usePatientData(uid)
  const [tab, setTab] = useState(readTab)
  const [onboarded, setOnboarded] = useState(() => { try { return localStorage.getItem('onboarded') === '1' } catch { return true } })

  useEffect(() => {
    const f = () => transition(() => setTab(readTab()))
    window.addEventListener('hashchange', f)
    const flush = () => flushQueue().then((n) => { if (n) data.reload() })
    flush()
    window.addEventListener('online', flush)
    return () => { window.removeEventListener('hashchange', f); window.removeEventListener('online', flush) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string) => {
    if (id === tab) return window.scrollTo({ top: 0, behavior: 'smooth' })
    haptic(8)
    location.hash = `#/${id}`
    window.scrollTo(0, 0)
  }

  if (!onboarded) {
    return <Onboarding onDone={() => { try { localStorage.setItem('onboarded', '1') } catch { /* ignore */ } transition(() => setOnboarded(true)) }} />
  }

  const idx = TABS.findIndex((x) => x.id === tab)
  const firstName = (profile?.full_name || '').split(' ')[0]
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-paper">
      {/* Solid background (no blur): blur har scroll pe GPU ko thakata hai, phone slow hota tha */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-paper px-4 py-3 shadow-[0_1px_0_rgba(30,42,38,.06)]">
        <img src="/logo.png" alt="Chinmay Wellness Club" className="h-9 w-auto" width="120" height="36" />
        <div className="relative flex rounded-full bg-white p-1 shadow-sm">
          <span aria-hidden className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-emerald transition-transform duration-300 [transition-timing-function:var(--ease-out)]"
            style={{ transform: `translateX(${i18n.language === 'en' ? '100%' : '0'})` }} />
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => { haptic(8); i18n.changeLanguage(l.code) }} aria-pressed={i18n.language === l.code}
              className={`relative z-[1] min-h-9 flex-1 rounded-full px-3 text-sm font-semibold ${i18n.language === l.code ? 'text-white' : 'text-ink/70'}`}>{l.label}</button>
          ))}
        </div>
      </header>
      <main key={tab} className="px-4 pb-28 pt-1">
        {data.loading ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        ) : tab === 'today' ? <Today data={data} go={go} name={firstName} />
          : tab === 'checkin' ? <Checkin data={data} uid={uid} />
          : tab === 'progress' ? <Progress data={data} />
          : tab === 'plan' ? <Plan data={data} />
          : <Me />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-ink/10 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(30,42,38,.06)]">
        <ul className="relative grid grid-cols-5">
          {/* Sliding pill: active tab ke peeche smoothly khiskta hai */}
          <span aria-hidden className="absolute top-1.5 h-10 w-1/5 transition-transform duration-300 [transition-timing-function:var(--ease-spring)]" style={{ transform: `translateX(${idx * 100}%)` }}>
            <span className="mx-auto block h-full w-14 rounded-full bg-mint/70" />
          </span>
          {TABS.map((x) => (
            <li key={x.id} className="relative">
              <button onClick={() => go(x.id)} aria-current={tab === x.id ? 'page' : undefined}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${tab === x.id ? 'text-emerald' : 'text-ink/55'}`}>
                <span className={`text-xl transition-transform duration-300 [transition-timing-function:var(--ease-spring)] ${tab === x.id ? '-translate-y-0.5 scale-115' : ''}`}>{x.icon}</span>
                {t(`nav.${x.id}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

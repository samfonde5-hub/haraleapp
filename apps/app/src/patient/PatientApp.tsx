import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { usePatientData } from '../lib/patient'
import { flushQueue } from '../lib/offline'
import { LANGS } from '../i18n'
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
  const data = usePatientData()
  const [tab, setTab] = useState(readTab)
  const [onboarded, setOnboarded] = useState(() => { try { return localStorage.getItem('onboarded') === '1' } catch { return true } })

  useEffect(() => {
    const f = () => setTab(readTab())
    window.addEventListener('hashchange', f)
    flushQueue().then((n) => { if (n) data.reload() })
    return () => window.removeEventListener('hashchange', f)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id: string) => { location.hash = `#/${id}`; window.scrollTo(0, 0) }

  if (!onboarded) {
    return <Onboarding onDone={() => { try { localStorage.setItem('onboarded', '1') } catch { /* ignore */ } setOnboarded(true) }} />
  }

  const firstName = (profile?.full_name || '').split(' ')[0]
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-paper/90 px-4 py-3 backdrop-blur">
        <img src="/logo.png" alt="Chinmay Wellness Club" className="h-9 w-auto" />
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => i18n.changeLanguage(l.code)} aria-pressed={i18n.language === l.code}
              className={`min-h-9 rounded-full px-3 text-sm font-semibold ${i18n.language === l.code ? 'bg-emerald text-white' : 'text-ink/70'}`}>{l.label}</button>
          ))}
        </div>
      </header>
      <main className="px-4 pb-28 pt-1">
        {data.loading ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <div className="h-64 animate-pulse rounded-3xl bg-ink/10" />
            <div className="h-32 animate-pulse rounded-3xl bg-ink/10" />
          </div>
        ) : tab === 'today' ? <Today data={data} go={go} name={firstName} />
          : tab === 'checkin' ? <Checkin data={data} uid={session!.user.id} />
          : tab === 'progress' ? <Progress data={data} />
          : tab === 'plan' ? <Plan data={data} />
          : <Me />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-ink/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="grid grid-cols-5">
          {TABS.map((x) => (
            <li key={x.id}>
              <button onClick={() => go(x.id)} aria-current={tab === x.id ? 'page' : undefined}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${tab === x.id ? 'text-emerald' : 'text-ink/55'}`}>
                <span className={`text-xl ${tab === x.id ? 'scale-110' : ''}`}>{x.icon}</span>
                {t(`nav.${x.id}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

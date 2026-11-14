import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGS } from './i18n'
import { checkBackend } from './lib/supabase'

type Status = 'checking' | 'ok' | 'bad'

export default function App() {
  const { t, i18n } = useTranslation()
  const [db, setDb] = useState<Status>('checking')

  useEffect(() => {
    checkBackend().then((ok) => setDb(ok ? 'ok' : 'bad'))
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <img src="/logo.png" alt="Chinmay Wellness Club" className="h-12 w-auto" />
        <div role="group" aria-label={t('lang')} className="flex rounded-full bg-white p-1 shadow-sm">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              aria-pressed={i18n.language === l.code}
              className={`min-h-10 rounded-full px-3 text-sm font-semibold transition ${
                i18n.language === l.code ? 'bg-emerald text-white' : 'text-ink/70'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald to-emerald-dark p-6 text-white shadow-lg">
        <p className={`text-sm font-semibold text-mint ${i18n.language === 'en' ? 'font-latin uppercase tracking-[0.2em] text-xs' : ''}`}>
          {t('tagline')}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">{t('welcome')}</h1>
        <p className="mt-2 text-lg leading-relaxed text-white/90">{t('sub')}</p>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">{t('status')}</h2>
        <div className="mt-3 flex items-center gap-3" aria-live="polite">
          <span
            className={`inline-block h-4 w-4 rounded-full ${
              db === 'ok' ? 'bg-emerald' : db === 'bad' ? 'bg-coral' : 'bg-gold animate-pulse'
            }`}
          />
          <span className="text-lg font-semibold">
            {db === 'ok' ? t('db_ok') : db === 'bad' ? t('db_bad') : t('checking')}
          </span>
        </div>
      </section>

      <p className="mt-auto pt-10 text-center font-latin text-sm text-ink/50">{t('phase')}</p>
    </main>
  )
}

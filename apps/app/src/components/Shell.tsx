import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGS } from '../i18n'

/** Common page frame: logo + language switch + content. */
export default function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { t, i18n } = useTranslation()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-5">
      <header className="flex items-center justify-between gap-2">
        <img src="/logo.png" alt="Chinmay Wellness Club" className="h-11 w-auto" />
        <div className="flex items-center gap-2">
          {right}
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
        </div>
      </header>
      {children}
    </main>
  )
}

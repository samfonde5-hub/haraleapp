import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth, type ConsentType } from '../lib/auth'
import Shell from '../components/Shell'

const ITEMS: { type: ConsentType; required: boolean }[] = [
  { type: 'health_data', required: true },
  { type: 'ai_drafts', required: false },
  { type: 'reminders', required: false },
  { type: 'story', required: false },
]

export default function Consent() {
  const { t } = useTranslation()
  const { refresh, consents, setConsentLocal } = useAuth()
  const [val, setVal] = useState<Record<ConsentType, boolean>>({
    health_data: consents.health_data ?? false,
    ai_drafts: consents.ai_drafts ?? true,
    reminders: consents.reminders ?? true,
    story: consents.story ?? false,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!val.health_data) return setErr(t('consent.need_health'))
    setBusy(true)
    setErr('')
    // Append-only: har decision ek nayi row (DPDP proof)
    const { error } = await supabase
      .from('consents')
      .insert(ITEMS.map((i) => ({ type: i.type, granted: val[i.type], version: 'v1' })))
    setBusy(false)
    if (error) return setErr(t('consent.save_fail'))
    ITEMS.forEach((i) => setConsentLocal(i.type, val[i.type])) // turant aage jao
    refresh()
  }

  return (
    <Shell>
      <h1 className="rise mt-6 font-display text-3xl font-extrabold">{t('consent.title')}</h1>
      <p className="mt-2 text-lg text-ink/80">{t('consent.sub')}</p>
      <ul className="mt-5 flex flex-col gap-3">
        {ITEMS.map((i, k) => (
          <li key={i.type} className="rise rounded-2xl bg-white p-4 shadow-sm" style={{ '--i': k } as React.CSSProperties}>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={val[i.type]}
                onChange={(e) => setVal({ ...val, [i.type]: e.target.checked })}
                className="mt-1 h-7 w-7 shrink-0 accent-emerald"
              />
              <span>
                <span className="block font-display text-lg font-bold">
                  {t(`consent.${i.type}.title`)}
                  {i.required && <span className="ml-2 rounded-full bg-coral/15 px-2 text-sm text-coral">{t('consent.required')}</span>}
                </span>
                <span className="block text-ink/70">{t(`consent.${i.type}.desc`)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="mt-4 rounded-2xl bg-coral/10 p-3 text-center font-semibold text-coral">{err}</p>}
      <button onClick={save} disabled={busy} className="mt-5 min-h-14 rounded-2xl bg-emerald text-lg font-bold text-white shadow disabled:opacity-60">
        {busy ? t('wait') : t('consent.save')}
      </button>
      <p className="mt-3 text-center text-sm text-ink/50">{t('consent.change_later')}</p>
    </Shell>
  )
}

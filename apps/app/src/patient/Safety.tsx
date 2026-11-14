import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import { haptic } from '../lib/feel'
import type { usePatientData } from '../lib/patient'

type Data = ReturnType<typeof usePatientData>

/** PRD P16: "मला बरं वाटत नाही" — AI nahi, seedha doctor + 108. Hamesha dikhta hai, kabhi chhupta nahi. */
export default function Safety({ data }: { data: Data }) {
  const { t } = useTranslation('p')
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const active = !!data.alert && data.alert.status !== 'resolved'

  async function send() {
    setBusy(true)
    const { error } = await data.raiseAlert(note)
    setBusy(false)
    if (error === 'too_many') { toast(t('safety.too_many'), false); setSent(true); return }
    if (error) { toast(t('checkin.fail'), false); return }
    haptic(40)
    setSent(true)
  }

  return (
    <>
      <button onClick={() => { haptic(15); setSent(false); setOpen(true) }}
        className="rise flex min-h-16 w-full items-center gap-3 rounded-3xl border-2 border-coral/40 bg-white px-4 py-3 text-left shadow-sm" style={{ '--i': 3 } as React.CSSProperties}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral/15 text-2xl">🆘</span>
        <span className="min-w-0">
          <span className="block font-display text-lg font-bold text-coral">{t('safety.button')}</span>
          <span className="block text-sm text-ink/60">{active ? `✓ ${t('safety.active')}` : t('safety.sub')}</span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="fade-in absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="sheet relative w-full max-w-md rounded-t-[2rem] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-ink/15" />
            {sent ? (
              <div className="text-center">
                <span className="pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint text-3xl">🙏</span>
                <h2 className="rise mt-3 font-display text-2xl font-bold">{t('safety.sent_title')}</h2>
                <p className="rise mt-2 text-lg text-ink/75" style={{ animationDelay: '80ms' }}>{t('safety.sent_body')}</p>
                <a href="tel:108" className="btn rise mt-5 flex min-h-14 items-center justify-center rounded-2xl bg-coral text-lg font-bold text-white shadow-lg shadow-coral/30" style={{ animationDelay: '160ms' }}>{t('safety.call')}</a>
                <button onClick={() => setOpen(false)} className="mt-2 w-full text-ink/60">✕</button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold">{t('safety.title')}</h2>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t('safety.note')}
                  className="mt-3 w-full rounded-2xl border-2 border-ink/10 p-3 text-lg outline-none focus:border-coral" />
                <button onClick={send} disabled={busy} className="mt-3 min-h-14 w-full rounded-2xl bg-coral text-lg font-bold text-white shadow-lg shadow-coral/30 disabled:opacity-70">
                  {busy ? <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" /> : t('safety.send')}
                </button>
                <a href="tel:108" className="btn mt-2 flex min-h-12 items-center justify-center rounded-2xl border-2 border-coral/30 font-bold text-coral">{t('safety.call')}</a>
                <button onClick={() => setOpen(false)} className="mt-1 w-full text-ink/60">{t('safety.cancel')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

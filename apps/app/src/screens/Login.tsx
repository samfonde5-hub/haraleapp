import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'

/** Google login tab dikhega jab Supabase me Google provider on ho (env flag) */
const GOOGLE = import.meta.env.VITE_GOOGLE_LOGIN === '1'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Login() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) return setErr(t('login.bad_email'))
    // Ek hi email pe 10 min me dobara link mat bhejo — pehle wala link chalta hai, aur email quota bachta hai
    let last = 0
    try { last = Number(localStorage.getItem(`otp:${clean}`) || 0) } catch { /* ignore */ }
    if (Date.now() - last < 10 * 60_000) { setEmail(clean); setStep('code'); return setErr(t('login.already_sent')) }
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, data: { lang: i18n.language }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) return setErr(error.status === 429 ? t('login.too_many') : t('login.send_fail'))
    try { localStorage.setItem(`otp:${clean}`, String(Date.now())) } catch { /* ignore */ }
    setEmail(clean)
    setStep('code')
  }

  async function google() {
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { setBusy(false); setErr(t('login.send_fail')) }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const token = code.replace(/\D/g, '')
    if (token.length < 6) return setErr(t('login.bad_code'))
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    if (error) setErr(t('login.wrong_code'))
    // success: AuthProvider ko onAuthStateChange se session milega
  }

  return (
    <Shell>
      <section className="mt-8 rounded-3xl bg-gradient-to-br from-emerald to-emerald-dark p-6 text-white shadow-lg">
        <h1 className="font-display text-3xl font-extrabold leading-tight">{t('login.title')}</h1>
        <p className="mt-2 text-lg text-white/90">{t('login.sub')}</p>
      </section>

      {step === 'email' && GOOGLE && (
        <div className="rise mt-6">
          <button onClick={google} disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-ink/10 bg-white text-lg font-bold text-ink shadow-sm disabled:opacity-60">
            <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {t('login.google')}
          </button>
          <p className="my-4 flex items-center gap-3 text-sm text-ink/50"><span className="h-px flex-1 bg-ink/15" />{t('login.or_email')}<span className="h-px flex-1 bg-ink/15" /></p>
        </div>
      )}
      {step === 'email' ? (
        <form onSubmit={sendCode} className={`${GOOGLE ? '' : 'mt-6 '}flex flex-col gap-3`} noValidate>
          <label htmlFor="email" className="font-display text-lg font-bold">{t('login.email')}</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
            className="min-h-14 rounded-2xl border-2 border-ink/10 bg-white px-4 text-lg outline-none focus:border-emerald"
          />
          <button disabled={busy} className="min-h-14 rounded-2xl bg-coral text-lg font-bold text-white shadow disabled:opacity-60">
            {busy ? t('wait') : t('login.send')}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 flex flex-col gap-3" noValidate>
          <p className="text-lg">{t('login.sent_to')} <b className="break-all">{email}</b></p>
          <p className="rounded-2xl bg-mint/40 p-3 text-ink">{t('login.link_hint')}</p>
          <label htmlFor="code" className="font-display text-lg font-bold">{t('login.code')}</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="min-h-14 rounded-2xl border-2 border-ink/10 bg-white px-4 text-center font-latin text-2xl tracking-[0.4em] outline-none focus:border-emerald"
          />
          <button disabled={busy} className="min-h-14 rounded-2xl bg-emerald text-lg font-bold text-white shadow disabled:opacity-60">
            {busy ? t('wait') : t('login.verify')}
          </button>
          <button type="button" onClick={() => { setStep('email'); setCode(''); setErr('') }} className="text-emerald underline">
            {t('login.change_email')}
          </button>
        </form>
      )}

      {err && <p role="alert" className="mt-4 rounded-2xl bg-coral/10 p-3 text-center font-semibold text-coral">{err}</p>}
      <p className="mt-auto pt-8 text-center text-sm text-ink/50">{t('login.privacy')}</p>
    </Shell>
  )
}

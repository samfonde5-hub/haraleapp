import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'

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

      {step === 'email' ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3" noValidate>
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

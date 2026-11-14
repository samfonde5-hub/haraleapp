import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import Shell from '../components/Shell'

function SignOut() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  return (
    <button onClick={signOut} className="min-h-10 rounded-full bg-white px-3 text-sm font-semibold text-ink/70 shadow-sm">
      {t('signout')}
    </button>
  )
}

/** Phase 1 shell. Phase 3 me yahan Today queue / Patients / Approvals aayenge. */
export function DoctorHome() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  return (
    <Shell right={<SignOut />}>
      <section className="mt-6 rounded-3xl bg-ink p-6 text-white shadow-lg">
        <p className="font-latin text-xs uppercase tracking-[0.2em] text-gold">{profile?.role === 'doctor' ? 'Doctor' : 'Staff'} dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{t('doctor.hello')}</h1>
        <p className="mt-2 text-lg text-white/80">{t('doctor.soon')}</p>
        <p className="mt-4 text-sm text-white/60">{profile?.email}</p>
      </section>
    </Shell>
  )
}

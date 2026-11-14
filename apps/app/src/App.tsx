import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './screens/Login'
import Consent from './screens/Consent'
import { DoctorHome, PatientHome } from './screens/Homes'

function Router() {
  const { t } = useTranslation()
  const { loading, session, profile, consents } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <img src="/logo.png" alt="" className="h-14 animate-pulse" />
        <span className="sr-only">{t('wait')}</span>
      </div>
    )
  }
  if (!session || !profile) return <Login />
  if (profile.role === 'doctor' || profile.role === 'staff') return <DoctorHome />
  if (!consents.health_data) return <Consent />
  return <PatientHome />
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}

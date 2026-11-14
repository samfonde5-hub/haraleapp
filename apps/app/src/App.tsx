import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './components/Toast'

// Code-splitting: har screen alag chhoti file. Patient ko doctor ka code download hi nahi karna padta.
const Login = lazy(() => import('./screens/Login'))
const Consent = lazy(() => import('./screens/Consent'))
const DoctorHome = lazy(() => import('./screens/Homes').then((m) => ({ default: m.DoctorHome })))
const PatientApp = lazy(() => import('./patient/PatientApp'))

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <img src="/logo.png" alt="Chinmay Wellness" className="pop h-14" />
    </div>
  )
}

function Router() {
  const { loading, session, profile, consents } = useAuth()
  if (loading) return <Splash />
  if (!session || !profile) return <Login />
  if (profile.role === 'doctor' || profile.role === 'staff') return <DoctorHome />
  if (!consents.health_data) return <Consent />
  return <PatientApp />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<Splash />}>
          <Router />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

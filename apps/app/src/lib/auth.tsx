import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearUserCache, readCache, writeCache } from './cache'

export type Role = 'patient' | 'doctor' | 'staff'
export type Profile = { id: string; role: Role; full_name: string | null; email: string | null; lang: 'mr' | 'en' }
export type ConsentType = 'health_data' | 'ai_drafts' | 'reminders' | 'story'
export type Consents = Partial<Record<ConsentType, boolean>>
type Me = { profile: Profile | null; consents: Consents }

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  consents: Consents
  refresh: () => Promise<void>
  setConsentLocal: (t: ConsentType, v: boolean) => void
  setProfileLocal: (p: Partial<Profile>) => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<Me>({ profile: null, consents: {} })
  const lastUid = useRef<string | null>(null)

  const fetchMe = useCallback(async (uid: string) => {
    const { data, error } = await supabase.rpc('me')
    if (!error && data) {
      const m = data as Me
      setMe(m)
      writeCache(`c:me:${uid}`, m)
    }
    setLoading(false)
  }, [])

  const apply = useCallback((s: Session | null) => {
    setSession(s)
    const uid = s?.user.id ?? null
    if (!uid) {
      lastUid.current = null
      setMe({ profile: null, consents: {} })
      setLoading(false)
      return
    }
    if (lastUid.current === uid) return // same user: no duplicate fetch (was 2x before)
    lastUid.current = uid
    const cached = readCache<Me>(`c:me:${uid}`)
    if (cached?.profile) { setMe(cached); setLoading(false) } // instant start from phone cache
    fetchMe(uid)
  }, [fetchMe])

  useEffect(() => {
    // Purana/expired email link khula ho to URL me "#error=..." aata hai — use saaf karo, message Login screen dikhayega
    if (location.hash.includes('error=')) {
      const code = new URLSearchParams(location.hash.slice(1)).get('error_code')
      try { sessionStorage.setItem('authError', code || 'error') } catch { /* ignore */ }
      history.replaceState(null, '', location.pathname)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setTimeout(() => apply(s), 0))
    return () => sub.subscription.unsubscribe()
  }, [apply])

  const value: AuthState = {
    loading,
    session,
    profile: me.profile,
    consents: me.consents,
    refresh: async () => { if (session) await fetchMe(session.user.id) },
    setConsentLocal: (t, v) => setMe((m) => ({ ...m, consents: { ...m.consents, [t]: v } })),
    setProfileLocal: (p) => setMe((m) => (m.profile ? { ...m, profile: { ...m.profile, ...p } } : m)),
    signOut: async () => { clearUserCache(); await supabase.auth.signOut() },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

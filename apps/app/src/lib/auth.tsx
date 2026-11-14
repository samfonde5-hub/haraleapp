import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'patient' | 'doctor' | 'staff'
export type Profile = { id: string; role: Role; full_name: string | null; email: string | null; lang: 'mr' | 'en' }
export type ConsentType = 'health_data' | 'ai_drafts' | 'reminders' | 'story'
export type Consents = Partial<Record<ConsentType, boolean>>

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  consents: Consents
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [consents, setConsents] = useState<Consents>({})

  const load = useCallback(async (s: Session | null) => {
    setSession(s)
    if (!s) {
      setProfile(null)
      setConsents({})
      setLoading(false)
      return
    }
    // RLS: ye queries sirf is user ka apna data laati hain
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('id, role, full_name, email, lang').eq('id', s.user.id).single(),
      supabase.from('current_consents').select('type, granted').eq('profile_id', s.user.id),
    ])
    setProfile((p as Profile) ?? null)
    const map: Consents = {}
    ;(c ?? []).forEach((r: { type: ConsentType; granted: boolean }) => (map[r.type] = r.granted))
    setConsents(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // async kaam callback ke bahar, Supabase ki recommendation
      setTimeout(() => load(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const value: AuthState = {
    loading,
    session,
    profile,
    consents,
    refresh: async () => load((await supabase.auth.getSession()).data.session),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

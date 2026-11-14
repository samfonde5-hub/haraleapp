import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { todayIST } from './dates'
import { readCache, writeCache } from './cache'

export type Patient = { id: string; full_name: string; start_date: string | null; start_weight: number | null; target_weight: number | null; program: string; status: string }
export type DailyLog = { id: string; log_date: string; weight_kg: number | null; water_glasses: number | null; steps: number | null; mood: number | null }
export type Checkin = { id: string; log_date: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; photo_path: string | null; note: string | null; doctor_reaction: string | null; created_at: string; ai_tag?: string | null; ai_items?: { items?: string[]; tip_mr?: string | null; tip_en?: string | null } | null; localUrl?: string; analyzing?: boolean }
export type PlanBody = { days?: { label: string; meals: { time: string; text: string }[] }[]; workout?: string }
export type Plan = { id: string; week_no: number; status: string; focus_goal: string | null; body: PlanBody; doctor_note: string | null; approved_at: string | null }
export type Alert = { id: string; status: string; created_at: string }
export type NextAppt = { id: string; starts_at: string; kind: string; status: string; meet_link: string | null }
type Home = { patient: Patient | null; logs: DailyLog[]; checkins: Checkin[]; plan: Plan | null; alert?: Alert | null; next_appt?: NextAppt | null; unread?: number }
const EMPTY: Home = { patient: null, logs: [], checkins: [], plan: null, alert: null, next_appt: null, unread: 0 }

/**
 * All patient-screen data in ONE server call (rpc patient_home), shown instantly from
 * phone cache first. Mutations are OPTIMISTIC: screen updates immediately, server in background.
 */
export function usePatientData(uid: string) {
  const key = `c:home:${uid}`
  const cached = readCache<Home>(key)
  const [home, setHome] = useState<Home>(cached ?? EMPTY)
  const [loading, setLoading] = useState(!cached)

  const save = useCallback((h: Home) => { setHome(h); writeCache(key, { ...h, checkins: h.checkins.filter((c) => !c.localUrl).map(({ analyzing: _a, ...c }) => c) }) }, [key])

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('patient_home')
    if (!error && data) save(data as Home)
    setLoading(false)
  }, [save])

  useEffect(() => { reload() }, [reload])

  const today = todayIST()
  const todayLog = home.logs.find((l) => l.log_date === today) ?? null

  /** Optimistic daily-log patch (water, weight, mood…). Reverts if server says no. */
  const patchLog = useCallback(async (patch: Partial<Omit<DailyLog, 'id' | 'log_date'>>) => {
    if (!home.patient) return { error: 'no patient' }
    const before = home
    const existing = home.logs.find((l) => l.log_date === today)
    const next: DailyLog = { id: existing?.id ?? 'local', log_date: today, weight_kg: null, water_glasses: null, steps: null, mood: null, ...existing, ...patch }
    save({ ...home, logs: [...home.logs.filter((l) => l.log_date !== today), next].sort((a, b) => a.log_date.localeCompare(b.log_date)) })
    const { error } = await supabase.from('daily_logs').upsert({ patient_id: home.patient.id, log_date: today, ...patch }, { onConflict: 'patient_id,log_date' })
    if (error) { save(before); return { error: error.message } }
    return { error: null }
  }, [home, today, save])

  /** Show a just-taken photo in the list immediately (before upload finishes). */
  const addLocalCheckin = useCallback((c: Checkin) => save({ ...home, checkins: [c, ...home.checkins] }), [home, save])

  /** Safety button: seedha doctor ko alert (AI is raaste pe kabhi jawab nahi deta). */
  const raiseAlert = useCallback(async (note: string) => {
    if (!home.patient) return { error: 'no patient' }
    const { data, error } = await supabase.from('alerts').insert({ patient_id: home.patient.id, note: note.trim().slice(0, 500) || null }).select('id, status, created_at').single()
    if (error) return { error: error.code === '54000' ? 'too_many' : error.message }
    save({ ...home, alert: data as Alert })
    return { error: null }
  }, [home, save])

  const derived = useMemo(() => {
    const active = new Set([...home.logs.map((l) => l.log_date), ...home.checkins.map((c) => c.log_date)])
    let streak = 0
    for (let i = active.has(today) ? 0 : 1; i < 365; i++) {
      const d = new Date(Date.parse(today) - i * 86_400_000).toISOString().slice(0, 10)
      if (active.has(d)) streak++
      else break
    }
    return { active, streak, todayCheckins: home.checkins.filter((c) => c.log_date === today) }
  }, [home, today])

  const clearUnread = useCallback(() => save({ ...home, unread: 0 }), [home, save])
  return { loading, ...home, todayLog, ...derived, reload, patchLog, addLocalCheckin, raiseAlert, clearUnread }
}

const urlCache = new Map<string, string>()
/** Private photo → short-lived signed URL (1 hour), cached in memory so tabs don't refetch. */
export function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(path ? urlCache.get(path) ?? null : null)
  useEffect(() => {
    let alive = true
    if (path && !urlCache.has(path)) {
      supabase.storage.from('plates').createSignedUrl(path, 3600).then(({ data }) => {
        if (data?.signedUrl) urlCache.set(path, data.signedUrl)
        if (alive) setUrl(data?.signedUrl ?? null)
      })
    }
    return () => { alive = false }
  }, [path])
  return url
}

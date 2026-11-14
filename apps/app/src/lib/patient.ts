import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { todayIST } from './dates'

export type Patient = { id: string; full_name: string; start_date: string | null; start_weight: number | null; target_weight: number | null; program: string; status: string }
export type DailyLog = { id: string; log_date: string; weight_kg: number | null; water_glasses: number | null; steps: number | null; mood: number | null }
export type Checkin = { id: string; log_date: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; photo_path: string | null; note: string | null; doctor_reaction: string | null; created_at: string }
export type Plan = { id: string; week_no: number; status: string; focus_goal: string | null; body: PlanBody; doctor_note: string | null; approved_at: string | null }
export type PlanBody = { days?: { label: string; meals: { time: string; text: string }[] }[]; workout?: string }

/** Everything the patient screens need, loaded once and refreshable. RLS keeps it to own data. */
export function usePatientData() {
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)

  const load = useCallback(async () => {
    const { data: p } = await supabase.from('patients').select('id, full_name, start_date, start_weight, target_weight, program, status').maybeSingle()
    setPatient((p as Patient) ?? null)
    if (p) {
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
      const [l, c, pl] = await Promise.all([
        supabase.from('daily_logs').select('id, log_date, weight_kg, water_glasses, steps, mood').gte('log_date', since).order('log_date'),
        supabase.from('checkins').select('id, log_date, meal, photo_path, note, doctor_reaction, created_at').gte('log_date', since).order('created_at', { ascending: false }),
        supabase.from('plans').select('id, week_no, status, focus_goal, body, doctor_note, approved_at').order('week_no', { ascending: false }).limit(1).maybeSingle(),
      ])
      setLogs((l.data as DailyLog[]) ?? [])
      setCheckins((c.data as Checkin[]) ?? [])
      setPlan((pl.data as Plan) ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = todayIST()
  const todayLog = logs.find((l) => l.log_date === today) ?? null
  const todayCheckins = checkins.filter((c) => c.log_date === today)

  /** Consecutive days (ending today or yesterday) with any check-in or log. */
  const active = new Set([...logs.map((l) => l.log_date), ...checkins.map((c) => c.log_date)])
  let streak = 0
  for (let i = active.has(today) ? 0 : 1; i < 365; i++) {
    const d = new Date(Date.parse(today) - i * 86_400_000).toISOString().slice(0, 10)
    if (active.has(d)) streak++
    else break
  }

  return { loading, patient, logs, checkins, plan, todayLog, todayCheckins, streak, active, reload: load }
}

/** Private photo → short-lived signed URL (1 hour). */
export function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (path) supabase.storage.from('plates').createSignedUrl(path, 3600).then(({ data }) => alive && setUrl(data?.signedUrl ?? null))
    return () => { alive = false }
  }, [path])
  return url
}

export async function saveLog(patientId: string, patch: Partial<Omit<DailyLog, 'id' | 'log_date'>>) {
  return supabase.from('daily_logs').upsert({ patient_id: patientId, log_date: todayIST(), ...patch }, { onConflict: 'patient_id,log_date' })
}

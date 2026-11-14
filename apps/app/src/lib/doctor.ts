import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { readCache, writeCache } from './cache'

export type DCheckin = { id: string; meal: string; photo_path: string | null; note: string | null; ai_tag: string | null; ai_items: { items?: string[]; tip_mr?: string | null; tip_en?: string | null } | null; doctor_reaction: string | null; created_at: string; patient_id?: string; full_name?: string; log_date?: string }
export type DAlert = { id: string; note: string | null; status: string; created_at: string; patient_id?: string; full_name?: string; phone?: string | null }
export type DToday = { today: string; alerts: DAlert[]; checkins: DCheckin[]; quiet: { id: string; full_name: string; phone: string | null; last_active: string | null }[]; counts: { active: number; checkins_today: number; to_react: number; open_alerts: number } }
export type DPatientRow = { id: string; full_name: string; phone: string | null; invite_email: string | null; status: string; program: string; start_date: string | null; start_weight: number | null; target_weight: number | null; conditions: string[]; doctor_only: boolean; joined: boolean; last_weight: number | null; last_active: string | null }
export type DPlan = { id: string; week_no: number; status: string; focus_goal: string | null; body: { days?: { label: string; meals: { time: string; text: string }[] }[] }; doctor_note: string | null; approved_at: string | null }
export type DPatient = { patient: DPatientRow & { height_cm: number | null; city: string | null }; logs: { log_date: string; weight_kg: number | null }[]; checkins: DCheckin[]; plans: DPlan[]; alerts: DAlert[] }

/** Generic: RPC + phone cache (instant open) + background refresh. */
function useRpc<T>(fn: string, args: Record<string, unknown> | undefined, key: string | null) {
  const [data, setData] = useState<T | null>(() => (key ? readCache<T>(key) : null))
  const [loading, setLoading] = useState(data === null)
  const reload = useCallback(async () => {
    if (!key) return
    const { data: d, error } = await supabase.rpc(fn, args)
    if (!error && d) { setData(d as T); writeCache(key, d) }
    setLoading(false)
  }, [fn, key, JSON.stringify(args)]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [reload])
  return { data, setData, loading, reload }
}

export const useDoctorToday = () => useRpc<DToday>('doctor_today', undefined, 'c:dtoday')
export const useDoctorPatients = () => useRpc<DPatientRow[]>('doctor_patients', undefined, 'c:dpatients')
export const useDoctorPatient = (id: string | null) => useRpc<DPatient>('doctor_patient', id ? { pid: id } : undefined, id ? `c:dp:${id}` : null)

export async function reactToCheckin(id: string, text: string) {
  return supabase.from('checkins').update({ doctor_reaction: text.trim().slice(0, 300) }).eq('id', id)
}
export async function setAlertStatus(id: string, status: 'seen' | 'resolved') {
  const { data: u } = await supabase.auth.getUser()
  return supabase.from('alerts').update({ status, handled_by: u.user?.id }).eq('id', id)
}
export async function addPatient(p: { full_name: string; invite_email: string; phone: string | null; start_weight: number | null; target_weight: number | null; start_date: string | null; conditions: string[] }) {
  return supabase.from('patients').insert(p)
}
export async function savePlan(p: { id?: string; patient_id: string; week_no: number; focus_goal: string | null; doctor_note: string | null; body: DPlan['body']; status: 'draft' | 'approved' }) {
  if (p.id) { const { id, ...rest } = p; return supabase.from('plans').update(rest).eq('id', id) }
  return supabase.from('plans').insert(p)
}

import type { TFunction } from 'i18next'
export function ago(iso: string, t: TFunction<'d'>) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (m < 1) return t('ago.now')
  if (m < 60) return t('ago.m', { n: m })
  if (m < 1440) return t('ago.h', { n: Math.round(m / 60) })
  return t('ago.d', { n: Math.round(m / 1440) })
}

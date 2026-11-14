import { useCallback, useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { supabase } from './supabase'
import { readCache, writeCache } from './cache'

export type AiItems = { items?: string[]; tip_mr?: string | null; tip_en?: string | null; portions?: { grains?: number; veg?: number; protein?: number; dal?: number } } | null
export type DCheckin = { id: string; meal: string; photo_path: string | null; note: string | null; ai_tag: string | null; ai_items: AiItems; ai_confidence?: number | null; doctor_reaction: string | null; created_at: string; patient_id?: string; full_name?: string; log_date?: string }
export type DAlert = { id: string; note: string | null; status: string; created_at: string; patient_id?: string; full_name?: string; phone?: string | null }
export type DToday = { today: string; alerts: DAlert[]; checkins: DCheckin[]; quiet: { id: string; full_name: string; phone: string | null; last_active: string | null }[]; counts: { active: number; checkins_today: number; to_react: number; open_alerts: number } }
export type DPatientRow = { id: string; full_name: string; phone: string | null; invite_email: string | null; status: string; program: string; start_date: string | null; start_weight: number | null; target_weight: number | null; conditions: string[]; doctor_only: boolean; joined: boolean; last_weight: number | null; last_active: string | null; week?: number | null; unread?: number; is_demo?: boolean }
export type DPlanBody = { days?: { label: string; meals: { time: string; text: string }[] }[]; workout?: string }
export type DPlan = { id: string; week_no: number; status: string; focus_goal: string | null; body: DPlanBody; doctor_note: string | null; approved_at: string | null; source?: string; risk_level?: string; ai_reason?: string | null; ai_changes?: { minus?: string; plus?: string; why?: string }[] | null; safety?: { label: string; ok: boolean }[] | null }
export type DMessage = { id: string; from_doctor: boolean; body: string | null; voice_path: string | null; read_at: string | null; created_at: string }
export type DAppt = { id: string; name: string; phone?: string | null; starts_at: string; duration_min?: number; kind: string; status: string; paid: boolean; amount: number | null; note: string | null; patient_id?: string | null; lead_id?: string | null; reminded_at?: string | null; meet_link?: string | null }
export type DPatient = {
  patient: DPatientRow & { height_cm: number | null; city: string | null; dob: string | null; gender: string | null; diet_template_id: string | null; workout_template_id: string | null; kcal_min: number | null; kcal_max: number | null; dislikes: string | null; on_medication: boolean; week: number | null; created_at: string }
  logs: { log_date: string; weight_kg: number | null; water_glasses: number | null; steps: number | null; mood: number | null }[]
  measurements: { measured_on: string; weight_kg: number | null; waist_cm: number | null; hip_cm: number | null }[]
  checkins: DCheckin[]; plans: DPlan[]; alerts: DAlert[]; notes: { id: string; body: string; created_at: string }[] | null
  consents: { type: string; granted: boolean; created_at: string }[]; messages: DMessage[]; appointments: DAppt[]; stories: { id: string; status: string; kind: string; requested_at: string }[]
}
export type RadarRow = { id: string; full_name: string; phone: string | null; program: string; week: number | null; days_quiet: number; mood_recent: number | null; mood_prev: number | null; weight_change_9d: number | null; ci_last7: number; ci_prev7: number; unread: number; no_shows: number; last_mood: number | null; score: number }
export type Lead = { id: string; full_name: string; phone: string | null; source: string; keyword: string | null; goal: string | null; medical: string | null; tried_before: string | null; can_come: string | null; note: string | null; answers_count: number; stage: 'new' | 'qualified' | 'booked' | 'joined' | 'lost'; lost_reason: string | null; retry_at: string | null; patient_id: string | null; created_at: string; stage_changed_at: string; is_demo?: boolean }
export type Dashboard = {
  today: string
  counts: { approvals: number; radar_high: number; leads_new: number; alerts: number; unread: number; plates_todo: number }
  kpi: { active: number; leads_week: number; leads_prev_week: number; consults_today: number; first_today: number; checked_in_today: number }
  radar: RadarRow[]
  leads_followup: { id: string; full_name: string; phone: string | null; keyword: string | null; stage: string; answers_count: number; created_at: string; age_days: number }[]
  good_week: { id: string; full_name: string; phone: string | null; week: number | null; change: number }[]
  testimonial_due: { id: string; full_name: string; week: number }[]
  consults: DAppt[]
  funnel: { inquiries: number; booked: number; showed: number; joined: number }
}
export type Template = { id: string; kind: 'diet' | 'workout'; name: string; kcal: number | null; level: string | null; sections: { title: string; rule: string; items: string }[]; rules: string[]; updated_at: string }
export type Food = { id: string; name: string; portion: string | null; kcal: number | null; category: string; avoid: boolean }
export type Story = { id: string; patient_id: string | null; status: 'requested' | 'consent_given' | 'ready' | 'published' | 'declined'; kind: string; title: string | null; quote: string | null; display_name: string; consent: Record<string, boolean>; keyword: string | null; leads_count: number; note: string | null; requested_at: string; published_at: string | null; patients?: { full_name: string; start_date: string | null } | null }
export type Report = {
  month: string; inquiries: number; inquiries_prev: number; joined: number; new_patients: number; active: number; dropped: number; maintenance: number
  week4: { cohort: number; active: number }; by_keyword: { keyword: string; leads: number; joined: number }[]
  funnel: { inquiries: number; booked: number; showed: number; joined: number }
  best_story: { title: string; kind: string; keyword: string | null; leads_count: number } | null; plates: number; consults: number; revenue_assess: number
}

/** Generic: RPC + phone cache (instant open) + background refresh. */
function useRpc<T>(fn: string, args: Record<string, unknown> | undefined, key: string | null) {
  const [data, setData] = useState<T | null>(() => (key ? readCache<T>(key) : null))
  const [loading, setLoading] = useState(data === null)
  const [error, setError] = useState<string | null>(null)
  const argKey = JSON.stringify(args ?? null)
  const reload = useCallback(async () => {
    if (!key) return
    const { data: d, error: e } = await supabase.rpc(fn, args)
    if (e) setError(e.message)
    else if (d !== null && d !== undefined) { setData(d as T); writeCache(key, d); setError(null) }
    setLoading(false)
  }, [fn, key, argKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [reload])
  return { data, setData, loading, error, reload }
}
/** Generic table select with cache. */
function useTable<T>(key: string, q: () => PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const [data, setData] = useState<T | null>(() => readCache<T>(key))
  const [loading, setLoading] = useState(data === null)
  const reload = useCallback(async () => {
    const { data: d, error } = await q()
    if (!error && d) { setData(d); writeCache(key, d) }
    setLoading(false)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [reload])
  return { data, setData, loading, reload }
}

export const useDashboard = () => useRpc<Dashboard>('doctor_dashboard', undefined, 'c:ddash')
export const useDoctorToday = () => useRpc<DToday>('doctor_today', undefined, 'c:dtoday')
export const useDoctorPatients = () => useRpc<DPatientRow[]>('doctor_patients', undefined, 'c:dpatients')
export const useDoctorPatient = (id: string | null) => useRpc<DPatient>('doctor_patient', id ? { pid: id } : undefined, id ? `c:dp:${id}` : null)
export const useRadar = () => useRpc<RadarRow[]>('retention_radar', undefined, 'c:dradar')
export const useReport = (month: string) => useRpc<Report>('monthly_report', { month }, `c:drep:${month}`)

export const useLeads = () => useTable<Lead[]>('c:dleads', () => supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500))
export const useTemplates = () => useTable<Template[]>('c:dtpl', () => supabase.from('plan_templates').select('*').order('kind').order('kcal', { nullsFirst: false }))
export const useFoods = () => useTable<Food[]>('c:dfoods', () => supabase.from('foods').select('*').order('category').order('name'))
export const useStories = () => useTable<Story[]>('c:dstories', () => supabase.from('stories').select('*, patients(full_name, start_date)').order('requested_at', { ascending: false }))
export const useAppointments = (from: string, to: string) =>
  useTable<DAppt[]>(`c:dappt:${from}`, () => supabase.from('appointments').select('*').gte('starts_at', from).lt('starts_at', to).neq('status', 'cancelled').order('starts_at'))
export const useDrafts = () =>
  useTable<(DPlan & { patient_id: string; patients: { full_name: string; conditions: string[]; doctor_only: boolean; dislikes: string | null; kcal_min: number | null; kcal_max: number | null; start_date: string | null } })[]>(
    'c:ddrafts', () => supabase.from('plans').select('*, patients(full_name, conditions, doctor_only, dislikes, kcal_min, kcal_max, start_date)').eq('status', 'draft').order('created_at'))
export const useSettings = () => useTable<{ key: string; value: Record<string, unknown> }[]>('c:dset', () => supabase.from('app_settings').select('key, value'))
export const useRuns = () => useTable<{ key: string; ran_at: string; items: number }[]>('c:druns', () => supabase.from('automation_runs').select('key, ran_at, items').order('ran_at', { ascending: false }).limit(300))

// ---------- actions ----------
export const reactToCheckin = (id: string, text: string) => supabase.from('checkins').update({ doctor_reaction: text.trim().slice(0, 300) }).eq('id', id)
export async function setAlertStatus(id: string, status: 'seen' | 'resolved') {
  const { data: u } = await supabase.auth.getUser()
  return supabase.from('alerts').update({ status, handled_by: u.user?.id }).eq('id', id)
}
export const addPatient = (p: Record<string, unknown>) => supabase.from('patients').insert(p)
export const updatePatient = (id: string, p: Record<string, unknown>) => supabase.from('patients').update(p).eq('id', id)
export async function savePlan(p: { id?: string; patient_id: string; week_no: number; focus_goal: string | null; doctor_note: string | null; body: DPlanBody; status: 'draft' | 'approved' }) {
  if (p.id) { const { id, ...rest } = p; return supabase.from('plans').update(rest).eq('id', id) }
  return supabase.from('plans').insert(p)
}
export const approvePlans = (ids: string[]) => supabase.from('plans').update({ status: 'approved' }).in('id', ids)
export const rejectPlan = (id: string) => supabase.from('plans').update({ status: 'archived' }).eq('id', id)
export const addNote = (patient_id: string, body: string) => supabase.from('patient_notes').insert({ patient_id, body })
export const deleteNote = (id: string) => supabase.from('patient_notes').delete().eq('id', id)
export async function sendMessage(patient_id: string, body: string | null, voice_path: string | null = null) {
  const { data: u } = await supabase.auth.getUser()
  return supabase.from('messages').insert({ patient_id, body, voice_path, from_doctor: true, sender_id: u.user?.id })
}
export const markThreadRead = (patient_id: string) => supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('patient_id', patient_id).eq('from_doctor', false).is('read_at', null)
export async function uploadVoice(blob: Blob) {
  const { data: u } = await supabase.auth.getUser()
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `${u.user!.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabase.storage.from('voice').upload(path, blob, { contentType: blob.type.split(';')[0] })
  return error ? null : path
}
export const saveLead = (l: Partial<Lead> & { full_name: string }) => (l.id ? supabase.from('leads').update(l).eq('id', l.id) : supabase.from('leads').insert(l))
export const convertLead = (lead: string, email: string, sw: number | null, tw: number | null) => supabase.rpc('convert_lead', { lead, email, start_weight: sw, target_weight: tw })
export const saveAppt = (a: Partial<DAppt> & { name: string; starts_at: string }) => (a.id ? supabase.from('appointments').update(a).eq('id', a.id) : supabase.from('appointments').insert(a))
export const saveTemplate = (t: Partial<Template>) => (t.id ? supabase.from('plan_templates').update(t).eq('id', t.id) : supabase.from('plan_templates').insert(t))
export const saveFood = (f: Partial<Food>) => (f.id ? supabase.from('foods').update(f).eq('id', f.id) : supabase.from('foods').insert(f))
export const deleteFood = (id: string) => supabase.from('foods').delete().eq('id', id)
export const saveStory = (s: Partial<Story>) => (s.id ? supabase.from('stories').update(s).eq('id', s.id) : supabase.from('stories').insert(s))
export const saveSetting = (key: string, value: unknown) => supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() })
export const search = (q: string) => supabase.rpc('doctor_search', { q })
export const draftPlans = () => supabase.functions.invoke('draft-plans', { body: {} })

export function ago(iso: string, t: TFunction<'d'>) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (m < 1) return t('ago.now')
  if (m < 60) return t('ago.m', { n: m })
  if (m < 1440) return t('ago.h', { n: Math.round(m / 60) })
  return t('ago.d', { n: Math.round(m / 1440) })
}

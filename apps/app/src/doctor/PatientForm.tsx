import { useState } from 'react'
import { useToast } from '../components/Toast'
import { addPatient, updatePatient, useTemplates, type DPatient } from '../lib/doctor'
import { todayIST } from '../lib/dates'
import { haptic } from '../lib/feel'
import { Modal, Spinner, useL } from './ui'

const CONDS = [['diabetes', 'Diabetes', 'मधुमेह'], ['thyroid', 'Thyroid', 'थायरॉईड'], ['pcod', 'PCOD', 'PCOD'], ['bp', 'BP', 'BP'], ['pregnancy', 'Pregnancy', 'गर्भावस्था'], ['other', 'Other', 'इतर']] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function PatientForm({ p, onClose, onSaved }: { p?: DPatient['patient']; onClose: () => void; onSaved: (id?: string) => void }) {
  const L = useL()
  const toast = useToast()
  const tpl = useTemplates()
  const [f, setF] = useState({
    full_name: p?.full_name ?? '', email: p?.invite_email ?? '', phone: p?.phone ?? '', city: p?.city ?? '', dob: p?.dob ?? '', gender: p?.gender ?? '',
    height_cm: p?.height_cm?.toString() ?? '', start_weight: p?.start_weight?.toString() ?? '', target_weight: p?.target_weight?.toString() ?? '', start_date: p?.start_date ?? todayIST(),
    program: p?.program ?? '12w', status: p?.status ?? 'active', diet_template_id: p?.diet_template_id ?? '', workout_template_id: p?.workout_template_id ?? '',
    kcal_min: p?.kcal_min?.toString() ?? '', kcal_max: p?.kcal_max?.toString() ?? '', dislikes: p?.dislikes ?? '', on_medication: p?.on_medication ?? false,
  })
  const [conds, setConds] = useState<string[]>(p?.conditions ?? [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const num = (v: string, lo: number, hi: number) => { const n = parseFloat(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null }
  async function save() {
    const email = f.email.trim().toLowerCase()
    if (!f.full_name.trim()) return setErr(L('Name is required.', 'नाव आवश्यक.'))
    if (email && !EMAIL_RE.test(email)) return setErr(L('Email looks wrong.', 'ईमेल चुकीचा वाटतो.'))
    if (!p && !email) return setErr(L('Email is needed so they can log in.', 'लॉगिनसाठी ईमेल हवा.'))
    const phone = f.phone.replace(/[^\d+]/g, '')
    const row = {
      full_name: f.full_name.trim().slice(0, 120), invite_email: email || null, phone: phone ? (phone.length === 10 ? '+91' + phone : phone) : null, city: f.city.trim() || null,
      dob: f.dob || null, gender: f.gender || null, height_cm: num(f.height_cm, 50, 250), start_weight: num(f.start_weight, 20, 300), target_weight: num(f.target_weight, 20, 300),
      start_date: f.start_date || null, program: f.program, status: f.status, conditions: conds, on_medication: f.on_medication,
      diet_template_id: f.diet_template_id || null, workout_template_id: f.workout_template_id || null, kcal_min: num(f.kcal_min, 800, 3500), kcal_max: num(f.kcal_max, 800, 3500), dislikes: f.dislikes.trim() || null,
    }
    setBusy(true); setErr('')
    const { error } = p ? await updatePatient(p.id, row) : await addPatient(row)
    setBusy(false)
    if (error) return setErr(error.code === '23505' ? L('This email is already used by another patient.', 'हा ईमेल आधीच वापरला आहे.') : L('Could not save.', 'सेव्ह झालं नाही.'))
    haptic(20); toast(p ? L('Saved ✓', 'सेव्ह ✓') : L('Patient added ✓ — linked automatically when they log in with this email.', 'पेशंट जोडला ✓ — या ईमेलने लॉगिन करताच जोडले जातील.')); onSaved(); onClose()
  }
  const diets = (tpl.data ?? []).filter((t) => t.kind === 'diet')
  const works = (tpl.data ?? []).filter((t) => t.kind === 'workout')
  return (
    <Modal title={p ? L('Edit patient', 'पेशंट माहिती बदला') : L('New patient', 'नवीन पेशंट')} onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="dlabel md:col-span-2">{L('Full name *', 'पूर्ण नाव *')}<input className="dfield mt-1" value={f.full_name} onChange={set('full_name')} /></label>
        <label className="dlabel">{L('Email (login)', 'ईमेल (लॉगिन)')}{!p && ' *'}<input className="dfield mt-1" type="email" value={f.email} onChange={set('email')} placeholder="name@gmail.com" /></label>
        <label className="dlabel">{L('Mobile', 'मोबाईल')}<input className="dfield mt-1" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
        <label className="dlabel">{L('Area / city', 'भाग / शहर')}<input className="dfield mt-1" value={f.city} onChange={set('city')} placeholder="Rajarampuri" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="dlabel">{L('Date of birth', 'जन्मतारीख')}<input type="date" className="dfield mt-1" value={f.dob} onChange={set('dob')} /></label>
          <label className="dlabel">{L('Gender', 'लिंग')}<select className="dfield mt-1" value={f.gender} onChange={set('gender')}><option value="">—</option><option value="female">{L('Female', 'स्त्री')}</option><option value="male">{L('Male', 'पुरुष')}</option><option value="other">{L('Other', 'इतर')}</option></select></label>
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <label className="dlabel">{L('Height cm', 'उंची cm')}<input className="dfield mt-1" inputMode="decimal" value={f.height_cm} onChange={set('height_cm')} /></label>
          <label className="dlabel">{L('Start kg', 'सुरुवात kg')}<input className="dfield mt-1" inputMode="decimal" value={f.start_weight} onChange={set('start_weight')} /></label>
          <label className="dlabel">{L('Target kg', 'लक्ष्य kg')}<input className="dfield mt-1" inputMode="decimal" value={f.target_weight} onChange={set('target_weight')} /></label>
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <label className="dlabel">{L('Start date', 'सुरुवात')}<input type="date" className="dfield mt-1" value={f.start_date} onChange={set('start_date')} /></label>
          <label className="dlabel">{L('Program', 'प्रोग्राम')}<select className="dfield mt-1" value={f.program} onChange={set('program')}><option value="12w">12-week</option><option value="maintenance">Maintenance</option><option value="challenge7">7-day challenge</option></select></label>
          <label className="dlabel">{L('Status', 'स्थिती')}<select className="dfield mt-1" value={f.status} onChange={set('status')}><option value="active">{L('Active', 'सक्रिय')}</option><option value="paused">{L('Paused', 'थांबवलं')}</option><option value="completed">{L('Completed', 'पूर्ण')}</option><option value="dropped">{L('Dropped', 'सोडलं')}</option></select></label>
        </div>
        <div className="md:col-span-2">
          <p className="dlabel">{L('Conditions', 'आजार')}</p>
          <div className="mt-1 flex flex-wrap gap-2">{CONDS.map(([c, en, mr]) => {
            const on = conds.includes(c)
            return <button key={c} type="button" onClick={() => setConds(on ? conds.filter((x) => x !== c) : [...conds, c])} aria-pressed={on} className={`rounded-full px-3 text-sm font-semibold ${on ? 'bg-coral text-white' : 'bg-sand'}`} style={{ minHeight: 36 }}>{L(en, mr)}</button>
          })}
            <label className="flex items-center gap-2 rounded-full bg-sand px-3 text-sm font-semibold" style={{ minHeight: 36 }}><input type="checkbox" className="h-4 w-4 accent-coral" checked={f.on_medication} onChange={(e) => setF({ ...f, on_medication: e.target.checked })} />{L('On medication', 'औषधं चालू')}</label>
          </div>
          {(conds.length > 0 || f.on_medication) && <p className="mt-1 text-xs text-red">{L('→ Doctor-only: AI will not write this patient’s plan.', '→ फक्त डॉक्टर: AI या पेशंटचा प्लॅन लिहिणार नाही.')}</p>}
        </div>
        <label className="dlabel">{L('Diet template', 'आहार टेम्प्लेट')}<select className="dfield mt-1" value={f.diet_template_id} onChange={set('diet_template_id')}><option value="">—</option>{diets.map((t) => <option key={t.id} value={t.id}>{t.name}{t.kcal ? ` · ${t.kcal}` : ''}</option>)}</select></label>
        <label className="dlabel">{L('Workout template', 'व्यायाम टेम्प्लेट')}<select className="dfield mt-1" value={f.workout_template_id} onChange={set('workout_template_id')}><option value="">—</option>{works.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="dlabel">{L('kcal min', 'kcal किमान')}<input className="dfield mt-1" inputMode="numeric" value={f.kcal_min} onChange={set('kcal_min')} placeholder="1400" /></label>
          <label className="dlabel">{L('kcal max', 'kcal कमाल')}<input className="dfield mt-1" inputMode="numeric" value={f.kcal_max} onChange={set('kcal_max')} placeholder="1600" /></label>
        </div>
        <label className="dlabel">{L('Dislikes / fasting days', 'नावडते पदार्थ / उपवास')}<input className="dfield mt-1" value={f.dislikes} onChange={set('dislikes')} placeholder="वांगी · सोमवार उपवास" /></label>
        {err && <p role="alert" className="rounded-xl bg-redl p-2 text-center font-semibold text-red md:col-span-2">{err}</p>}
        <button onClick={save} disabled={busy} className="dbtn e md:col-span-2 disabled:opacity-60">{busy ? <Spinner /> : p ? L('Save', 'सेव्ह करा') : L('Add patient', 'पेशंट जोडा')}</button>
      </div>
    </Modal>
  )
}

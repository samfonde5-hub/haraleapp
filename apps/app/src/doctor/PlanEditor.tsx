import { useState } from 'react'
import { useToast } from '../components/Toast'
import { savePlan, type DPlan, type DPlanBody } from '../lib/doctor'
import { haptic } from '../lib/feel'
import { Modal, Spinner, useL } from './ui'

const DAYS = [['Mon', 'सोम'], ['Tue', 'मंगळ'], ['Wed', 'बुध'], ['Thu', 'गुरु'], ['Fri', 'शुक्र'], ['Sat', 'शनि'], ['Sun', 'रवि']] as const

const toLines = (meals: { time: string; text: string }[]) => meals.map((m) => (m.time ? `${m.time} - ${m.text}` : m.text)).join('\n')
const fromLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.indexOf(' - ')
  return i > 0 && i < 24 ? { time: l.slice(0, i).trim(), text: l.slice(i + 3).trim().slice(0, 200) } : { time: '', text: l.slice(0, 200) }
})

/** Weekly plan editor: 7 day tabs + focus + note + workout. Save draft or approve. */
export default function PlanEditor({ patientId, plan, nextWeek, onClose, onSaved }: { patientId: string; plan?: DPlan; nextWeek: number; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const init = plan?.body.days?.length ? plan.body.days : DAYS.map(([en]) => ({ label: en, meals: [] as { time: string; text: string }[] }))
  const [days, setDays] = useState(() => DAYS.map(([en], i) => ({ label: init[i]?.label ?? en, text: toLines(init[i]?.meals ?? []) })))
  const [d, setD] = useState(0)
  const [week, setWeek] = useState(plan?.week_no ?? nextWeek)
  const [focus, setFocus] = useState(plan?.focus_goal ?? '')
  const [note, setNote] = useState(plan?.doctor_note ?? '')
  const [workout, setWorkout] = useState(plan?.body.workout ?? '')
  const [busy, setBusy] = useState(false)
  async function save(status: 'draft' | 'approved') {
    setBusy(true)
    const body: DPlanBody = { days: days.map((x) => ({ label: x.label, meals: fromLines(x.text) })).filter((x) => x.meals.length), workout: workout.trim() || undefined }
    const { error } = await savePlan({ id: plan?.id, patient_id: patientId, week_no: week, focus_goal: focus.trim() || null, doctor_note: note.trim() || null, body, status })
    setBusy(false)
    if (error) return toast(error.message.includes('Only the doctor') ? L('Only the doctor can approve plans.', 'फक्त डॉक्टर प्लॅन मंजूर करू शकतात.') : L('Could not save — check week number is unique.', 'सेव्ह झालं नाही — आठवडा क्रमांक तपासा.'), false)
    haptic(20); toast(status === 'approved' ? L('Approved ✓ Patient can see the plan now', 'मंजूर ✓ पेशंटला प्लॅन दिसू लागला') : L('Draft saved ✓', 'मसुदा सेव्ह ✓')); onSaved(); onClose()
  }
  return (
    <Modal title={plan ? L(`Edit plan · Week ${plan.week_no}`, `प्लॅन बदला · आठवडा ${plan.week_no}`) : L('New weekly plan', 'नवीन आठवड्याचा प्लॅन')} onClose={onClose} wide>
      <div className="grid gap-3">
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <label className="dlabel">{L('Week', 'आठवडा')}<input className="dfield mt-1" inputMode="numeric" value={week} onChange={(e) => setWeek(Math.max(1, Math.min(104, parseInt(e.target.value) || 1)))} /></label>
          <label className="dlabel">{L('Focus this week (one goal)', 'या आठवड्याचं एकच लक्ष्य')}<input className="dfield mt-1" value={focus} maxLength={200} onChange={(e) => setFocus(e.target.value)} placeholder={L('Dinner before 8 PM', 'रात्रीचं जेवण 8 च्या आधी')} /></label>
        </div>
        <div>
          <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
            {DAYS.map(([en, mr], i) => (
              <button key={en} role="tab" aria-selected={d === i} onClick={() => setD(i)} className={`shrink-0 rounded-xl px-3 text-sm font-bold ${d === i ? 'bg-emerald text-white' : 'bg-sand'} ${days[i].text.trim() ? '' : 'opacity-70'}`} style={{ minHeight: 38 }}>{L(en, mr)}{days[i].text.trim() ? ' ✓' : ''}</button>
            ))}
          </div>
          <textarea className="dfield mt-2 font-body" rows={6} value={days[d].text} onChange={(e) => setDays(days.map((x, i) => (i === d ? { ...x, text: e.target.value } : x)))}
            placeholder={'8:00 - पोहे + ताक\n1:30 - 2 भाकरी + भाजी + पिठलं\n5:00 - फळ\n7:30 - सूप + उसळ'} />
          <div className="mt-1 flex items-center justify-between text-xs text-mu">
            <span>{L('Each line: time - food', 'प्रत्येक ओळ: वेळ - पदार्थ')}</span>
            {d > 0 && <button onClick={() => setDays(days.map((x, i) => (i === d ? { ...x, text: days[d - 1].text } : x)))} className="font-semibold text-emerald" style={{ minHeight: 30 }}>{L('Copy previous day', 'आधीचा दिवस कॉपी')}</button>}
          </div>
        </div>
        <label className="dlabel">{L('Workout', 'व्यायाम')}<input className="dfield mt-1" value={workout} onChange={(e) => setWorkout(e.target.value)} placeholder="Home 25-min W1 · daily" /></label>
        <label className="dlabel">{L('Note to patient', 'पेशंटसाठी संदेश')}<textarea className="dfield mt-1" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save('draft')} disabled={busy} className="dbtn g flex-1">{L('Save draft', 'मसुदा सेव्ह')}</button>
          <button onClick={() => save('approved')} disabled={busy} className="dbtn e flex-[1.4] disabled:opacity-60">{busy ? <Spinner /> : L('✓ Approve & send', '✓ मंजूर करून पाठवा')}</button>
        </div>
      </div>
    </Modal>
  )
}

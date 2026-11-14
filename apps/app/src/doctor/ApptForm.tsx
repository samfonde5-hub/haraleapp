import { useState } from 'react'
import { useToast } from '../components/Toast'
import { saveAppt, type DAppt } from '../lib/doctor'
import { Modal, Spinner, useL } from './ui'

const istLocal = (iso?: string) => {
  const d = iso ? new Date(iso) : (() => { const x = new Date(); x.setMinutes(0, 0, 0); x.setHours(x.getHours() + 1); return x })()
  const p = new Date(d.getTime() + 5.5 * 3600e3)
  return p.toISOString().slice(0, 16)
}
const fromIstLocal = (s: string) => new Date(s + ':00+05:30').toISOString()

export default function ApptForm({ appt, preset, onClose, onSaved }: { appt?: DAppt; preset?: Partial<DAppt>; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const a = { ...preset, ...appt }
  const [f, setF] = useState({ name: a.name ?? '', phone: a.phone ?? '', when: istLocal(a.starts_at), kind: a.kind ?? 'review', status: a.status ?? 'booked', paid: a.paid ?? false, amount: a.amount?.toString() ?? '', note: a.note ?? '', meet_link: a.meet_link ?? '', duration_min: a.duration_min ?? 30 })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function save() {
    if (!f.name.trim() || !f.when) return setErr(L('Name and time are required.', 'नाव आणि वेळ आवश्यक.'))
    if (f.meet_link && !f.meet_link.startsWith('https://')) return setErr(L('Video link must start with https://', 'व्हिडिओ लिंक https:// ने सुरू हवी'))
    setBusy(true); setErr('')
    const phone = f.phone.replace(/[^\d+]/g, '')
    const { error } = await saveAppt({
      id: appt?.id, name: f.name.trim(), phone: phone ? (phone.length === 10 ? '+91' + phone : phone) : null, starts_at: fromIstLocal(f.when), kind: f.kind, status: f.status,
      paid: f.paid, amount: f.amount ? parseInt(f.amount) : null, note: f.note.trim() || null, meet_link: f.meet_link.trim() || null, duration_min: f.duration_min,
      patient_id: a.patient_id ?? null, lead_id: a.lead_id ?? null,
    })
    setBusy(false)
    if (error) return setErr(L('Could not save.', 'सेव्ह झालं नाही.'))
    toast(L('Appointment saved ✓', 'भेट सेव्ह झाली ✓')); onSaved(); onClose()
  }
  return (
    <Modal title={appt ? L('Edit appointment', 'भेट बदला') : L('Book appointment', 'भेट बुक करा')} onClose={onClose}>
      <div className="grid gap-3">
        <label className="dlabel">{L('Name *', 'नाव *')}<input className="dfield mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="dlabel">{L('Date & time (IST) *', 'तारीख व वेळ *')}<input type="datetime-local" step={1800} className="dfield mt-1" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
          <label className="dlabel">{L('Phone', 'फोन')}<input className="dfield mt-1" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="dlabel">{L('Type', 'प्रकार')}<select className="dfield mt-1" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="first_consult">{L('First consult', 'पहिली भेट')}</option><option value="review">{L('Review', 'रिव्ह्यू')}</option>
            <option value="maintenance">{L('Maintenance', 'मेंटेनन्स')}</option><option value="video">{L('Video call', 'व्हिडिओ कॉल')}</option></select></label>
          <label className="dlabel">{L('Status', 'स्थिती')}<select className="dfield mt-1" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="booked">{L('Booked', 'बुक')}</option><option value="confirmed">{L('Confirmed', 'पक्कं')}</option><option value="done">{L('Done', 'झाली')}</option>
            <option value="no_show">{L('No-show', 'आले नाहीत')}</option><option value="cancelled">{L('Cancelled', 'रद्द')}</option></select></label>
        </div>
        <div className="grid grid-cols-[auto_1fr] items-end gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ minHeight: 44 }}><input type="checkbox" className="h-5 w-5 accent-emerald" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} />{L('Paid', 'पैसे मिळाले')}</label>
          <label className="dlabel">{L('Amount ₹', 'रक्कम ₹')}<input className="dfield mt-1" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} placeholder="499" /></label>
        </div>
        {f.kind === 'video' && <label className="dlabel">{L('Google Meet link', 'Google Meet लिंक')}<input className="dfield mt-1" value={f.meet_link} onChange={(e) => setF({ ...f, meet_link: e.target.value })} placeholder="https://meet.google.com/…" /></label>}
        <label className="dlabel">{L('Note', 'नोंद')}<input className="dfield mt-1" value={f.note} maxLength={500} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        {err && <p role="alert" className="rounded-xl bg-redl p-2 text-center font-semibold text-red">{err}</p>}
        <button onClick={save} disabled={busy} className="dbtn p w-full disabled:opacity-60">{busy ? <Spinner /> : L('Save', 'सेव्ह करा')}</button>
      </div>
    </Modal>
  )
}

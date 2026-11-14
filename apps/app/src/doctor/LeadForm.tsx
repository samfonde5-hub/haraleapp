import { useState } from 'react'
import { useToast } from '../components/Toast'
import { saveLead, type Lead } from '../lib/doctor'
import { Modal, Spinner, useL } from './ui'

export const SOURCES = ['instagram', 'website', 'referral', 'whatsapp', 'ad', 'manual'] as const

export default function LeadForm({ lead, onClose, onSaved }: { lead?: Lead; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const [f, setF] = useState({
    full_name: lead?.full_name ?? '', phone: lead?.phone ?? '', source: lead?.source ?? 'instagram', keyword: lead?.keyword ?? '', goal: lead?.goal ?? '',
    medical: lead?.medical ?? '', tried_before: lead?.tried_before ?? '', can_come: lead?.can_come ?? '', note: lead?.note ?? '', answers_count: lead?.answers_count ?? 0,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  async function save() {
    if (!f.full_name.trim()) return setErr(L('Name is required.', 'नाव आवश्यक आहे.'))
    const phone = f.phone.replace(/[^\d+]/g, '')
    if (phone && phone.replace('+', '').length < 10) return setErr(L('Phone needs 10 digits.', 'फोनला 10 अंक हवेत.'))
    setBusy(true); setErr('')
    const clean = (s: string) => s.trim() || null
    const { error } = await saveLead({
      id: lead?.id, full_name: f.full_name.trim(), phone: phone ? (phone.length === 10 ? '+91' + phone : phone) : null, source: f.source,
      keyword: clean(f.keyword), goal: clean(f.goal), medical: clean(f.medical), tried_before: clean(f.tried_before), can_come: clean(f.can_come), note: clean(f.note),
      answers_count: [f.goal, f.medical, f.tried_before, f.can_come].filter((x) => x.trim()).length,
      ...(lead ? {} : { stage: 'new' as const }),
    })
    setBusy(false)
    if (error) return setErr(L('Could not save. Please try again.', 'सेव्ह झालं नाही. पुन्हा प्रयत्न करा.'))
    toast(L('Lead saved ✓', 'लीड सेव्ह झाला ✓')); onSaved(); onClose()
  }
  return (
    <Modal title={lead ? L('Edit lead', 'लीड बदला') : L('Add lead', 'नवीन लीड')} onClose={onClose}>
      <div className="grid gap-3">
        <label className="dlabel">{L('Name *', 'नाव *')}<input className="dfield mt-1" value={f.full_name} onChange={set('full_name')} autoFocus /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="dlabel">{L('Phone', 'फोन')}<input className="dfield mt-1" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98xxxxxxxx" /></label>
          <label className="dlabel">{L('Source', 'कुठून आला')}<select className="dfield mt-1" value={f.source} onChange={set('source')}>
            {SOURCES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
        </div>
        <label className="dlabel">{L('Instagram keyword (e.g. प्लेट, PCOD)', 'Instagram कीवर्ड (उदा. प्लेट, PCOD)')}<input className="dfield mt-1" value={f.keyword} onChange={set('keyword')} maxLength={40} /></label>
        <p className="mt-1 text-sm font-bold">{L('4 qualifying questions', '4 प्रश्न')}</p>
        <label className="dlabel">1. {L('Goal', 'लक्ष्य')}<input className="dfield mt-1" value={f.goal} onChange={set('goal')} placeholder="−10 kg" /></label>
        <label className="dlabel">2. {L('Medical (thyroid, BP, PCOD…)', 'आजार (थायरॉईड, BP, PCOD…)')}<input className="dfield mt-1" value={f.medical} onChange={set('medical')} /></label>
        <label className="dlabel">3. {L('Tried before', 'आधी काय केलं')}<input className="dfield mt-1" value={f.tried_before} onChange={set('tried_before')} /></label>
        <label className="dlabel">4. {L('When can they come', 'कधी येऊ शकतात')}<input className="dfield mt-1" value={f.can_come} onChange={set('can_come')} /></label>
        <label className="dlabel">{L('Note', 'नोंद')}<textarea className="dfield mt-1" rows={2} value={f.note} onChange={set('note')} /></label>
        {err && <p role="alert" className="rounded-xl bg-redl p-2 text-center font-semibold text-red">{err}</p>}
        <button onClick={save} disabled={busy} className="dbtn p w-full disabled:opacity-60">{busy ? <Spinner /> : L('Save lead', 'लीड सेव्ह करा')}</button>
      </div>
    </Modal>
  )
}

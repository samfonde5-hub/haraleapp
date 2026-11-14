import { useState } from 'react'
import { Skeleton, useToast } from '../components/Toast'
import { approvePlans, draftPlans, rejectPlan, savePlan, useDrafts } from '../lib/doctor'
import { useAuth } from '../lib/auth'
import { haptic } from '../lib/feel'
import PlanEditor from './PlanEditor'
import { Av, Dc, Empty, PageHead, Spinner, useL } from './ui'

const RISK: Record<string, [string, string, string]> = { safe: ['Safe', 'सुरक्षित', 't-em'], review: ['Needs your eye', 'तपासा', 't-amb'], doctor_only: ['Doctor-only', 'फक्त डॉक्टर', 't-red'] }
const COND: Record<string, string> = { diabetes: 'Diabetes', thyroid: 'Thyroid', pcod: 'PCOD', bp: 'BP', pregnancy: 'Pregnancy', other: 'Other' }

export default function DApprovals({ go, onChange }: { go: (h: string) => void; onChange: () => void }) {
  const L = useL()
  const toast = useToast()
  const { profile } = useAuth()
  const q = useDrafts()
  const [filter, setFilter] = useState<'all' | 'safe' | 'review' | 'doctor_only'>('all')
  const [sel, setSel] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [gen, setGen] = useState(false)
  const [approved, setApproved] = useState(0)
  const [note, setNote] = useState<Record<string, string>>({})
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const all = q.data
  const list = all.filter((p) => filter === 'all' || (p.risk_level ?? 'review') === filter)
  const cur = all.find((p) => p.id === sel) ?? list[0]
  const safe = all.filter((p) => p.risk_level === 'safe')
  const isDoctor = profile?.role === 'doctor'

  async function approve(ids: string[]) {
    if (!isDoctor) return toast(L('Only the doctor can approve plans.', 'फक्त डॉक्टर प्लॅन मंजूर करू शकतात.'), false)
    setBusy(ids.length > 1 ? 'all' : ids[0])
    if (ids.length === 1 && cur && note[cur.id] !== undefined && note[cur.id] !== (cur.doctor_note ?? '')) {
      await savePlan({ id: cur.id, patient_id: cur.patient_id, week_no: cur.week_no, focus_goal: cur.focus_goal, doctor_note: note[cur.id] || null, body: cur.body, status: 'draft' })
    }
    const { error } = await approvePlans(ids)
    setBusy(null)
    if (error) return toast(L('Could not approve.', 'मंजूर झालं नाही.'), false)
    haptic(25); setApproved((n) => n + ids.length)
    toast(ids.length > 1 ? L(`${ids.length} safe plans approved & sent ✓`, `${ids.length} सुरक्षित प्लॅन मंजूर ✓`) : L('Approved & sent ✓', 'मंजूर करून पाठवलं ✓'))
    setSel(null); q.reload(); onChange()
  }
  async function reject(id: string) {
    setBusy(id)
    const { error } = await rejectPlan(id)
    setBusy(null)
    toast(error ? L('Failed', 'झालं नाही') : L('Draft rejected', 'मसुदा नाकारला'), !error)
    setSel(null); q.reload(); onChange()
  }
  async function generate() {
    setGen(true)
    const { data, error } = await draftPlans()
    setGen(false)
    if (error) return toast(L('AI drafting failed — try again in a minute.', 'AI मसुदा झाला नाही — थोड्या वेळाने पुन्हा करा.'), false)
    const n = (data as { created?: number })?.created ?? 0
    toast(n ? L(`${n} new drafts ready ✓`, `${n} नवीन मसुदे तयार ✓`) : L('All active patients already have a draft or plan for next week.', 'सर्व पेशंट्सचा पुढच्या आठवड्याचा प्लॅन आधीच आहे.'))
    q.reload(); onChange()
  }

  const nextMonday = (() => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })()
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('AI plan approvals', 'AI प्लॅन मंजुरी')} chip={<span className="tag t-em">✨ AI drafts</span>}
        sub={L('AI drafts next week’s plans from YOUR templates — nothing reaches a patient until you approve', 'AI तुमच्या टेम्प्लेटवरून पुढच्या आठवड्याचे प्लॅन बनवतो — तुम्ही मंजूर केल्याशिवाय पेशंटला काहीच जात नाही')}
        right={<>
          <span className="tag t-gr">{L(`Week of ${nextMonday}`, `${nextMonday} चा आठवडा`)}</span>
          <button onClick={generate} disabled={gen} className="dbtn g">{gen ? <Spinner /> : L('✨ Draft next week', '✨ पुढच्या आठवड्याचे मसुदे')}</button>
          {safe.length > 0 && <button onClick={() => approve(safe.map((p) => p.id))} disabled={busy === 'all'} className="dbtn e">{busy === 'all' ? <Spinner /> : L(`Approve all safe (${safe.length})`, `सर्व सुरक्षित मंजूर (${safe.length})`)}</button>}
        </>} />
      <div className="rise flex flex-wrap items-center gap-2">
        {(['all', 'safe', 'review', 'doctor_only'] as const).map((k) => {
          const n = k === 'all' ? all.length : all.filter((p) => (p.risk_level ?? 'review') === k).length
          return <button key={k} onClick={() => setFilter(k)} className={`tag ${k === 'all' ? 't-gr' : RISK[k][2]} ${filter === k ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>{k === 'all' ? L('All', 'सर्व') : L(RISK[k][0], RISK[k][1])} · {n}</button>
        })}
        <span className="ml-auto text-sm text-mu">{L(`Approved ${approved} / ${approved + all.length} · avg 40 sec per plan`, `मंजूर ${approved} / ${approved + all.length} · सरासरी 40 सेकंद`)}</span>
      </div>

      {all.length === 0 ? <Empty>{L('No drafts waiting. Tap “Draft next week” to let AI prepare plans from your templates.', 'कोणतेही मसुदे नाहीत. “पुढच्या आठवड्याचे मसुदे” दाबा.')}</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Dc className="p-2!">
            <ul>{list.map((p) => {
              const r = RISK[p.risk_level ?? 'review'] ?? RISK.review
              return (
                <li key={p.id}><button onClick={() => setSel(p.id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${cur?.id === p.id ? 'bg-mintl' : 'hover:bg-sand'}`} style={{ minHeight: 56 }}>
                  <Av name={p.patients.full_name} size={36} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.patients.full_name}</span>
                    <span className="block truncate text-xs text-mu">{L(`Week ${p.week_no}`, `आठवडा ${p.week_no}`)}{p.ai_changes?.length ? ` · ${p.ai_changes.length} ${L('changes', 'बदल')}` : p.source === 'ai' ? ` · ${L('no change', 'बदल नाही')}` : ''}</span></span>
                  <span className={`tag ${r[2]}`}>{L(r[0], r[1])}</span>
                </button></li>
              )
            })}</ul>
          </Dc>

          {cur && (
            <Dc key={cur.id} className="min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <button onClick={() => go(`p/${cur.patient_id}`)} className="text-left font-display text-xl font-bold hover:underline" style={{ minHeight: 0 }}>{cur.patients.full_name} · {L(`Week ${cur.week_no} draft`, `आठवडा ${cur.week_no} मसुदा`)}</button>
                  <p className="text-sm text-mu">{[...(cur.patients.conditions ?? []).map((c) => COND[c] ?? c), cur.patients.dislikes ? L(`dislikes ${cur.patients.dislikes}`, `नावडतं: ${cur.patients.dislikes}`) : null, cur.patients.kcal_min ? `Target ~${cur.patients.kcal_min}–${cur.patients.kcal_max ?? cur.patients.kcal_min} kcal` : null].filter(Boolean).join(' · ') || L('No conditions on file', 'आजार नोंद नाही')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditing(true)} className="dbtn g">{L('Edit', 'बदला')}</button>
                  <button onClick={() => reject(cur.id)} disabled={!!busy} className="dbtn g text-red">{L('Reject', 'नाकारा')}</button>
                  <button onClick={() => approve([cur.id])} disabled={!!busy || (cur.risk_level === 'doctor_only' && !cur.body.days?.length)} className="dbtn e disabled:opacity-50">{busy === cur.id ? <Spinner /> : L('✓ Approve & send', '✓ मंजूर करून पाठवा')}</button>
                </div>
              </div>

              {cur.risk_level === 'doctor_only' && !cur.body.days?.length && (
                <p className="mt-3 rounded-xl bg-redl p-3 text-red">{L('This patient has a medical condition or medication. AI does not write their plan — tap Edit to write it yourself.', 'या पेशंटला आजार/औषधं आहेत. AI प्लॅन लिहीत नाही — “बदला” दाबून स्वतः लिहा.')}</p>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {cur.ai_reason && (
                  <div className="rounded-2xl bg-mintl/60 p-4">
                    <p className="mb-1 text-sm font-bold text-emerald">✨ AI · {L('Why these changes', 'हे बदल का')}</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm">{cur.ai_reason.split('\n').filter(Boolean).map((x, i) => <li key={i}>{x.replace(/^[•\-]\s*/, '')}</li>)}</ul>
                  </div>
                )}
                {cur.safety?.length ? (
                  <div className="rounded-2xl bg-sand p-4">
                    <p className="mb-1 text-sm font-bold">{L('Safety checks', 'सुरक्षा तपासणी')}</p>
                    <ul className="space-y-0.5 text-sm">{cur.safety.map((s, i) => <li key={i} className={s.ok ? '' : 'font-semibold text-red'}>{s.ok ? '✓' : '⚠'} {s.label}</li>)}</ul>
                  </div>
                ) : null}
              </div>

              {cur.ai_changes?.length ? (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-bold">{L(`Changes vs Week ${cur.week_no - 1}`, `आठवडा ${cur.week_no - 1} पेक्षा बदल`)}</p>
                  <ul className="space-y-1.5">{cur.ai_changes.map((c, i) => (
                    <li key={i} className="rounded-xl border border-line p-2.5 text-sm">
                      {c.minus && <p className="text-red">− {c.minus}</p>}{c.plus && <p className="text-emerald">+ {c.plus}</p>}{c.why && <p className="mt-0.5 text-xs text-mu">{c.why}</p>}
                    </li>
                  ))}</ul>
                </div>
              ) : null}

              {cur.focus_goal && <p className="mt-3 rounded-xl border-l-4 border-coral bg-[#FFF4EF] p-2.5 text-sm"><b>{L('Focus', 'लक्ष्य')}:</b> {cur.focus_goal}</p>}
              {cur.body.days?.length ? (
                <div className="mt-3 grid gap-1.5">
                  {cur.body.days.map((d) => (
                    <div key={d.label} className="flex gap-3 rounded-xl bg-sand/70 px-3 py-2 text-sm"><b className="w-10 shrink-0">{d.label}</b><span className="min-w-0">{d.meals.map((m) => m.text).join(' · ')}</span></div>
                  ))}
                </div>
              ) : null}

              <label className="dlabel mt-4">{L('Note to patient · AI suggested, editable', 'पेशंटसाठी संदेश · AI सुचवलेला, बदलू शकता')}
                <textarea className="dfield mt-1" rows={2} maxLength={1000} value={note[cur.id] ?? cur.doctor_note ?? ''} onChange={(e) => setNote({ ...note, [cur.id]: e.target.value })} /></label>
            </Dc>
          )}
        </div>
      )}
      {editing && cur && <PlanEditor patientId={cur.patient_id} plan={cur} nextWeek={cur.week_no} onClose={() => setEditing(false)} onSaved={() => { q.reload(); onChange() }} />}
    </div>
  )
}

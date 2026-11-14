import { useState } from 'react'
import { Skeleton } from '../components/Toast'
import { useDoctorPatients } from '../lib/doctor'
import PatientForm from './PatientForm'
import { Av, Dc, Empty, PageHead, useL } from './ui'

const STATUS: Record<string, [string, string, string]> = { active: ['Active', 'सक्रिय', 't-em'], paused: ['Paused', 'थांबवलं', 't-amb'], completed: ['Completed', 'पूर्ण', 't-gr'], dropped: ['Dropped', 'सोडलं', 't-red'] }

export default function DPatients({ go }: { go: (h: string) => void }) {
  const L = useL()
  const q = useDoctorPatients()
  const [s, setS] = useState('')
  const [st, setSt] = useState<string>('active')
  const [adding, setAdding] = useState(false)
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const list = q.data.filter((p) => (st === 'all' || p.status === st) && (!s.trim() || p.full_name.toLowerCase().includes(s.toLowerCase()) || (p.phone ?? '').includes(s) || (p.invite_email ?? '').includes(s.toLowerCase())))
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Patients', 'पेशंट्स')} sub={L(`${q.data.filter((p) => p.status === 'active').length} active · ${q.data.length} total`, `${q.data.filter((p) => p.status === 'active').length} सक्रिय · एकूण ${q.data.length}`)}
        right={<><input className="dfield w-56!" placeholder={L('Search name, phone, email…', 'नाव, फोन, ईमेल शोधा…')} value={s} onChange={(e) => setS(e.target.value)} />
          <button onClick={() => setAdding(true)} className="dbtn p">+ {L('New patient', 'नवीन पेशंट')}</button></>} />
      <div className="rise flex flex-wrap gap-2">
        {(['active', 'paused', 'completed', 'dropped', 'all'] as const).map((k) => (
          <button key={k} onClick={() => setSt(k)} className={`tag ${k === 'all' ? 't-gr' : STATUS[k][2]} ${st === k ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>
            {k === 'all' ? L('All', 'सर्व') : L(STATUS[k][0], STATUS[k][1])} · {k === 'all' ? q.data!.length : q.data!.filter((p) => p.status === k).length}
          </button>
        ))}
      </div>
      {list.length === 0 ? <Empty>{L('No patients here yet.', 'इथे अजून पेशंट नाहीत.')}</Empty> : (
        <Dc className="p-0! overflow-hidden">
          <div className="hidden grid-cols-[1fr_110px_120px_120px_110px] gap-3 border-b border-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-mu lg:grid">
            <span>{L('Patient', 'पेशंट')}</span><span>{L('Week', 'आठवडा')}</span><span>{L('Weight', 'वजन')}</span><span>{L('Last active', 'शेवटचं')}</span><span>{L('App', 'ॲप')}</span>
          </div>
          <ul>{list.map((p, i) => {
            const diff = p.start_weight && p.last_weight ? +(Number(p.last_weight) - Number(p.start_weight)).toFixed(1) : null
            return (
              <li key={p.id} className="rise border-b border-line last:border-0" style={{ '--i': Math.min(i, 10) } as React.CSSProperties}>
                <button onClick={() => go(`p/${p.id}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-sand/50 lg:grid-cols-[1fr_110px_120px_120px_110px] lg:px-5" style={{ minHeight: 64 }}>
                  <span className="flex min-w-0 items-center gap-3"><Av name={p.full_name} />
                    <span className="min-w-0"><span className="flex items-center gap-1.5 truncate font-bold">{p.full_name}{p.unread ? <span className="tag t-co">{p.unread} {L('new', 'नवीन')}</span> : null}{p.is_demo ? <span className="tag t-gr">Demo</span> : null}</span>
                      <span className="flex flex-wrap gap-1 text-xs text-mu">{p.doctor_only && <span className="tag t-red">⚕ {L('Doctor-only', 'फक्त डॉक्टर')}</span>}<span className="lg:hidden">{p.week ? `${L('Week', 'आठवडा')} ${p.week}` : ''}</span></span></span></span>
                  <span className="hidden text-sm lg:block">{p.week ? `${L('Week', 'आठवडा')} ${p.week}` : '—'}</span>
                  <span className={`text-right font-latin font-semibold lg:text-left ${diff === null ? 'text-mu' : diff <= 0 ? 'text-emerald' : 'text-coral'}`}>{diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff} kg`}</span>
                  <span className="hidden text-sm text-mu lg:block">{p.last_active ?? '—'}</span>
                  <span className="hidden lg:block"><span className={`tag ${p.joined ? 't-em' : 't-amb'}`}>{p.joined ? L('On app', 'ॲपवर') : L('Invited', 'आमंत्रित')}</span></span>
                </button>
              </li>
            )
          })}</ul>
        </Dc>
      )}
      {adding && <PatientForm onClose={() => setAdding(false)} onSaved={q.reload} />}
    </div>
  )
}

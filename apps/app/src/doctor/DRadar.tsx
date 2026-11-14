import { Skeleton } from '../components/Toast'
import { useRadar, type RadarRow } from '../lib/doctor'
import { Av, Dc, Empty, Kpi, PageHead, useL, waLink } from './ui'

const MOOD = ['', '😞', '😕', '😐', '🙂', '😄']

export function reasonsOf(p: RadarRow, L: (en: string, mr: string) => string) {
  const r: string[] = []
  if (p.days_quiet >= 99) r.push(L('Never checked in', 'अजून चेक-इन नाही'))
  else if (p.days_quiet >= 2) r.push(L(`No check-in · ${p.days_quiet} days`, `चेक-इन नाही · ${p.days_quiet} दिवस`))
  if (p.mood_recent !== null && p.mood_prev !== null && p.mood_recent < p.mood_prev - 0.7) r.push(L(`Mood dropped ${MOOD[p.last_mood ?? 0] ?? ''}`, `मूड खाली ${MOOD[p.last_mood ?? 0] ?? ''}`))
  else if (p.mood_recent !== null && p.mood_recent <= 2) r.push(L(`Low mood ${MOOD[p.last_mood ?? 0] ?? ''}`, `मूड कमी ${MOOD[p.last_mood ?? 0] ?? ''}`))
  if (p.weight_change_9d !== null && Math.abs(p.weight_change_9d) < 0.2) r.push(L('Weight flat · 9 days', 'वजन स्थिर · 9 दिवस'))
  if (p.ci_prev7 > 0 && p.ci_last7 < p.ci_prev7 * 0.6) r.push(L(`Check-ins ${p.ci_prev7} → ${p.ci_last7} /week`, `चेक-इन ${p.ci_prev7} → ${p.ci_last7} /आठवडा`))
  if (p.unread > 1) r.push(L(`${p.unread} messages unread`, `${p.unread} संदेश न वाचलेले`))
  if (p.no_shows > 0) r.push(L('Missed a review', 'रिव्ह्यू चुकला'))
  return r
}
export function suggestionOf(p: RadarRow, L: (en: string, mr: string) => string) {
  if (p.no_shows > 0) return L('Missed a review — reschedule this week and send a short voice note.', 'रिव्ह्यू चुकला — या आठवड्यात पुन्हा वेळ द्या आणि छोटी व्हॉइस नोट पाठवा.')
  if (p.mood_recent !== null && p.mood_prev !== null && p.mood_recent < p.mood_prev - 0.7) return L('Mood dip — the plan may feel too strict. Personal voice note + offer a 10-min call.', 'मूड खाली — प्लॅन कडक वाटत असेल. व्हॉइस नोट + 10 मिनिटांचा कॉल सुचवा.')
  if (p.weight_change_9d !== null && Math.abs(p.weight_change_9d) < 0.2) return L('Plateau is normal — explain it, and review next week’s plan in AI approvals.', 'वजन थांबणं नॉर्मल आहे — समजावून सांगा, आणि पुढचा प्लॅन तपासा.')
  if (p.days_quiet >= 3) return L('Personal voice note today; if no reply by tomorrow, a quick call.', 'आज व्हॉइस नोट पाठवा; उद्यापर्यंत उत्तर नसेल तर कॉल करा.')
  return L('Short encouraging message keeps the streak going.', 'छोटा प्रोत्साहनाचा संदेश पाठवा.')
}

export default function DRadar({ go }: { go: (h: string) => void }) {
  const L = useL()
  const q = useRadar()
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const rows = q.data
  const high = rows.filter((r) => r.score >= 50)
  const watch = rows.filter((r) => r.score >= 30 && r.score < 50)
  const healthy = rows.length - high.length - watch.length
  const ci = rows.length ? Math.round((rows.reduce((s, r) => s + Math.min(7, r.ci_last7), 0) / (rows.length * 7)) * 100) : 0
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Retention radar', 'रिटेन्शन रडार')} chip={<span className="tag t-em">{L('Risk score', 'धोका स्कोअर')}</span>}
        sub={L('Who might drop out — know before it happens', 'कोण प्रोग्राम सोडू शकतो — आधीच कळेल')} right={<span className="tag t-gr">{L('Live · updates as patients check in', 'लाइव्ह · चेक-इन होताच बदलतो')}</span>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi i={0} tone="co" label={L('High risk', 'जास्त धोका')} value={high.length} sub={<span className="tag t-co">{L('act within 48 hrs', '48 तासांत संपर्क')}</span>} />
        <Kpi i={1} label={L('Watch', 'लक्ष ठेवा')} value={watch.length} sub={<span className="tag t-amb">{L('a gentle nudge helps', 'हलका संदेश पुरेसा')}</span>} />
        <Kpi i={2} label={L('Healthy', 'ठीक')} value={healthy} sub={<span className="tag t-em">{L(`of ${rows.length} active patients`, `${rows.length} सक्रिय पैकी`)}</span>} />
        <Kpi i={3} label={L('Check-in rate · 7 days', 'चेक-इन दर · 7 दिवस')} value={`${ci}%`} sub={<span className="tag t-gr">{L('all active patients', 'सर्व सक्रिय पेशंट्स')}</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          {high.length === 0 ? <Empty>{L('No high-risk patients right now 🎉', 'आत्ता कोणीही जास्त धोक्यात नाही 🎉')}</Empty> : high.map((p, i) => (
            <Dc key={p.id} i={i + 4} className="border-l-4 border-l-red">
              <div className="flex flex-wrap items-center gap-3">
                <Av name={p.full_name} />
                <button onClick={() => go(`p/${p.id}`)} className="min-w-0 text-left" style={{ minHeight: 0 }}>
                  <span className="block font-display text-lg font-bold">{p.full_name}</span>
                  <span className="block text-sm text-mu">{p.week ? L(`Week ${p.week} · 12-week`, `आठवडा ${p.week} · 12 आठवडे`) : L('Not started', 'सुरू नाही')}</span>
                </button>
                <span className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-redl font-latin text-lg font-bold text-red">{p.score}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">{reasonsOf(p, L).map((r) => <span key={r} className="tag t-red">{r}</span>)}</div>
              <p className="mt-3 rounded-xl bg-mintl/60 p-3 text-sm"><b className="text-emerald">{L('Suggested', 'सुचवलेलं')}:</b> {suggestionOf(p, L)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => go(`p/${p.id}/messages`)} className="mini bg-emerald text-white">● {L('Voice note', 'व्हॉइस नोट')}</button>
                <button onClick={() => go('appointments')} className="mini bg-sand">{L('Book call', 'कॉल बुक करा')}</button>
                {waLink(p.phone) && <a href={waLink(p.phone)!} target="_blank" rel="noreferrer" className="mini bg-sand">WhatsApp</a>}
                {p.weight_change_9d !== null && Math.abs(p.weight_change_9d) < 0.2 && <button onClick={() => go('approvals')} className="mini bg-sand">{L('Open draft', 'मसुदा उघडा')}</button>}
              </div>
            </Dc>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Dc i={6}>
            <h2 className="font-display text-[19px] font-bold">{L('How the score works', 'स्कोअर कसा ठरतो')}</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {([['Missed check-ins', 'चुकलेले चेक-इन', 35], ['Mood trend', 'मूडचा कल', 18], ['Weight plateau', 'वजन स्थिर', 15], ['Check-ins dropping', 'चेक-इन कमी होणं', 15], ['Missed reviews', 'चुकलेले रिव्ह्यू', 15], ['Unread messages', 'न वाचलेले संदेश', 10]] as const).map(([en, mr, w]) => (
                <li key={en} className="flex items-center gap-2"><span className="flex-1">{L(en, mr)}</span><div className="h-2 w-20 rounded bg-sand"><div className="h-2 rounded bg-coral" style={{ width: `${(w / 35) * 100}%` }} /></div></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mu">{L('Score is a hint, not a diagnosis. Final call is yours.', 'स्कोअर फक्त संकेत आहे, निदान नाही. अंतिम निर्णय तुमचा.')}</p>
          </Dc>
          <Dc i={7}>
            <h2 className="font-display text-[19px] font-bold">{L('Watch list', 'लक्ष ठेवायची यादी')}</h2>
            {watch.length === 0 ? <p className="mt-2 text-sm text-mu">{L('Nobody on the watch list.', 'यादी रिकामी.')}</p> : (
              <ul className="mt-2">{watch.map((p) => (
                <li key={p.id}><button onClick={() => go(`p/${p.id}`)} className="flex w-full items-center justify-between border-b border-line py-2 text-left text-sm last:border-0" style={{ minHeight: 44 }}>
                  <span>{p.full_name}{p.week ? ` · ${L('Week', 'आठवडा')} ${p.week}` : ''}</span><b className="font-latin text-[#B57414]">{p.score}</b></button></li>
              ))}</ul>
            )}
          </Dc>
        </div>
      </div>
    </div>
  )
}

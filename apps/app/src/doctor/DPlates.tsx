import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { useSignedUrl } from '../lib/patient'
import { reactToCheckin, useDoctorToday, type DCheckin } from '../lib/doctor'
import { haptic } from '../lib/feel'
import { Dc, Empty, PageHead, Spinner, fmtTime, useL } from './ui'

const TAGS = ['balanced', 'rice_extra', 'low_veg', 'fried', 'sweet', 'unclear'] as const
const TONE: Record<string, string> = { balanced: 't-em', rice_extra: 't-amb', low_veg: 't-amb', fried: 't-co', sweet: 't-co', unclear: 't-gr' }

function Tile({ c, on, onClick }: { c: DCheckin; on: boolean; onClick: () => void }) {
  const { t } = useTranslation('p')
  const url = useSignedUrl(c.photo_path)
  const [loaded, setLoaded] = useState(false)
  const first = (c.full_name ?? '').split(' ')
  return (
    <button onClick={onClick} className={`lift relative overflow-hidden rounded-2xl bg-white text-left shadow-sm ${on ? 'ring-[3px] ring-coral' : ''}`} style={{ minHeight: 0 }}>
      <div className={`aspect-square ${loaded ? 'bg-sand' : 'skeleton'}`}>{url && <img src={url} alt="" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? '' : 'opacity-0'}`} />}</div>
      {c.doctor_reaction && <span className="pop absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-sm text-white shadow">✓</span>}
      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{first[0]} {first[1]?.[0] ? first[1][0] + '.' : ''}</p>
        {c.ai_tag ? <span className={`tag ${TONE[c.ai_tag] ?? 't-gr'} mt-1`}>{t(`ai.tags.${c.ai_tag}`).replace(' 👍', '')}</span> : <span className="tag t-gr mt-1">AI…</span>}
      </div>
    </button>
  )
}

function Detail({ c, onDone }: { c: DCheckin; onDone: (id: string, text: string) => void }) {
  const L = useL()
  const { i18n } = useTranslation()
  const { t } = useTranslation('p')
  const url = useSignedUrl(c.photo_path)
  const tip0 = (i18n.language === 'en' ? c.ai_items?.tip_en : c.ai_items?.tip_mr) ?? ''
  const [tip, setTip] = useState(tip0)
  const [busy, setBusy] = useState(false)
  const por = c.ai_items?.portions
  async function send(text: string) {
    if (!text.trim()) return
    setBusy(true)
    await onDone(c.id, text)
    setBusy(false)
  }
  return (
    <Dc className="lg:sticky lg:top-6">
      {url && <img src={url} alt="" className="zoom-in mb-3 aspect-[4/3] w-full rounded-2xl object-cover" />}
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="font-display text-xl font-bold">{c.full_name}</h3>
          <p className="text-sm text-mu">{t(`checkin.${c.meal}`)} · {fmtTime(c.created_at, i18n.language)}</p></div>
        {c.ai_tag && <span className={`tag ${TONE[c.ai_tag]}`}>{t(`ai.tags.${c.ai_tag}`)}</span>}
      </div>
      {c.note && <p className="mt-2 rounded-xl bg-sand p-2 text-sm">“{c.note}”</p>}
      {c.ai_confidence != null && <p className="mt-3 text-sm text-mu">✨ {L('AI estimate · confidence', 'AI अंदाज · खात्री')} <b className="text-ink">{Math.round(c.ai_confidence * 100)}%</b></p>}
      {por && (
        <div className="mt-2 grid gap-1.5">
          {([['grains', L('Rice/roti', 'भात/पोळी'), '#E8A33D'], ['veg', L('Veg', 'भाजी'), '#2BA676'], ['protein', L('Protein', 'प्रथिनं'), '#0F6B4C'], ['dal', L('Dal', 'डाळ'), '#FF7A50']] as const).map(([k, lab, col]) => (
            <div key={k} className="flex items-center gap-2 text-sm"><span className="w-20 shrink-0 text-mu">{lab}</span>
              <div className="h-2 flex-1 rounded bg-sand"><div className="h-2 rounded transition-[width] duration-700" style={{ width: `${por[k] ?? 0}%`, background: col }} /></div>
              <span className="w-10 text-right font-latin text-xs">{por[k] ?? 0}%</span></div>
          ))}
        </div>
      )}
      {c.ai_items?.items?.length ? <p className="mt-2 text-xs text-mu">{c.ai_items.items.join(' · ')}</p> : null}
      {c.doctor_reaction ? <p className="pop mt-4 rounded-xl bg-mintl p-3 font-semibold text-emerald">✓ {c.doctor_reaction}</p> : (
        <>
          <label className="dlabel mt-4">{L('Suggested tip (edit before sending)', 'सुचवलेली टीप (पाठवण्याआधी बदला)')}
            <textarea className="dfield mt-1" rows={3} value={tip} onChange={(e) => setTip(e.target.value)} maxLength={300} /></label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy || !tip.trim()} onClick={() => send(tip)} className="dbtn e flex-1 disabled:opacity-50">{busy ? <Spinner /> : L('Send tip', 'टीप पाठवा')}</button>
            <button disabled={busy} onClick={() => send('छान! 👍')} className="dbtn g flex-1">{L('Send “छान!”', '“छान!” पाठवा')}</button>
          </div>
        </>
      )}
    </Dc>
  )
}

export default function DPlates({ onChange }: { go: (h: string) => void; onChange: () => void }) {
  const L = useL()
  const { t } = useTranslation('p')
  const toast = useToast()
  const q = useDoctorToday()
  const [filter, setFilter] = useState<string>('all')
  const [sel, setSel] = useState<string | null>(null)
  const [local, setLocal] = useState<Record<string, string>>({})
  const [bulk, setBulk] = useState(false)
  const list = useMemo(() => (q.data?.checkins ?? []).map((c) => (local[c.id] ? { ...c, doctor_reaction: local[c.id] } : c)), [q.data, local])
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>

  const count = (k: string) => list.filter((c) => c.ai_tag === k).length
  const shown = list.filter((c) => filter === 'all' || c.ai_tag === filter)
  const balancedTodo = list.filter((c) => c.ai_tag === 'balanced' && !c.doctor_reaction)
  const cur = list.find((c) => c.id === sel) ?? shown.find((c) => !c.doctor_reaction) ?? shown[0]

  async function react(id: string, text: string) {
    haptic(10)
    setLocal((m) => ({ ...m, [id]: text }))
    const { error } = await reactToCheckin(id, text)
    if (error) { setLocal((m) => { const n = { ...m }; delete n[id]; return n }); toast(L('Failed — try again', 'झालं नाही — पुन्हा करा'), false); return }
    toast(L('Sent ✓ Patient sees it in the app', 'पाठवलं ✓ पेशंटला ॲपमध्ये दिसेल'))
    const next = shown.find((c) => c.id !== id && !c.doctor_reaction && !local[c.id])
    if (next) setSel(next.id)
    onChange()
  }
  async function bulkGood() {
    setBulk(true)
    const ids = balancedTodo.map((c) => c.id)
    setLocal((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, 'छान! 👍'])) }))
    const results = await Promise.all(ids.map((id) => reactToCheckin(id, 'छान! 👍')))
    setBulk(false)
    const failed = results.filter((r) => r.error).length
    toast(failed ? L(`${failed} failed`, `${failed} झाले नाहीत`) : L(`“छान!” sent to ${ids.length} plates ✓`, `${ids.length} ताटांना “छान!” पाठवलं ✓`), !failed)
    q.reload(); onChange()
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L("Today's plates", 'आजची ताटं')} chip={<span className="tag t-em">✨ AI tagged</span>}
        sub={L(`${list.length} photos · AI tagged · review all in 2 minutes`, `${list.length} फोटो · AI ने टॅग लावले · 2 मिनिटांत सगळं पाहा`)}
        right={balancedTodo.length > 0 && <button onClick={bulkGood} disabled={bulk} className="dbtn e disabled:opacity-60">{bulk ? <Spinner /> : L(`Send “छान!” to all balanced (${balancedTodo.length})`, `सर्व संतुलित ताटांना “छान!” (${balancedTodo.length})`)}</button>} />
      <div className="rise flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`tag t-gr ${filter === 'all' ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>{L('All', 'सर्व')} {list.length}</button>
        {TAGS.filter((k) => count(k) > 0).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`tag ${TONE[k]} ${filter === k ? 'ring-2 ring-ink/25' : ''}`} style={{ minHeight: 30 }}>{t(`ai.tags.${k}`).replace(' 👍', '')} · {count(k)}</button>
        ))}
      </div>
      {list.length === 0 ? <Empty>{L('No plate photos yet today. They appear here the moment patients send them.', 'आज अजून फोटो नाहीत. पेशंटने पाठवताच इथे दिसतील.')}</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((c) => <Tile key={c.id} c={c} on={cur?.id === c.id} onClick={() => setSel(c.id)} />)}
          </div>
          {cur && <Detail key={cur.id + (cur.doctor_reaction ?? '')} c={cur} onDone={react} />}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSignedUrl } from '../lib/patient'
import { reactToCheckin, ago, type DCheckin } from '../lib/doctor'
import { useToast } from '../components/Toast'
import { haptic } from '../lib/feel'

const TAG_STYLE: Record<string, string> = {
  balanced: 'bg-mint text-emerald', rice_extra: 'bg-gold/30 text-[#7a5600]', low_veg: 'bg-gold/30 text-[#7a5600]',
  fried: 'bg-coral/15 text-coral', sweet: 'bg-coral/15 text-coral', unclear: 'bg-ink/10 text-ink/70',
}

/** Ek thali: photo + AI tag + 1-tap reply. Reply turant dikhta hai (optimistic). */
export default function PlateCard({ c, i = 0, showName = true, onPatient }: { c: DCheckin; i?: number; showName?: boolean; onPatient?: (id: string) => void }) {
  const { t, i18n } = useTranslation('d')
  const { t: tp } = useTranslation('p')
  const toast = useToast()
  const url = useSignedUrl(c.photo_path)
  const [loaded, setLoaded] = useState(false)
  const [reaction, setReaction] = useState(c.doctor_reaction)
  const [text, setText] = useState('')
  const tip = c.ai_items ? (i18n.language === 'en' ? c.ai_items.tip_en : c.ai_items.tip_mr) : null

  async function send(v: string) {
    if (!v.trim()) return
    haptic(10)
    const prev = reaction
    setReaction(v); setText('')
    const { error } = await reactToCheckin(c.id, v)
    if (error) { setReaction(prev); toast(t('fail'), false) } else toast(`${t('plates.replied')} ✓`)
  }

  return (
    <li className="rise overflow-hidden rounded-3xl bg-white shadow-sm" style={{ '--i': i } as React.CSSProperties}>
      <div className={`relative aspect-[4/3] ${loaded ? 'bg-ink/5' : 'skeleton'}`}>
        {url && <img src={url} alt="" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
        {c.ai_tag && <span className={`pop absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-bold shadow ${TAG_STYLE[c.ai_tag] ?? TAG_STYLE.unclear}`}>✨ {tp(`ai.tags.${c.ai_tag}`)}</span>}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          {showName && c.full_name ? (
            <button onClick={() => c.patient_id && onPatient?.(c.patient_id)} className="min-h-0 truncate text-left font-display text-lg font-bold text-ink underline-offset-4 hover:underline" style={{ minHeight: 0 }}>{c.full_name}</button>
          ) : <span />}
          <span className="shrink-0 text-sm text-ink/60">{tp(`checkin.${c.meal}`)} · {ago(c.created_at, t)}</span>
        </div>
        {c.note && <p className="mt-1 text-ink/80">“{c.note}”</p>}
        {tip && <p className="mt-1 text-sm text-ink/60">AI: {tip}</p>}
        {c.ai_items?.items?.length ? <p className="mt-1 text-xs text-ink/50">{c.ai_items.items.join(' · ')}</p> : null}
        {reaction ? (
          <p className="pop mt-3 rounded-2xl bg-mint/50 px-3 py-2 font-semibold text-emerald">✓ {reaction}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {(t('plates.quick', { returnObjects: true }) as string[]).map((q) => (
                <button key={q} onClick={() => send(q)} className="min-h-10 rounded-full bg-paper px-3 text-sm font-semibold text-ink" style={{ minHeight: 40 }}>{q}</button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('plates.reply')} onKeyDown={(e) => e.key === 'Enter' && send(text)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-ink/10 px-3 outline-none focus:border-emerald" />
              <button onClick={() => send(text)} disabled={!text.trim()} className="min-h-11 rounded-xl bg-emerald px-4 font-bold text-white disabled:opacity-40" style={{ minHeight: 44 }}>{t('plates.send')}</button>
            </div>
          </>
        )}
      </div>
    </li>
  )
}

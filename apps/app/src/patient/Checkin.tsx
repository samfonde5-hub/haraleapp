import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { SuccessCheck, useToast } from '../components/Toast'
import { compressImage } from '../lib/image'
import { analyzePlate, queueCheckin, uploadCheckin } from '../lib/offline'
import { useAuth } from '../lib/auth'
import { haptic } from '../lib/feel'
import { useSignedUrl, type Checkin as CheckinRow, type usePatientData } from '../lib/patient'
import { partOfDay, todayIST } from '../lib/dates'
import emptyImg from '../assets/banners/checkin-empty.webp'

type Data = ReturnType<typeof usePatientData>
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

const TAG_STYLE: Record<string, string> = {
  balanced: 'bg-mint text-emerald', rice_extra: 'bg-gold/30 text-[#7a5600]', low_veg: 'bg-gold/30 text-[#7a5600]',
  fried: 'bg-coral/15 text-coral', sweet: 'bg-coral/15 text-coral', unclear: 'bg-ink/10 text-ink/70',
}

function Thumb({ c, i }: { c: CheckinRow; i: number }) {
  const { t, i18n } = useTranslation('p')
  const { consents } = useAuth()
  const signed = useSignedUrl(c.localUrl ? null : c.photo_path)
  const url = c.localUrl ?? signed
  const [loaded, setLoaded] = useState(false)
  const fresh = Date.now() - Date.parse(c.created_at) < 3 * 60_000
  const analyzing = !c.ai_tag && !!consents.ai_drafts && (!!c.localUrl || fresh)
  const tip = c.ai_items ? (i18n.language === 'en' ? c.ai_items.tip_en : c.ai_items.tip_mr) : null
  return (
    <li className="pop col-span-2 overflow-hidden rounded-2xl bg-paper sm:col-span-1" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="flex gap-3">
        <div className={`aspect-square w-28 shrink-0 overflow-hidden rounded-2xl ${loaded ? 'bg-ink/5' : 'skeleton'}`}>
          {url && <img src={url} alt="" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
        </div>
        <div className="min-w-0 flex-1 py-2 pr-3">
          <p className="text-sm font-bold">{t(`checkin.${c.meal}`)}</p>
          {analyzing && (
            <p className="mt-1 flex items-center gap-2 text-sm text-emerald">
              <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald/60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald" /></span>
              {t('ai.checking')}
            </p>
          )}
          {c.ai_tag && (
            <div className="rise">
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${TAG_STYLE[c.ai_tag] ?? TAG_STYLE.unclear}`}>✨ {t(`ai.tags.${c.ai_tag}`)}</span>
              {tip && <p className="mt-1 text-sm leading-snug text-ink/80">{tip}</p>}
            </div>
          )}
          {c.doctor_reaction && <p className="mt-1 text-sm font-semibold text-emerald">{t('checkin.reaction')} {c.doctor_reaction}</p>}
        </div>
      </div>
    </li>
  )
}

export default function Checkin({ data, uid }: { data: Data; uid: string }) {
  const { t } = useTranslation('p')
  const toast = useToast()
  const { patient, todayCheckins, todayLog } = data
  const pod = partOfDay()
  const [meal, setMeal] = useState<(typeof MEALS)[number]>(pod === 'morning' ? 'breakfast' : pod === 'afternoon' ? 'lunch' : 'dinner')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [w, setW] = useState(todayLog?.weight_kg?.toString() ?? '')
  const [water, setWater] = useState(todayLog?.water_glasses ?? 0)
  const [steps, setSteps] = useState(todayLog?.steps?.toString() ?? '')
  const [mood, setMood] = useState<number | null>(todayLog?.mood ?? null)
  const [savingVitals, setSavingVitals] = useState(false)

  useEffect(() => { if (success) { const id = setTimeout(() => setSuccess(false), 1800); return () => clearTimeout(id) } }, [success])

  async function onFile(f: File | undefined) {
    if (!f) return
    setPreview(URL.createObjectURL(f)) // turant dikhao, compress background me
    const b = await compressImage(f)
    setBlob(b)
  }

  function send() {
    if (!patient || !blob || !preview) return
    const p = { id: crypto.randomUUID(), uid, patientId: patient.id, meal, note: note.trim(), logDate: todayIST(), blob }
    // OPTIMISTIC: list me turant dikhao + success animation. Upload chupchaap peeche.
    data.addLocalCheckin({ id: p.id, log_date: p.logDate, meal, photo_path: null, note: p.note || null, doctor_reaction: null, created_at: new Date().toISOString(), localUrl: preview })
    setSuccess(true)
    haptic(20)
    setBlob(null); setPreview(null); setNote('')
    ;(async () => {
      try {
        if (!navigator.onLine) throw new Error('offline')
        await uploadCheckin(p)
        toast(t('checkin.saved'))
        await data.reload() // server row aa gaya → "AI तपासत आहे…" dikhega
        await analyzePlate(p.id)
        data.reload() // AI tag + tip aa gaye
      } catch (e) {
        if (!navigator.onLine || (e as Error).message === 'offline') { await queueCheckin(p); toast(t('checkin.queued')) }
        else { toast(t('checkin.fail'), false); data.reload() }
      }
    })()
  }

  async function saveVitals() {
    if (!patient) return
    const wn = parseFloat(w)
    const sn = parseInt(steps, 10)
    setSavingVitals(true)
    const { error } = await data.patchLog({
      weight_kg: Number.isFinite(wn) && wn >= 20 && wn <= 300 ? wn : null,
      water_glasses: water,
      steps: Number.isFinite(sn) && sn >= 0 ? sn : null,
      mood,
    })
    setSavingVitals(false)
    toast(error ? t('checkin.fail') : t('checkin.vitals_saved'), !error)
  }

  if (!patient) return <PhotoBanner src={emptyImg} tall><h1 className="font-display text-2xl font-extrabold">{t('pending.title')}</h1></PhotoBanner>

  const input = 'mt-1 min-h-12 w-full rounded-xl border-2 border-ink/10 bg-white px-3 text-lg outline-none transition-colors focus:border-emerald focus:bg-mint/10'
  return (
    <div className="flex flex-col gap-4">
      {success ? (
        <section className="fade-in flex h-64 flex-col items-center justify-center gap-3 rounded-3xl bg-mint/40 text-center">
          <SuccessCheck />
          <p className="rise font-display text-xl font-bold text-emerald" style={{ animationDelay: '250ms' }}>{t('checkin.saved')}</p>
        </section>
      ) : preview ? (
        <section className="zoom-in overflow-hidden rounded-3xl shadow-lg"><img src={preview} alt="" className="aspect-[4/3] w-full object-cover" /></section>
      ) : (
        <PhotoBanner src={emptyImg} tall>
          <h1 className="slide-l font-display text-3xl font-extrabold">{t('checkin.title')}</h1>
          <p className="slide-l text-white/90" style={{ animationDelay: '80ms' }}>{t('checkin.sub')}</p>
        </PhotoBanner>
      )}

      <Card i={1}>
        <p className="font-display text-lg font-bold">{t('checkin.meal')}</p>
        <div className="relative mt-2 grid grid-cols-4 gap-2" role="radiogroup">
          {MEALS.map((m) => (
            <button key={m} role="radio" aria-checked={meal === m} onClick={() => { haptic(6); setMeal(m) }}
              className={`min-h-12 rounded-xl text-base font-semibold ${meal === m ? 'bg-emerald text-white shadow-md shadow-emerald/30' : 'bg-paper text-ink'}`}>{t(`checkin.${m}`)}</button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()} className="mt-4 min-h-14 w-full rounded-2xl border-2 border-dashed border-emerald/50 bg-mint/10 text-lg font-bold text-emerald">
          {preview ? t('checkin.retake') : t('checkin.take')}
        </button>
        {preview && (
          <div className="rise">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('checkin.note')} className={`mt-3 ${input}`} />
            <button onClick={send} disabled={!blob} className="mt-3 min-h-14 w-full rounded-2xl bg-coral text-lg font-bold text-white shadow-lg shadow-coral/30 disabled:opacity-60">
              {blob ? t('checkin.save') : '…'}
            </button>
          </div>
        )}
      </Card>

      <Card i={2}>
        <h2 className="font-display text-xl font-bold">{t('checkin.vitals')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">{t('checkin.weight')}
            <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className={input} />
          </label>
          <label className="text-sm font-semibold">{t('checkin.steps')}
            <input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} className={input} />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">{t('checkin.water')}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => { haptic(6); setWater(Math.max(0, water - 1)) }} className="h-11 w-11 rounded-full bg-paper text-2xl font-bold" aria-label="-1">−</button>
            <b key={water} className="bump w-8 text-center text-xl">{water}</b>
            <button onClick={() => { haptic(6); setWater(Math.min(30, water + 1)) }} className="h-11 w-11 rounded-full bg-emerald text-2xl font-bold text-white" aria-label="+1">+</button>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold">{t('checkin.mood')}</p>
        <div className="mt-1 flex justify-between">
          {(t('mood', { returnObjects: true }) as string[]).map((e, k) => (
            <button key={k} onClick={() => { haptic(6); setMood(k + 1) }} aria-pressed={mood === k + 1}
              className={`h-12 w-12 rounded-full text-2xl transition-transform duration-300 [transition-timing-function:var(--ease-spring)] ${mood === k + 1 ? 'scale-125 bg-gold/40 ring-2 ring-gold' : 'bg-paper grayscale-[40%]'}`}>{e}</button>
          ))}
        </div>
        <button onClick={saveVitals} disabled={savingVitals} className="mt-4 min-h-14 w-full rounded-2xl bg-emerald text-lg font-bold text-white shadow-md shadow-emerald/30 disabled:opacity-70">
          {savingVitals ? <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" /> : t('checkin.save_vitals')}
        </button>
      </Card>

      <Card i={3}>
        <h2 className="font-display text-xl font-bold">{t('checkin.today')}</h2>
        {todayCheckins.length === 0 ? <p className="mt-2 text-ink/60">{t('checkin.none')}</p> : (
          <>
            <ul className="mt-3 grid grid-cols-2 gap-3">{todayCheckins.map((c, i) => <Thumb key={c.id} c={c} i={i} />)}</ul>
            {todayCheckins.some((c) => c.ai_tag) && <p className="mt-3 text-xs text-ink/50">{t('ai.note')}</p>}
          </>
        )}
      </Card>
    </div>
  )
}

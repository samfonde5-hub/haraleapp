import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { SuccessCheck, useToast } from '../components/Toast'
import { compressImage } from '../lib/image'
import { queueCheckin, uploadCheckin } from '../lib/offline'
import { haptic } from '../lib/feel'
import { useSignedUrl, type Checkin as CheckinRow, type usePatientData } from '../lib/patient'
import { partOfDay, todayIST } from '../lib/dates'
import emptyImg from '../assets/banners/checkin-empty.webp'

type Data = ReturnType<typeof usePatientData>
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function Thumb({ c, i }: { c: CheckinRow; i: number }) {
  const { t } = useTranslation('p')
  const signed = useSignedUrl(c.localUrl ? null : c.photo_path)
  const url = c.localUrl ?? signed
  const [loaded, setLoaded] = useState(false)
  return (
    <li className="pop overflow-hidden rounded-2xl bg-paper" style={{ animationDelay: `${i * 60}ms` }}>
      <div className={`aspect-square ${loaded ? 'bg-ink/5' : 'skeleton'}`}>
        {url && <img src={url} alt="" onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
      </div>
      <p className="px-3 pt-2 text-sm font-bold">{t(`checkin.${c.meal}`)} {c.localUrl && <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-gold align-middle" aria-label="uploading" />}</p>
      {c.doctor_reaction ? <p className="px-3 pb-2 text-sm text-emerald">{t('checkin.reaction')} {c.doctor_reaction}</p> : <div className="pb-2" />}
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
        data.reload()
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
          <ul className="mt-3 grid grid-cols-2 gap-3">{todayCheckins.map((c, i) => <Thumb key={c.id} c={c} i={i} />)}</ul>
        )}
      </Card>
    </div>
  )
}

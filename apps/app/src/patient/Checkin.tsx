import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { compressImage } from '../lib/image'
import { queueCheckin, uploadCheckin } from '../lib/offline'
import { saveLog, useSignedUrl, type Checkin as CheckinRow, type usePatientData } from '../lib/patient'
import { partOfDay, todayIST } from '../lib/dates'
import emptyImg from '../assets/banners/checkin-empty.webp'

type Data = ReturnType<typeof usePatientData>
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function Thumb({ c }: { c: CheckinRow }) {
  const { t } = useTranslation('p')
  const url = useSignedUrl(c.photo_path)
  return (
    <li className="overflow-hidden rounded-2xl bg-paper">
      <div className="aspect-square bg-ink/5">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
      <p className="px-3 pt-2 text-sm font-bold">{t(`checkin.${c.meal}`)}</p>
      {c.doctor_reaction && <p className="px-3 pb-2 text-sm text-emerald">{t('checkin.reaction')} {c.doctor_reaction}</p>}
    </li>
  )
}

export default function Checkin({ data, uid }: { data: Data; uid: string }) {
  const { t } = useTranslation('p')
  const { patient, todayCheckins, todayLog } = data
  const pod = partOfDay()
  const [meal, setMeal] = useState<(typeof MEALS)[number]>(pod === 'morning' ? 'breakfast' : pod === 'afternoon' ? 'lunch' : 'dinner')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [w, setW] = useState(todayLog?.weight_kg?.toString() ?? '')
  const [water, setWater] = useState(todayLog?.water_glasses ?? 0)
  const [steps, setSteps] = useState(todayLog?.steps?.toString() ?? '')
  const [mood, setMood] = useState<number | null>(todayLog?.mood ?? null)

  async function onFile(f: File | undefined) {
    if (!f) return
    setMsg(null)
    const b = await compressImage(f)
    setBlob(b)
    setPreview(URL.createObjectURL(b))
  }

  async function send() {
    if (!patient || !blob) return
    setBusy(true)
    const p = { id: crypto.randomUUID(), uid, patientId: patient.id, meal, note: note.trim(), logDate: todayIST(), blob }
    try {
      if (!navigator.onLine) throw new Error('offline')
      await uploadCheckin(p)
      setMsg({ ok: true, text: t('checkin.saved') })
    } catch (e) {
      if (!navigator.onLine || (e as Error).message === 'offline') {
        await queueCheckin(p)
        setMsg({ ok: true, text: t('checkin.queued') })
      } else setMsg({ ok: false, text: t('checkin.fail') })
    }
    setBusy(false)
    setBlob(null)
    setPreview(null)
    setNote('')
    data.reload()
  }

  async function saveVitals() {
    if (!patient) return
    const wn = parseFloat(w)
    const sn = parseInt(steps, 10)
    const { error } = await saveLog(patient.id, {
      weight_kg: Number.isFinite(wn) && wn >= 20 && wn <= 300 ? wn : null,
      water_glasses: water,
      steps: Number.isFinite(sn) && sn >= 0 ? sn : null,
      mood,
    })
    setMsg(error ? { ok: false, text: t('checkin.fail') } : { ok: true, text: t('checkin.vitals_saved') })
    data.reload()
  }

  if (!patient) return <PhotoBanner src={emptyImg} tall><h1 className="font-display text-2xl font-extrabold">{t('pending.title')}</h1></PhotoBanner>

  return (
    <div className="flex flex-col gap-4">
      {preview ? (
        <section className="overflow-hidden rounded-3xl shadow-lg"><img src={preview} alt="" className="aspect-[4/3] w-full object-cover" /></section>
      ) : (
        <PhotoBanner src={emptyImg} tall>
          <h1 className="font-display text-3xl font-extrabold">{t('checkin.title')}</h1>
          <p className="text-white/90">{t('checkin.sub')}</p>
        </PhotoBanner>
      )}

      <Card>
        <p className="font-display text-lg font-bold">{t('checkin.meal')}</p>
        <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup">
          {MEALS.map((m) => (
            <button key={m} role="radio" aria-checked={meal === m} onClick={() => setMeal(m)}
              className={`min-h-12 rounded-xl text-base font-semibold ${meal === m ? 'bg-emerald text-white' : 'bg-paper text-ink'}`}>{t(`checkin.${m}`)}</button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} className="mt-4 min-h-14 w-full rounded-2xl border-2 border-dashed border-emerald/50 text-lg font-bold text-emerald">
          {preview ? t('checkin.retake') : t('checkin.take')}
        </button>
        {preview && (
          <>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('checkin.note')}
              className="mt-3 min-h-12 w-full rounded-xl border-2 border-ink/10 px-3 text-lg outline-none focus:border-emerald" />
            <button onClick={send} disabled={busy} className="mt-3 min-h-14 w-full rounded-2xl bg-coral text-lg font-bold text-white shadow disabled:opacity-60">{busy ? '…' : t('checkin.save')}</button>
          </>
        )}
      </Card>

      {msg && <p role="status" className={`rounded-2xl p-3 text-center font-semibold ${msg.ok ? 'bg-mint/50 text-emerald' : 'bg-coral/10 text-coral'}`}>{msg.text}</p>}

      <Card>
        <h2 className="font-display text-xl font-bold">{t('checkin.vitals')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">{t('checkin.weight')}
            <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border-2 border-ink/10 px-3 text-lg outline-none focus:border-emerald" />
          </label>
          <label className="text-sm font-semibold">{t('checkin.steps')}
            <input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border-2 border-ink/10 px-3 text-lg outline-none focus:border-emerald" />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">{t('checkin.water')}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setWater(Math.max(0, water - 1))} className="h-11 w-11 rounded-full bg-paper text-2xl font-bold" aria-label="-1">−</button>
            <b className="w-8 text-center text-xl">{water}</b>
            <button onClick={() => setWater(Math.min(30, water + 1))} className="h-11 w-11 rounded-full bg-emerald text-2xl font-bold text-white" aria-label="+1">+</button>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold">{t('checkin.mood')}</p>
        <div className="mt-1 flex justify-between">
          {(t('mood', { returnObjects: true }) as string[]).map((e, k) => (
            <button key={k} onClick={() => setMood(k + 1)} aria-pressed={mood === k + 1}
              className={`h-12 w-12 rounded-full text-2xl ${mood === k + 1 ? 'bg-gold/40 ring-2 ring-gold' : 'bg-paper'}`}>{e}</button>
          ))}
        </div>
        <button onClick={saveVitals} className="mt-4 min-h-14 w-full rounded-2xl bg-emerald text-lg font-bold text-white">{t('checkin.save_vitals')}</button>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold">{t('checkin.today')}</h2>
        {todayCheckins.length === 0 ? <p className="mt-2 text-ink/60">{t('checkin.none')}</p> : (
          <ul className="mt-3 grid grid-cols-2 gap-3">{todayCheckins.map((c) => <Thumb key={c.id} c={c} />)}</ul>
        )}
      </Card>
    </div>
  )
}

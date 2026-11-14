import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoctorArch } from '../components/Visual'
import checkinImg from '../assets/banners/onboard-checkin.webp'
import progressImg from '../assets/banners/onboard-progress.webp'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('p')
  const [i, setI] = useState(0)
  const slides = [
    { visual: <div className="flex h-full items-end justify-center bg-gradient-to-b from-mint/60 to-paper pb-6"><DoctorArch size="lg" /></div>, title: t('onboard.s1t'), body: t('onboard.s1b') },
    { visual: <img src={checkinImg} alt="" className="h-full w-full object-cover" />, title: t('onboard.s2t'), body: t('onboard.s2b') },
    { visual: <img src={progressImg} alt="" className="h-full w-full object-cover" />, title: t('onboard.s3t'), body: t('onboard.s3b') },
  ]
  const s = slides[i]
  const last = i === slides.length - 1
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-paper">
      <div className="relative h-[52dvh] overflow-hidden rounded-b-[2.5rem] shadow-md">{s.visual}</div>
      <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
        <div className="flex gap-2" aria-hidden>
          {slides.map((_, k) => <span key={k} className={`h-2 rounded-full transition-all ${k === i ? 'w-8 bg-emerald' : 'w-2 bg-ink/20'}`} />)}
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink">{s.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink/75">{s.body}</p>
        <div className="mt-auto flex items-center justify-between pt-8">
          <button onClick={onDone} className="px-2 text-ink/60">{t('onboard.skip')}</button>
          <button onClick={() => (last ? onDone() : setI(i + 1))} className="min-h-14 rounded-2xl bg-coral px-8 text-lg font-bold text-white shadow">
            {last ? t('onboard.start') : t('onboard.next')}
          </button>
        </div>
      </div>
    </main>
  )
}

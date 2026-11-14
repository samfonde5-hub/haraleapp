import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoctorArch } from '../components/Visual'
import { haptic } from '../lib/feel'
import checkinImg from '../assets/banners/onboard-checkin.webp'
import progressImg from '../assets/banners/onboard-progress.webp'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('p')
  const [i, setI] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const startX = useRef<number | null>(null)
  const slides = [
    { visual: <div className="flex h-full items-end justify-center bg-gradient-to-b from-mint/60 to-paper pb-6"><div className="pop"><DoctorArch size="lg" /></div></div>, title: t('onboard.s1t'), body: t('onboard.s1b') },
    { visual: <img src={checkinImg} alt="" className="zoom-in h-full w-full object-cover" />, title: t('onboard.s2t'), body: t('onboard.s2b') },
    { visual: <img src={progressImg} alt="" className="zoom-in h-full w-full object-cover" />, title: t('onboard.s3t'), body: t('onboard.s3b') },
  ]
  const s = slides[i]
  const last = i === slides.length - 1
  const goTo = (n: number) => { if (n < 0 || n >= slides.length) return; haptic(8); setDir(n > i ? 1 : -1); setI(n) }
  const anim = dir === 1 ? 'slide-l' : 'slide-r'

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-paper"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (startX.current === null) return
        const dx = e.changedTouches[0].clientX - startX.current
        startX.current = null
        if (dx < -50) goTo(i + 1)
        else if (dx > 50) goTo(i - 1)
      }}>
      <div key={`v${i}`} className={`${anim} relative h-[52dvh] overflow-hidden rounded-b-[2.5rem] shadow-md`}>{s.visual}</div>
      <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
        <div className="flex gap-2" aria-hidden>
          {slides.map((_, k) => <span key={k} className={`h-2 rounded-full transition-all duration-500 [transition-timing-function:var(--ease-out)] ${k === i ? 'w-8 bg-emerald' : 'w-2 bg-ink/20'}`} />)}
        </div>
        <div key={`t${i}`}>
          <h1 className={`${anim} mt-5 font-display text-3xl font-extrabold leading-tight text-ink`} style={{ animationDelay: '60ms' }}>{s.title}</h1>
          <p className={`${anim} mt-3 text-lg leading-relaxed text-ink/75`} style={{ animationDelay: '120ms' }}>{s.body}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-8">
          <button onClick={onDone} className="px-2 text-ink/60">{t('onboard.skip')}</button>
          <button onClick={() => (last ? onDone() : goTo(i + 1))} className="min-h-14 rounded-2xl bg-coral px-8 text-lg font-bold text-white shadow-lg shadow-coral/30">
            {last ? t('onboard.start') : t('onboard.next')} →
          </button>
        </div>
      </div>
    </main>
  )
}

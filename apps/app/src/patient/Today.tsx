import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoBanner, DoctorArch, Card } from '../components/Visual'
import { useToast } from '../components/Toast'
import { daysBetween, partOfDay, todayIST } from '../lib/dates'
import { haptic } from '../lib/feel'
import type { usePatientData } from '../lib/patient'
import Safety from './Safety'
import { JourneyCard, NextStep, WhatNext } from './Journey'
import morning from '../assets/banners/today-morning.webp'
import lunch from '../assets/banners/today-lunch.webp'
import evening from '../assets/banners/today-evening.webp'

type Data = ReturnType<typeof usePatientData>

export default function Today({ data, go, name }: { data: Data; go: (tab: string) => void; name: string }) {
  const { t } = useTranslation('p')
  const toast = useToast()
  const pod = partOfDay()
  const banner = pod === 'morning' ? morning : pod === 'afternoon' ? lunch : evening
  const { patient, todayCheckins, todayLog, streak, plan } = data
  const day = patient?.start_date ? Math.max(1, daysBetween(patient.start_date, todayIST()) + 1) : null
  const done = (m: string) => todayCheckins.some((c) => c.meal === m)
  const water = todayLog?.water_glasses ?? 0
  const [bump, setBump] = useState(0)
  const doneCount = (['breakfast', 'lunch', 'dinner'] as const).filter(done).length + (water >= 8 ? 1 : 0) + (todayLog?.weight_kg ? 1 : 0)

  function addWater() {
    if (!patient || water >= 30) return
    haptic(10)
    setBump((b) => b + 1) // instant animation — server ka wait nahi
    data.patchLog({ water_glasses: water + 1 }).then((r) => { if (r.error) toast(t('checkin.fail'), false) })
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={banner} tall>
        <p className="slide-l text-mint">{t(`greet.${pod}`)}{name ? `, ${name}` : ''} 🙏</p>
        <h1 className="slide-l font-display text-3xl font-extrabold leading-tight" style={{ animationDelay: '80ms' }}>
          {day ? t('day_of', { day, week: Math.ceil(day / 7) }) : t('pending.title')}
        </h1>
        <p className="pop mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold" style={{ animationDelay: '200ms' }}>
          {streak > 0 ? <>{t('streak', { n: streak }).replace('🔥', '').trim()}<span className="flame">🔥</span></> : t('streak_zero')}
        </p>
      </PhotoBanner>

      {!patient && <WhatNext />}
      {patient && <NextStep data={data} go={go} />}
      {patient && day && <JourneyCard week={Math.ceil(day / 7)} focus={plan?.focus_goal} />}

      <Card i={1}>
        <div className="flex items-center gap-4">
          <DoctorArch size="sm" />
          <div className="min-w-0">
            <p className="font-latin text-xs uppercase tracking-widest text-coral">{t('doctor_card.title')}</p>
            <p className="font-display text-lg font-bold">{t('doctor_card.name')}</p>
          </div>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-ink/85">{plan?.doctor_note || t('doctor_card.empty')}</p>
        {patient && (
          <button onClick={() => go('msgs')} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-mint/50 text-lg font-bold text-emerald">
            💬 {t('msgs.open')}{data.unread ? <span className="pop rounded-full bg-coral px-2 text-sm text-white">{data.unread} {t('msgs.new')}</span> : null}
          </button>
        )}
      </Card>

      {data.next_appt && (
        <Card i={2} className="border-l-8 border-gold">
          <p className="font-latin text-xs uppercase tracking-widest text-coral">{t('appt.title')}</p>
          <p className="mt-1 font-display text-xl font-bold">{new Date(data.next_appt.starts_at).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
          <p className="text-ink/70">{t(`appt.${data.next_appt.kind}`)}</p>
          {data.next_appt.meet_link && <a href={data.next_appt.meet_link} target="_blank" rel="noreferrer" className="mt-2 flex min-h-12 items-center justify-center rounded-2xl bg-emerald font-bold text-white">{t('appt.join')}</a>}
        </Card>
      )}

      {patient && (
        <Card i={2}>
          <div id="tasks" className="flex scroll-mt-20 items-center justify-between">
            <h2 className="font-display text-xl font-bold">{t('tasks.title')}</h2>
            <span className="font-latin text-sm font-semibold text-emerald">{doneCount}/5</span>
          </div>
          {/* Progress bar: kitna kaam ho gaya — smooth bharta hai */}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald to-[#2BA676] transition-[width] duration-700 [transition-timing-function:var(--ease-out)]" style={{ width: `${(doneCount / 5) * 100}%` }} />
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {(['breakfast', 'lunch', 'dinner'] as const).map((m, k) => (
              <li key={m} className="rise" style={{ '--i': k + 3 } as React.CSSProperties}>
                <button onClick={() => go('checkin')} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-paper px-4 text-left text-lg">
                  <span>🍽️ {t(`tasks.${m}`)}</span>
                  <span key={String(done(m))} className={`pop rounded-full px-3 py-1 text-sm font-bold ${done(m) ? 'bg-mint text-emerald' : 'bg-coral/15 text-coral'}`}>{done(m) ? t('tasks.done') : t('tasks.add')}</span>
                </button>
              </li>
            ))}
            <li className="rise relative flex min-h-14 items-center justify-between rounded-2xl bg-paper px-4 text-lg" style={{ '--i': 6 } as React.CSSProperties}>
              <span>💧 {t('tasks.water')}: <b key={water} className="bump inline-block min-w-5 text-center text-emerald">{water}</b> {t('water_unit')}</span>
              <span className="relative">
                {bump > 0 && <span key={bump} className="drop -top-2 left-3 text-lg">💧</span>}
                <button onClick={addWater} aria-label="+1" className="h-11 w-11 rounded-full bg-emerald text-2xl font-bold text-white shadow-md shadow-emerald/30">+</button>
              </span>
            </li>
            <li className="rise" style={{ '--i': 7 } as React.CSSProperties}>
              <button onClick={() => go('checkin')} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-paper px-4 text-left text-lg">
                <span>⚖️ {t('tasks.weight')}</span>
                <span className="font-bold">{todayLog?.weight_kg ? `${todayLog.weight_kg} kg` : <span className="rounded-full bg-coral/15 px-3 py-1 text-sm text-coral">{t('tasks.add')}</span>}</span>
              </button>
            </li>
          </ul>
        </Card>
      )}

      {patient && <Safety data={data} />}
    </div>
  )
}

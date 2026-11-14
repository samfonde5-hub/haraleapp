import { useTranslation } from 'react-i18next'
import { PhotoBanner, DoctorArch, Card } from '../components/Visual'
import { daysBetween, partOfDay, todayIST } from '../lib/dates'
import { saveLog, type usePatientData } from '../lib/patient'
import morning from '../assets/banners/today-morning.webp'
import lunch from '../assets/banners/today-lunch.webp'
import evening from '../assets/banners/today-evening.webp'

type Data = ReturnType<typeof usePatientData>

export default function Today({ data, go, name }: { data: Data; go: (tab: string) => void; name: string }) {
  const { t } = useTranslation('p')
  const pod = partOfDay()
  const banner = pod === 'morning' ? morning : pod === 'afternoon' ? lunch : evening
  const { patient, todayCheckins, todayLog, streak, plan } = data
  const day = patient?.start_date ? Math.max(1, daysBetween(patient.start_date, todayIST()) + 1) : null
  const done = (m: string) => todayCheckins.some((c) => c.meal === m)
  const water = todayLog?.water_glasses ?? 0

  async function addWater() {
    if (!patient) return
    await saveLog(patient.id, { water_glasses: Math.min(30, water + 1) })
    data.reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={banner} tall>
        <p className="text-mint">{t(`greet.${pod}`)}{name ? `, ${name}` : ''} 🙏</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          {day ? t('day_of', { day, week: Math.ceil(day / 7) }) : t('pending.title')}
        </h1>
        <p className="mt-1 inline-flex w-fit rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
          {streak > 0 ? t('streak', { n: streak }) : t('streak_zero')}
        </p>
      </PhotoBanner>

      {!patient && (
        <Card className="border-2 border-gold/50">
          <p className="text-lg text-ink/80">{t('pending.body')}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-4">
          <DoctorArch size="sm" />
          <div className="min-w-0">
            <p className="font-latin text-xs uppercase tracking-widest text-coral">{t('doctor_card.title')}</p>
            <p className="font-display text-lg font-bold">{t('doctor_card.name')}</p>
          </div>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-ink/85">{plan?.doctor_note || t('doctor_card.empty')}</p>
      </Card>

      {patient && (
        <Card>
          <h2 className="font-display text-xl font-bold">{t('tasks.title')}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
              <li key={m}>
                <button onClick={() => go('checkin')} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-paper px-4 text-left text-lg">
                  <span>🍽️ {t(`tasks.${m}`)}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${done(m) ? 'bg-mint text-emerald' : 'bg-coral/15 text-coral'}`}>{done(m) ? t('tasks.done') : t('tasks.add')}</span>
                </button>
              </li>
            ))}
            <li className="flex min-h-14 items-center justify-between rounded-2xl bg-paper px-4 text-lg">
              <span>💧 {t('tasks.water')}: <b>{water}</b> {t('water_unit')}</span>
              <button onClick={addWater} aria-label="+1" className="h-11 w-11 rounded-full bg-emerald text-2xl font-bold text-white">+</button>
            </li>
            <li>
              <button onClick={() => go('checkin')} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-paper px-4 text-left text-lg">
                <span>⚖️ {t('tasks.weight')}</span>
                <span className="font-bold">{todayLog?.weight_kg ? `${todayLog.weight_kg} kg` : <span className="rounded-full bg-coral/15 px-3 py-1 text-sm text-coral">{t('tasks.add')}</span>}</span>
              </button>
            </li>
          </ul>
        </Card>
      )}
    </div>
  )
}

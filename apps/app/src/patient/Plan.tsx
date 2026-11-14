import { useTranslation } from 'react-i18next'
import { Card, DoctorArch, PhotoBanner } from '../components/Visual'
import type { usePatientData } from '../lib/patient'
import lunch from '../assets/banners/today-evening.webp'

type Data = ReturnType<typeof usePatientData>

export default function Plan({ data }: { data: Data }) {
  const { t } = useTranslation('p')
  const { plan } = data
  if (!plan) {
    return (
      <div className="flex flex-col gap-4">
        <PhotoBanner src={lunch} tall><h1 className="font-display text-3xl font-extrabold">{t('plan.empty_title')}</h1></PhotoBanner>
        <Card i={1}><div className="flex items-center gap-4"><DoctorArch size="sm" /><p className="text-lg text-ink/80">{t('plan.empty')}</p></div></Card>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={lunch}>
        <p className="text-mint">{t('plan.week', { n: plan.week_no })}</p>
        <h1 className="font-display text-3xl font-extrabold">{t('plan.title')}</h1>
        <span className="pop mt-1 w-fit rounded-full bg-mint px-3 py-0.5 text-sm font-bold text-emerald">{t('plan.approved')}</span>
      </PhotoBanner>
      {plan.focus_goal && (
        <Card i={1} className="border-l-8 border-coral">
          <p className="font-latin text-xs uppercase tracking-widest text-coral">{t('plan.focus')}</p>
          <p className="mt-1 font-display text-2xl font-bold">{plan.focus_goal}</p>
        </Card>
      )}
      {(plan.body.days ?? []).map((d, k) => (
        <Card key={d.label} i={k + 2}>
          <h2 className="font-display text-xl font-bold">{d.label}</h2>
          <ul className="mt-2 divide-y divide-ink/10">{d.meals.map((m, k) => (
            <li key={k} className="flex gap-3 py-2 text-lg"><span className="w-20 shrink-0 font-semibold text-emerald">{m.time}</span><span>{m.text}</span></li>
          ))}</ul>
        </Card>
      ))}
      {plan.doctor_note && (
        <Card i={(plan.body.days?.length ?? 0) + 2}><div className="flex items-start gap-4"><DoctorArch size="sm" /><div><p className="font-latin text-xs uppercase tracking-widest text-coral">{t('plan.note')}</p><p className="mt-1 text-lg">{plan.doctor_note}</p></div></div></Card>
      )}
    </div>
  )
}

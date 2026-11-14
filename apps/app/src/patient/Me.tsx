import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { useToast } from '../components/Toast'
import { useAuth, type ConsentType } from '../lib/auth'
import { haptic } from '../lib/feel'
import { supabase } from '../lib/supabase'
import consentImg from '../assets/banners/consent.webp'

const TYPES: ConsentType[] = ['health_data', 'ai_drafts', 'reminders', 'story']

/** iOS-style switch with a sliding knob (bade log bhi easily samjhe: ON/OFF) */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ${on ? 'bg-emerald' : 'bg-ink/20'}`} style={{ minHeight: 32 }}>
      <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-spring)] ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}

export default function Me() {
  const { t } = useTranslation('p')
  const { t: tt } = useTranslation()
  const toast = useToast()
  const { profile, consents, setConsentLocal, setProfileLocal, signOut } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [askOff, setAskOff] = useState(false)
  const dirty = name.trim() !== (profile?.full_name ?? '')

  async function saveName() {
    const v = name.trim().slice(0, 120) || null
    setProfileLocal({ full_name: v })
    const { error } = await supabase.from('profiles').update({ full_name: v }).eq('id', profile!.id)
    toast(error ? t('checkin.fail') : t('me.saved'), !error)
  }
  async function toggle(type: ConsentType, granted: boolean) {
    if (type === 'health_data' && !granted && !askOff) { setAskOff(true); haptic(20); return }
    setAskOff(false)
    haptic(8)
    setConsentLocal(type, granted) // switch turant palatta hai
    const { error } = await supabase.from('consents').insert({ type, granted, version: 'v1' })
    if (error) { setConsentLocal(type, !granted); toast(t('checkin.fail'), false) } else toast(t('me.saved'))
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={consentImg}><h1 className="slide-l font-display text-3xl font-extrabold">{t('me.title')}</h1><p className="slide-l text-white/85" style={{ animationDelay: '80ms' }}>{profile?.email}</p></PhotoBanner>
      <Card i={1}>
        <label className="font-display text-lg font-bold" htmlFor="nm">{t('me.name')}</label>
        <div className="mt-2 flex gap-2">
          <input id="nm" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/10 px-3 text-lg outline-none transition-colors focus:border-emerald" />
          <button onClick={saveName} disabled={!dirty} className="min-h-12 shrink-0 whitespace-nowrap rounded-xl bg-emerald px-4 font-bold text-white disabled:opacity-40">{t('me.save')}</button>
        </div>
      </Card>
      <Card i={2}>
        <h2 className="font-display text-xl font-bold">{t('me.consents')}</h2>
        <ul className="mt-2 flex flex-col gap-2">{TYPES.map((ty) => (
          <li key={ty}>
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2">
              <span>{tt(`consent.${ty}.title`)}</span>
              <Switch on={!!consents[ty]} onChange={(v) => toggle(ty, v)} label={tt(`consent.${ty}.title`)} />
            </div>
            {ty === 'health_data' && askOff && (
              <div className="rise mt-2 rounded-2xl border-2 border-coral/40 bg-coral/5 p-3">
                <p className="text-coral">{tt('consent.need_health')}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setAskOff(false)} className="min-h-11 flex-1 rounded-xl bg-white font-semibold">✕</button>
                  <button onClick={() => toggle('health_data', false)} className="min-h-11 flex-1 rounded-xl bg-coral font-semibold text-white">OFF</button>
                </div>
              </div>
            )}
          </li>
        ))}</ul>
        <p className="mt-3 text-sm text-ink/60">{t('me.privacy')}</p>
      </Card>
      <button onClick={signOut} className="rise min-h-14 rounded-2xl border-2 border-ink/15 text-lg font-semibold text-ink/70" style={{ '--i': 3 } as React.CSSProperties}>{tt('signout')}</button>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, PhotoBanner } from '../components/Visual'
import { useAuth, type ConsentType } from '../lib/auth'
import { supabase } from '../lib/supabase'
import consentImg from '../assets/banners/consent.webp'

const TYPES: ConsentType[] = ['health_data', 'ai_drafts', 'reminders', 'story']

export default function Me() {
  const { t } = useTranslation('p')
  const { t: tt } = useTranslation()
  const { profile, consents, refresh, signOut } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [msg, setMsg] = useState('')

  async function saveName() {
    const { error } = await supabase.from('profiles').update({ full_name: name.trim().slice(0, 120) || null }).eq('id', profile!.id)
    setMsg(error ? '⚠️' : t('me.saved'))
    refresh()
  }
  async function toggle(type: ConsentType, granted: boolean) {
    if (type === 'health_data' && !granted && !confirm(tt('consent.need_health'))) return
    await supabase.from('consents').insert({ type, granted, version: 'v1' })
    refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoBanner src={consentImg}><h1 className="font-display text-3xl font-extrabold">{t('me.title')}</h1><p className="text-white/85">{profile?.email}</p></PhotoBanner>
      <Card>
        <label className="font-display text-lg font-bold" htmlFor="nm">{t('me.name')}</label>
        <div className="mt-2 flex gap-2">
          <input id="nm" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/10 px-3 text-lg outline-none focus:border-emerald" />
          <button onClick={saveName} className="min-h-12 shrink-0 whitespace-nowrap rounded-xl bg-emerald px-4 font-bold text-white">{t('me.save')}</button>
        </div>
        {msg && <p className="mt-2 text-emerald">{msg}</p>}
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold">{t('me.consents')}</h2>
        <ul className="mt-2 flex flex-col gap-2">{TYPES.map((ty) => (
          <li key={ty}><label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2">
            <span>{tt(`consent.${ty}.title`)}</span>
            <input type="checkbox" checked={!!consents[ty]} onChange={(e) => toggle(ty, e.target.checked)} className="h-7 w-7 accent-emerald" />
          </label></li>
        ))}</ul>
        <p className="mt-3 text-sm text-ink/60">{t('me.privacy')}</p>
      </Card>
      <button onClick={signOut} className="min-h-14 rounded-2xl border-2 border-ink/15 text-lg font-semibold text-ink/70">{tt('signout')}</button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'
import { VoicePlayer, VoiceRecorder } from '../components/Voice'
import { supabase } from '../lib/supabase'
import { haptic } from '../lib/feel'
import { DoctorArch } from '../components/Visual'

type Msg = { id: string; from_doctor: boolean; body: string | null; voice_path: string | null; created_at: string }

/** Patient ↔ doctor chat (text + voice). RLS: patient sees only their own thread. */
export default function Messages({ patientId, uid, back, onRead }: { patientId: string; uid: string; back: () => void; onRead: () => void }) {
  const { t, i18n } = useTranslation('p')
  const toast = useToast()
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  async function load() {
    const { data } = await supabase.from('messages').select('id, from_doctor, body, voice_path, created_at').eq('patient_id', patientId).order('created_at').limit(200)
    setMsgs(data ?? [])
  }
  useEffect(() => {
    load()
    supabase.rpc('patient_mark_read').then(onRead)
    const ch = supabase.channel(`pm-${patientId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` }, () => { load(); supabase.rpc('patient_mark_read') }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])

  async function send(body: string | null, voice: string | null) {
    setBusy(true)
    const tmp: Msg = { id: 'tmp' + Date.now(), from_doctor: false, body, voice_path: voice, created_at: new Date().toISOString() }
    setMsgs((m) => [...(m ?? []), tmp])
    const { error } = await supabase.from('messages').insert({ patient_id: patientId, body, voice_path: voice, from_doctor: false, sender_id: uid })
    setBusy(false)
    if (error) { setMsgs((m) => (m ?? []).filter((x) => x.id !== tmp.id)); return toast(t('msgs.fail'), false) }
    haptic(10); load()
  }
  async function voice(b: Blob) {
    setBusy(true)
    const ext = b.type.includes('ogg') ? 'ogg' : b.type.includes('mp4') ? 'mp4' : 'webm'
    const path = `${uid}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const { error } = await supabase.storage.from('voice').upload(path, b, { contentType: b.type.split(';')[0] })
    setBusy(false)
    if (error) return toast(t('msgs.fail'), false)
    send(null, path)
  }
  const time = (iso: string) => new Date(iso).toLocaleString(i18n.language === 'en' ? 'en-IN' : 'mr-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  return (
    <div className="flex flex-col gap-3">
      <button onClick={back} className="rise w-fit font-semibold text-emerald" style={{ minHeight: 40 }}>{t('msgs.back')}</button>
      <section className="rise flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <DoctorArch size="sm" />
        <div><h1 className="font-display text-2xl font-extrabold">{t('msgs.title')}</h1><p className="text-ink/60">{t('msgs.sub')}</p></div>
      </section>
      <div className="flex min-h-[45dvh] flex-col gap-2 rounded-3xl bg-white/60 p-3">
        {msgs === null ? <div className="skeleton h-40 rounded-2xl" /> : msgs.length === 0 ? <p className="m-auto p-6 text-center text-lg text-ink/60">{t('msgs.empty')}</p> : msgs.map((m) => (
          <div key={m.id} className={`pop max-w-[85%] rounded-2xl px-3 py-2 text-lg ${m.from_doctor ? 'self-start rounded-bl-md bg-white shadow-sm' : 'self-end rounded-br-md bg-emerald text-white'}`}>
            {m.voice_path && <VoicePlayer path={m.voice_path} />}
            {m.body && <p className="whitespace-pre-line">{m.body}</p>}
            <p className={`text-xs ${m.from_doctor ? 'text-ink/50' : 'text-white/70'}`}>{time(m.created_at)}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="sticky bottom-20 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-lg">
        <VoiceRecorder onDone={voice} label={t('msgs.voice')} stopLabel={t('msgs.stop')} />
        <input value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={2000} placeholder={t('msgs.type')} className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-ink/10 px-3 text-lg outline-none focus:border-emerald"
          onKeyDown={(e) => { if (e.key === 'Enter' && txt.trim() && !busy) { send(txt.trim(), null); setTxt('') } }} />
        <button disabled={!txt.trim() || busy} onClick={() => { send(txt.trim(), null); setTxt('') }} className="min-h-12 rounded-xl bg-emerald px-4 font-bold text-white disabled:opacity-40">{t('msgs.send')}</button>
      </div>
    </div>
  )
}

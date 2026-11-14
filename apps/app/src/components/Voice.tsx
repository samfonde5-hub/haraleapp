import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/** Plays a private voice note (signed URL, 1 hour). */
export function VoicePlayer({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    supabase.storage.from('voice').createSignedUrl(path, 3600).then(({ data }) => { if (alive) setUrl(data?.signedUrl ?? null) })
    return () => { alive = false }
  }, [path])
  return url ? <audio controls preload="none" src={url} className="h-10 w-full max-w-[260px]" /> : <span className="skeleton inline-block h-10 w-52 rounded-full" />
}

/** Tap to record, tap to stop. Returns a Blob (webm/ogg/mp4 — whatever the phone supports). Max 2 minutes. */
export function VoiceRecorder({ onDone, label = '● Record', stopLabel = '■ Stop' }: { onDone: (b: Blob) => void; label?: string; stopLabel?: string }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null)
  const [secs, setSecs] = useState(0)
  const [err, setErr] = useState('')
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number>(0)
  async function start() {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        clearInterval(timer.current)
        setRec(null); setSecs(0)
        const b = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
        if (b.size > 1000) onDone(b)
      }
      r.start()
      setRec(r)
      timer.current = window.setInterval(() => setSecs((s) => { if (s >= 119) r.stop(); return s + 1 }), 1000)
    } catch {
      setErr('🎤 Microphone permission needed')
    }
  }
  useEffect(() => () => clearInterval(timer.current), [])
  return (
    <span className="inline-flex items-center gap-2">
      {rec ? (
        <button onClick={() => rec.stop()} className="mini animate-pulse bg-red text-white">{stopLabel} {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</button>
      ) : (
        <button onClick={start} className="mini bg-emerald text-white">{label}</button>
      )}
      {err && <span className="text-xs text-red">{err}</span>}
    </span>
  )
}

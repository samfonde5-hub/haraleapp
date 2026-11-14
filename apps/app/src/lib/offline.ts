/**
 * Offline queue (PRD P12): net nahi hai to check-in IndexedDB me save,
 * net aate hi apne aap upload. IndexedDB = browser ka chhota database.
 */
import { supabase } from './supabase'

/** Server pe AI se thali check karwao (Gemini key server pe hi hai). Fail ho to chupchaap — doctor to dekhenge hi. */
export async function analyzePlate(checkinId: string) {
  const { data, error } = await supabase.functions.invoke('analyze-plate', { body: { checkin_id: checkinId } })
  return error ? null : (data as { ai_tag?: string } | null)
}

type Pending = { id: string; uid: string; patientId: string; meal: string; note: string; logDate: string; blob: Blob }
const DB = 'chinmay-offline'
const STORE = 'checkins'

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export async function queueCheckin(p: Pending) {
  const d = await db()
  await new Promise<void>((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(p)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

async function all(): Promise<Pending[]> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = d.transaction(STORE).objectStore(STORE).getAll()
    r.onsuccess = () => res(r.result as Pending[])
    r.onerror = () => rej(r.error)
  })
}

async function remove(id: string) {
  const d = await db()
  d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
}

/** Upload one check-in (photo → storage, row → table). Throws on failure. */
export async function uploadCheckin(p: Pending) {
  const ext = p.blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${p.uid}/${p.logDate}-${p.meal}-${p.id.slice(0, 8)}.${ext}`
  const up = await supabase.storage.from('plates').upload(path, p.blob, { contentType: p.blob.type, upsert: true })
  if (up.error) throw up.error
  const ins = await supabase.from('checkins').insert({
    id: p.id, patient_id: p.patientId, meal: p.meal, note: p.note || null, photo_path: path, log_date: p.logDate,
  })
  if (ins.error) throw ins.error
}

let flushing = false
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0
  flushing = true
  let done = 0
  try {
    for (const p of await all()) {
      try { await uploadCheckin(p); await remove(p.id); analyzePlate(p.id); done++ } catch { /* try next time */ }
    }
  } finally { flushing = false }
  return done
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { flushQueue() })

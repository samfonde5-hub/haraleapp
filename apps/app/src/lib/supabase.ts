import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key) throw new Error('Supabase env missing: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY')

/** Browser client. Sirf public key; data access RLS se control hota hai. */
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Phase 0 health check: kya app Supabase tak pahunch raha hai? */
export async function checkBackend(): Promise<boolean> {
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
    return r.ok
  } catch {
    return false
  }
}

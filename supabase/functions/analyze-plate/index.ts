// analyze-plate: patient ki thali photo → Gemini vision → tag + chhoti tip.
// Mentor note: Gemini key SIRF yahan (server secret). Browser sirf "is check-in ko dekho" bolta hai.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED = ['https://chinmay-app.pages.dev', 'http://localhost:5173', 'http://localhost:4173']
const TAGS = ['balanced', 'rice_extra', 'low_veg', 'fried', 'sweet', 'unclear'] as const
// gemini-2.5-* ab naye users ke liye band hai (404). 3.5-flash-lite: ~1s, sasta, Marathi theek.
const MODELS = [Deno.env.get('GEMINI_MODEL'), 'gemini-3.5-flash-lite'].filter(Boolean) as string[]

function cors(origin: string | null) {
  const ok = origin && (ALLOWED.includes(origin) || origin.endsWith('.chinmay-app.pages.dev'))
  return {
    'Access-Control-Allow-Origin': ok ? origin! : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const PROMPT = `You review a meal photo for a weight-loss clinic in Kolhapur, Maharashtra (patients eat Maharashtrian home food: bhakri, chapati, rice, varan, amti, usal, bhaji, koshimbir, poha, upma, etc.).
Return JSON only.
- items: up to 8 food items you can actually see, short English names.
- tag: exactly one of balanced | rice_extra | low_veg | fried | sweet | unclear.
  balanced = roughly half vegetables/salad, some protein (dal/usal/egg/paneer/curd), modest grains.
  rice_extra = rice/chapati/bhakri clearly dominates the plate. low_veg = little or no vegetables/salad.
  fried = fried items prominent. sweet = sweets/desserts prominent. unclear = not food, blurry, or you are unsure.
- confidence: 0 to 1.
- tip_mr: one friendly, encouraging tip in simple Marathi (Devanagari), max 14 words.
- tip_en: the same tip in simple English, max 14 words.
- portions: rough % of the plate area for grains (rice/roti/bhakri), veg (sabzi/salad), protein (usal/egg/paneer/meat/curd), dal (varan/amti/pithla). Should add up to about 100.
Rules for tips: general food-balance advice only (more salad, add dal, smaller rice portion, drink water). Never mention diseases, medicines, supplements, calories numbers, or promise weight loss. Never use Hindi. If tag is unclear, ask them to retake the photo in good light.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: { type: 'ARRAY', items: { type: 'STRING' } },
    tag: { type: 'STRING', enum: [...TAGS] },
    confidence: { type: 'NUMBER' },
    tip_mr: { type: 'STRING' },
    tip_en: { type: 'STRING' },
    portions: { type: 'OBJECT', properties: { grains: { type: 'NUMBER' }, veg: { type: 'NUMBER' }, protein: { type: 'NUMBER' }, dal: { type: 'NUMBER' } } },
  },
  required: ['items', 'tag', 'confidence', 'tip_mr', 'tip_en', 'portions'],
}

async function gemini(b64: string, mime: string) {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY missing')
  let lastErr = ''
  for (const model of MODELS) {
    const thinking = /flash-lite/.test(model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}
    let r: Response
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2, maxOutputTokens: 1024, ...thinking },
        }),
        signal: AbortSignal.timeout(18000),
      })
    } catch (e) { lastErr = `${model}: ${(e as Error).message}`; console.error(lastErr); continue }
    if (!r.ok) { lastErr = `${model}: ${r.status} ${(await r.text()).slice(0, 300)}`; console.error(lastErr); if (r.status === 429) break; continue }
    const j = await r.json()
    const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
    if (!text) { lastErr = `${model}: empty ${j?.candidates?.[0]?.finishReason ?? ''}`; console.error(lastErr); continue }
    try { return { ...JSON.parse(text), model } } catch { lastErr = `${model}: bad json`; continue }
  }
  throw new Error(lastErr || 'gemini failed')
}

function b64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, 'content-type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return out({ error: 'method' }, 405)

  try {
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    // Admin client (server-only key). Har check hum khud explicitly karte hain: token → user → uska patient → uska check-in.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: u, error: ae } = await admin.auth.getUser(jwt)
    if (ae || !u?.user) return out({ error: 'auth' }, 401)

    const { checkin_id } = await req.json().catch(() => ({}))
    if (typeof checkin_id !== 'string' || !/^[0-9a-f-]{36}$/.test(checkin_id)) return out({ error: 'bad id' }, 400)

    const { data: pt } = await admin.from('patients').select('id, doctor_only').eq('profile_id', u.user.id).maybeSingle()
    if (!pt) return out({ error: 'not a patient' }, 403)
    const { data: c } = await admin.from('checkins').select('id, patient_id, photo_path, ai_tag').eq('id', checkin_id).eq('patient_id', pt.id).maybeSingle()
    if (!c) return out({ error: 'not found' }, 404) // dusre ka check-in → not found (leak nahi)
    if (c.ai_tag) return out({ ok: true, cached: true }) // ek photo = ek hi AI call (cost control)
    if (!c.photo_path || !c.photo_path.startsWith(`${u.user.id}/`)) return out({ error: 'no photo' }, 400)

    // Consent: "AI मदत" band hai to AI nahi chalega
    const { data: cons } = await admin.from('consents').select('granted').eq('profile_id', u.user.id).eq('type', 'ai_drafts').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!cons?.granted) return out({ ok: true, skipped: 'consent' })

    const { data: file, error: fe } = await admin.storage.from('plates').download(c.photo_path)
    if (fe || !file) return out({ error: 'photo' }, 500)
    if (file.size > 5_000_000) return out({ error: 'too big' }, 413)

    const ai = await gemini(b64(await file.arrayBuffer()), file.type || 'image/webp')
    const tag = TAGS.includes(ai.tag) ? ai.tag : 'unclear'
    const confidence = Math.max(0, Math.min(1, Number(ai.confidence) || 0))
    const clip = (s: unknown) => (typeof s === 'string' ? s.slice(0, 160) : null)
    // Medical condition wale patient: tip nahi — sirf doctor bolenge (PRD §6.3)
    const showTip = !pt?.doctor_only && tag !== 'unclear' ? true : tag === 'unclear'
    const ai_items = {
      items: Array.isArray(ai.items) ? ai.items.slice(0, 8).map(String) : [],
      tip_mr: showTip ? clip(ai.tip_mr) : null,
      tip_en: showTip ? clip(ai.tip_en) : null,
      model: ai.model,
      portions: ai.portions && typeof ai.portions === 'object' ? Object.fromEntries(['grains', 'veg', 'protein', 'dal'].map((k) => [k, Math.max(0, Math.min(100, Math.round(Number(ai.portions[k]) || 0)))])) : undefined,
    }
    const { error: ue } = await admin.from('checkins').update({ ai_tag: tag, ai_confidence: confidence, ai_items }).eq('id', c.id)
    if (ue) return out({ error: 'save' }, 500)
    return out({ ok: true, ai_tag: tag, ai_items })
  } catch (e) {
    console.error('analyze-plate', (e as Error).message)
    return out({ error: 'ai_failed' }, 502)
  }
})

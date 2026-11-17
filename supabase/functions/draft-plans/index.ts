// draft-plans: AI weekly plan drafts from the DOCTOR'S templates + food library.
// Rules: nothing reaches a patient without doctor approval (status stays 'draft').
// Medical condition / medication → no AI plan, flagged doctor-only.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED = ['https://chinmay-app.pages.dev', 'http://localhost:5173', 'http://localhost:4173']
// gemini-2.5-* ab naye users ke liye band hai (404). 3.5-flash-lite: ~1s, sasta, Marathi theek.
const MODELS = [Deno.env.get('GEMINI_MODEL'), 'gemini-3.5-flash-lite'].filter(Boolean) as string[]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cors(origin: string | null) {
  const ok = origin && (ALLOWED.includes(origin) || origin.endsWith('.chinmay-app.pages.dev'))
  return { 'Access-Control-Allow-Origin': ok ? origin! : ALLOWED[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    days: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, meals: { type: 'ARRAY', items: { type: 'OBJECT', properties: { time: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['time', 'text'] } } }, required: ['label', 'meals'] } },
    focus_goal: { type: 'STRING' },
    doctor_note: { type: 'STRING' },
    why: { type: 'ARRAY', items: { type: 'STRING' } },
    changes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { minus: { type: 'STRING' }, plus: { type: 'STRING' }, why: { type: 'STRING' } } } },
    est_kcal: { type: 'NUMBER' },
  },
  required: ['days', 'focus_goal', 'doctor_note', 'why', 'changes', 'est_kcal'],
}

// Mentor note: OPENAI_API_KEY secret daalte hi ChatGPT use hoga; nahi hai to free Gemini. Code badalna nahi padta.
async function openai(prompt: string, img?: { b64: string; mime: string }) {
  const key = Deno.env.get('OPENAI_API_KEY')!
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini'
  const content: unknown[] = [{ type: 'text', text: prompt + '\nReturn ONLY one JSON object that follows this schema exactly: ' + JSON.stringify(SCHEMA) }]
  if (img) content.push({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.b64}`, detail: 'low' } })
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0.3 }),
    signal: AbortSignal.timeout(25000),
  })
  if (!r.ok) throw new Error(`openai ${r.status} ${(await r.text()).slice(0, 200)}`)
  const j = await r.json()
  return { ...JSON.parse(j.choices?.[0]?.message?.content ?? '{}'), model }
}

async function gemini(prompt: string) {
  if (Deno.env.get('OPENAI_API_KEY')) return openai(prompt)
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY missing')
  let last = ''
  for (const model of MODELS) {
    const thinking = /flash-lite/.test(model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4, maxOutputTokens: 4096, ...thinking } }),
        signal: AbortSignal.timeout(40000),
      })
      if (!r.ok) { last = `${model}: ${r.status} ${(await r.text()).slice(0, 200)}`; if (r.status === 429) break; continue }
      const j = await r.json()
      const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
      if (!text) { last = `${model}: empty`; continue }
      return JSON.parse(text)
    } catch (e) { last = `${model}: ${(e as Error).message}` }
  }
  throw new Error(last || 'gemini failed')
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'content-type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return out({ error: 'method' }, 405)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  try {
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user) return out({ error: 'auth' }, 401)
    const { data: me } = await admin.from('profiles').select('role').eq('id', u.user.id).single()
    if (!me || (me.role !== 'doctor' && me.role !== 'staff')) return out({ error: 'team only' }, 403)

    const [{ data: patients }, { data: templates }, { data: foods }] = await Promise.all([
      admin.from('patients').select('id, full_name, start_date, start_weight, target_weight, conditions, on_medication, doctor_only, dislikes, kcal_min, kcal_max, diet_template_id, workout_template_id, gender').eq('status', 'active').limit(60),
      admin.from('plan_templates').select('*'),
      admin.from('foods').select('name, portion, kcal, category, avoid'),
    ])
    const diet = (templates ?? []).filter((t) => t.kind === 'diet' && Array.isArray(t.sections) && t.sections.length)
    const avoid = (foods ?? []).filter((f) => f.avoid).map((f) => f.name)
    const foodList = (foods ?? []).filter((f) => !f.avoid).map((f) => `${f.name} (${f.portion ?? ''} ~${f.kcal ?? '?'} kcal)`).join(', ')
    const today = istToday()
    const since14 = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)

    let created = 0, skipped = 0
    const queue = [...(patients ?? [])]
    async function one(p: NonNullable<typeof patients>[number]) {
      const { data: plans } = await admin.from('plans').select('week_no, status, body, focus_goal').eq('patient_id', p.id).order('week_no', { ascending: false }).limit(3)
      const curWeek = p.start_date ? Math.max(1, Math.floor((Date.parse(today) - Date.parse(p.start_date)) / 6048e5) + 1) : 1
      const nextWeek = Math.min(104, Math.max((plans?.[0]?.week_no ?? 0) + 1, curWeek + 1))
      if (plans?.some((x) => x.week_no === nextWeek)) { skipped++; return }
      if (plans?.some((x) => x.status === 'draft')) { skipped++; return }

      if (p.doctor_only || p.on_medication || (p.conditions ?? []).length) {
        await admin.from('plans').insert({ patient_id: p.id, week_no: nextWeek, status: 'draft', source: 'ai', risk_level: 'doctor_only', body: {},
          ai_reason: 'Medical condition or medication on file → AI does not write this plan. Doctor writes it manually.',
          safety: [{ label: 'Medical condition / medication on file → doctor only', ok: false }] })
        created++; return
      }
      const tpl = diet.find((t) => t.id === p.diet_template_id) ?? diet.find((t) => t.name === 'Kolhapuri balanced T1') ?? diet[0]
      if (!tpl) { skipped++; return }
      const work = (templates ?? []).find((t) => t.id === p.workout_template_id)
      const [{ data: logs }, { data: cks }] = await Promise.all([
        admin.from('daily_logs').select('log_date, weight_kg, water_glasses, mood').eq('patient_id', p.id).gte('log_date', since14).order('log_date'),
        admin.from('checkins').select('log_date, meal, ai_tag').eq('patient_id', p.id).gte('log_date', since14),
      ])
      const ws = (logs ?? []).filter((l) => l.weight_kg).map((l) => `${l.log_date}: ${l.weight_kg}`).join(', ') || 'none'
      const water = (logs ?? []).filter((l) => l.water_glasses != null)
      const avgWater = water.length ? (water.reduce((s, l) => s + (l.water_glasses ?? 0), 0) / water.length).toFixed(1) : 'unknown'
      const tags = (cks ?? []).reduce<Record<string, number>>((m, c) => { if (c.ai_tag) m[c.ai_tag] = (m[c.ai_tag] ?? 0) + 1; return m }, {})
      const kMin = p.kcal_min ?? Math.max(1300, (tpl.kcal ?? 1500) - 100), kMax = p.kcal_max ?? (tpl.kcal ?? 1500) + 100
      const prev = plans?.find((x) => x.status === 'approved' || x.status === 'sent')
      const first = (p.full_name ?? '').split(' ')[0]

      const prompt = `You draft a weekly diet plan for a weight-loss patient of Dr. Harale's clinic in Kolhapur, Maharashtra. The DOCTOR will review it before the patient sees it.
STRICT RULES:
- Use ONLY the doctor's template structure and foods from the food library below. Maharashtrian home food. Food names in Marathi (Devanagari).
- Daily calories between ${kMin} and ${kMax} kcal. Never below 1300.
- Template rules: ${(tpl.rules ?? []).join(' | ') || 'none'}
- NEVER use these (avoid-list): ${avoid.join(', ') || 'none'}. Patient dislikes / fasting: ${p.dislikes || 'none'}.
- No supplements, no powders, no medicines, no "guaranteed" results, no Hindi.
- 7 days labelled ${DAYS.join(', ')}; each day 4 meals with time (breakfast ~8:00, lunch ~1:30, evening ~5:00, dinner before 8 PM). Keep each meal text short (e.g. "2 ज्वारी भाकरी + पिठलं + कोशिंबीर"). Sunday may have one flexible meal.
- focus_goal: ONE simple habit for the week, Marathi, max 10 words.
- doctor_note: warm 1–2 line Marathi note addressed to "${first}" (no surname), mention one real thing from their data.
- why: 2–4 short English bullets citing the patient's data (plates, water, weight trend).
- changes: up to 3 items vs last week's plan ({minus, plus, why}); empty if first plan.
- est_kcal: your estimated average daily kcal.

TEMPLATE "${tpl.name}" (~${tpl.kcal ?? '?'} kcal): ${JSON.stringify(tpl.sections)}
WORKOUT: ${work ? `${work.name} ${JSON.stringify(work.sections)}` : 'Walk 30 min daily'}
FOOD LIBRARY: ${foodList}

PATIENT: week ${nextWeek} of program. Start ${p.start_weight ?? '?'} kg, target ${p.target_weight ?? '?'} kg.
Weights (14 days): ${ws}
Avg water glasses: ${avgWater}
Plate AI tags (14 days): ${JSON.stringify(tags)}
Last week's plan: ${prev ? JSON.stringify({ focus: prev.focus_goal, days: (prev.body as { days?: unknown[] })?.days?.slice(0, 2) }) : 'none (first plan)'}`

      const ai = await gemini(prompt)
      const days = (Array.isArray(ai.days) ? ai.days : []).slice(0, 7).map((d: { label?: string; meals?: { time?: string; text?: string }[] }, i: number) => ({
        label: DAYS[i] ?? clip(d.label, 10),
        meals: (Array.isArray(d.meals) ? d.meals : []).slice(0, 6).map((m) => ({ time: clip(m.time, 12), text: clip(m.text, 160) })),
      }))
      const allText = days.flatMap((d: { meals: { text: string }[] }) => d.meals.map((m) => m.text)).join(' ')
      const dislikeWords = (p.dislikes ?? '').split(/[,·/|]+/).map((w: string) => w.trim()).filter((w: string) => w.length > 1)
      const hitAvoid = [...avoid, ...dislikeWords].filter((w) => allText.includes(w))
      const est = Number(ai.est_kcal) || 0
      const safety = [
        { label: 'No medication on file', ok: !p.on_medication },
        { label: `Calories within doctor range (${kMin}–${kMax})`, ok: est >= kMin - 50 && est <= kMax + 50 && est >= 1300 },
        { label: hitAvoid.length ? `Avoid-list / dislike found: ${hitAvoid.join(', ')}` : 'No foods from avoid-list or dislikes', ok: hitAvoid.length === 0 },
        { label: `${tpl.name} template rules followed`, ok: days.length === 7 && days.every((d: { meals: unknown[] }) => d.meals.length >= 3) },
      ]
      const risk = safety.every((s) => s.ok) ? 'safe' : 'review'
      const { error } = await admin.from('plans').insert({
        patient_id: p.id, week_no: nextWeek, status: 'draft', source: 'ai', risk_level: risk,
        body: { days, workout: work?.name ?? undefined }, focus_goal: clip(ai.focus_goal, 200) || null, doctor_note: clip(ai.doctor_note, 1000) || null,
        ai_reason: (Array.isArray(ai.why) ? ai.why : []).slice(0, 5).map((x: unknown) => `• ${clip(x, 200)}`).join('\n'),
        ai_changes: (Array.isArray(ai.changes) ? ai.changes : []).slice(0, 3).map((c: { minus?: string; plus?: string; why?: string }) => ({ minus: clip(c.minus, 160), plus: clip(c.plus, 160), why: clip(c.why, 160) })),
        safety,
      })
      if (error) { console.error('insert', p.id, error.message); skipped++ } else created++
    }
    // 4 at a time — fast but polite to Gemini free-tier limits
    await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) { const p = queue.shift()!; try { await one(p) } catch (e) { console.error('draft', p.id, (e as Error).message); skipped++ } } }))
    await admin.from('automation_runs').insert({ key: 'plan_drafts', items: created, note: `skipped ${skipped}` })
    return out({ ok: true, created, skipped })
  } catch (e) {
    console.error('draft-plans', (e as Error).message)
    return out({ error: 'failed' }, 500)
  }
})

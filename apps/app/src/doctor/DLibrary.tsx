import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { deleteFood, saveFood, saveTemplate, useFoods, useTemplates, type Food, type Template } from '../lib/doctor'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Av, Dc, Empty, Modal, PageHead, Spinner, fmtDate, useL } from './ui'

const CATS = ['grain', 'dal', 'veg', 'protein', 'dairy', 'fruit', 'snack', 'sweet', 'drink', 'other'] as const

function TemplateForm({ t, onClose, onSaved }: { t?: Template; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const [f, setF] = useState({ kind: t?.kind ?? 'diet', name: t?.name ?? '', kcal: t?.kcal?.toString() ?? '', level: t?.level ?? '' })
  const [secs, setSecs] = useState(t?.sections?.length ? t.sections : [{ title: 'Breakfast', rule: 'Pick 1', items: '' }, { title: 'Lunch', rule: 'Plate rule', items: '' }, { title: 'Evening', rule: 'Pick 1', items: '' }, { title: 'Dinner', rule: 'Before 8 PM', items: '' }])
  const [rules, setRules] = useState((t?.rules ?? ['Never go below 1,300 kcal', 'Max 1 sweet portion / week', 'Medication patients → doctor writes manually']).join('\n'))
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!f.name.trim()) return toast(L('Name required', 'नाव हवं'), false)
    const kcal = parseInt(f.kcal)
    setBusy(true)
    const { error } = await saveTemplate({ id: t?.id, kind: f.kind as Template['kind'], name: f.name.trim(), kcal: Number.isFinite(kcal) && kcal >= 800 && kcal <= 3500 ? kcal : null, level: f.level.trim() || null,
      sections: secs.filter((s) => s.title.trim() || s.items.trim()), rules: rules.split('\n').map((r) => r.trim()).filter(Boolean) })
    setBusy(false)
    if (error) return toast(L('Only the doctor can edit templates.', 'फक्त डॉक्टर टेम्प्लेट बदलू शकतात.'), false)
    toast(L('Template saved ✓ AI will follow it from the next draft.', 'टेम्प्लेट सेव्ह ✓ पुढच्या मसुद्यापासून AI हेच पाळेल.')); onSaved(); onClose()
  }
  return (
    <Modal title={t ? L('Edit template', 'टेम्प्लेट बदला') : L('New template', 'नवीन टेम्प्लेट')} onClose={onClose} wide>
      <div className="grid gap-3">
        <div className="grid grid-cols-[120px_1fr_110px] gap-3">
          <label className="dlabel">{L('Type', 'प्रकार')}<select className="dfield mt-1" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Template['kind'] })}><option value="diet">Diet</option><option value="workout">Workout</option></select></label>
          <label className="dlabel">{L('Name', 'नाव')}<input className="dfield mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          {f.kind === 'diet' ? <label className="dlabel">kcal<input className="dfield mt-1" inputMode="numeric" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></label>
            : <label className="dlabel">{L('Level', 'स्तर')}<input className="dfield mt-1" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} /></label>}
        </div>
        {secs.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl bg-sand/60 p-2">
            <input className="dfield" value={s.title} placeholder={L('Meal', 'जेवण')} onChange={(e) => setSecs(secs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <input className="dfield" value={s.rule} placeholder={L('Rule', 'नियम')} onChange={(e) => setSecs(secs.map((x, j) => (j === i ? { ...x, rule: e.target.value } : x)))} />
            <button onClick={() => setSecs(secs.filter((_, j) => j !== i))} className="w-10 rounded-xl bg-white text-red" aria-label="Remove">✕</button>
            <textarea className="dfield col-span-3" rows={2} value={s.items} placeholder="पोहे 1 वाटी · उपमा 1 वाटी · …" onChange={(e) => setSecs(secs.map((x, j) => (j === i ? { ...x, items: e.target.value } : x)))} />
          </div>
        ))}
        <button onClick={() => setSecs([...secs, { title: '', rule: '', items: '' }])} className="dbtn g">+ {L('Add section', 'विभाग जोडा')}</button>
        <label className="dlabel">{L('Rules AI must follow (one per line)', 'AI ने पाळायचे नियम (एका ओळीत एक)')}<textarea className="dfield mt-1" rows={4} value={rules} onChange={(e) => setRules(e.target.value)} /></label>
        <button onClick={save} disabled={busy} className="dbtn e">{busy ? <Spinner /> : L('Save template', 'टेम्प्लेट सेव्ह')}</button>
      </div>
    </Modal>
  )
}

function FoodForm({ food, onClose, onSaved }: { food?: Food; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const [f, setF] = useState({ name: food?.name ?? '', portion: food?.portion ?? '', kcal: food?.kcal?.toString() ?? '', category: food?.category ?? 'other', avoid: food?.avoid ?? false })
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!f.name.trim()) return
    setBusy(true)
    const k = parseInt(f.kcal)
    const { error } = await saveFood({ id: food?.id, name: f.name.trim(), portion: f.portion.trim() || null, kcal: Number.isFinite(k) ? k : null, category: f.category, avoid: f.avoid })
    setBusy(false)
    if (error) return toast(error.code === '23505' ? L('Already in library', 'आधीच यादीत आहे') : L('Only the doctor can edit foods.', 'फक्त डॉक्टर बदलू शकतात.'), false)
    toast(L('Saved ✓', 'सेव्ह ✓')); onSaved(); onClose()
  }
  return (
    <Modal title={food ? L('Edit food', 'पदार्थ बदला') : L('Add food', 'पदार्थ जोडा')} onClose={onClose}>
      <div className="grid gap-3">
        <label className="dlabel">{L('Name', 'नाव')}<input className="dfield mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="grid grid-cols-3 gap-3">
          <label className="dlabel">{L('Portion', 'प्रमाण')}<input className="dfield mt-1" value={f.portion} onChange={(e) => setF({ ...f, portion: e.target.value })} placeholder="1 वाटी" /></label>
          <label className="dlabel">kcal<input className="dfield mt-1" inputMode="numeric" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></label>
          <label className="dlabel">{L('Group', 'गट')}<select className="dfield mt-1" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ minHeight: 44 }}><input type="checkbox" className="h-5 w-5 accent-coral" checked={f.avoid} onChange={(e) => setF({ ...f, avoid: e.target.checked })} />{L('Avoid list — AI must never suggest', 'टाळायचा — AI कधीच सुचवणार नाही')}</label>
        <div className="flex gap-2">
          {food && <button onClick={async () => { if (!window.confirm(L('Remove this food?', 'हा पदार्थ काढायचा?'))) return; await deleteFood(food.id); onSaved(); onClose() }} className="dbtn g text-red">{L('Remove', 'काढा')}</button>}
          <button onClick={save} disabled={busy} className="dbtn e flex-1">{busy ? <Spinner /> : L('Save', 'सेव्ह')}</button>
        </div>
      </div>
    </Modal>
  )
}

export default function DLibrary() {
  const L = useL()
  const { i18n } = useTranslation()
  const { profile } = useAuth()
  const tq = useTemplates()
  const fq = useFoods()
  const [sel, setSel] = useState<string | null>(null)
  const [edit, setEdit] = useState<Template | 'new' | null>(null)
  const [food, setFood] = useState<Food | 'new' | null>(null)
  const [s, setS] = useState('')
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const isDoctor = profile?.role === 'doctor'
  const tpls = tq.data ?? []
  const cur = tpls.find((t) => t.id === sel) ?? tpls[0]
  useEffect(() => {
    if (!cur) return
    supabase.from('patients').select('id, full_name').or(`diet_template_id.eq.${cur.id},workout_template_id.eq.${cur.id}`).eq('status', 'active').then(({ data }) => setUsers(data ?? []))
  }, [cur?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!tq.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const foods = (fq.data ?? []).filter((f) => !s.trim() || f.name.includes(s.trim()) || f.category.includes(s.trim().toLowerCase()))
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Plans & food library', 'प्लॅन व आहार यादी')} sub={L('Your rules = AI’s rules. AI builds plans only from these templates and foods.', 'तुमचे नियम = AI चे नियम. AI फक्त याच टेम्प्लेट आणि पदार्थांतून प्लॅन बनवतो.')}
        right={isDoctor && <button onClick={() => setEdit('new')} className="dbtn p">+ {L('New template', 'नवीन टेम्प्लेट')}</button>} />
      <div className="grid gap-4 xl:grid-cols-[240px_1fr_320px]">
        <Dc className="p-2!">
          {(['diet', 'workout'] as const).map((k) => (
            <div key={k} className="mb-2">
              <p className="px-2 pb-1 pt-2 font-latin text-xs font-semibold tracking-widest text-mu">{k.toUpperCase()}</p>
              {tpls.filter((t) => t.kind === k).map((t) => (
                <button key={t.id} onClick={() => setSel(t.id)} className={`flex w-full items-center justify-between rounded-xl px-3 text-left text-sm ${cur?.id === t.id ? 'bg-mintl font-bold text-emerald' : 'hover:bg-sand'}`} style={{ minHeight: 40 }}>
                  <span className="truncate">{t.name}</span><span className="shrink-0 font-latin text-xs text-mu">{t.kcal ?? t.level ?? ''}</span>
                </button>
              ))}
            </div>
          ))}
        </Dc>
        {cur ? (
          <Dc key={cur.id} className="min-w-0">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{cur.name}</h2>
                <p className="text-sm text-mu">{cur.kcal ? `~${cur.kcal.toLocaleString('en-IN')} kcal · ` : ''}{L(`used by ${users.length} patients`, `${users.length} पेशंट्स वापरतात`)}</p></div>
              {isDoctor && <button onClick={() => setEdit(cur)} className="dbtn g">{L('Edit', 'बदला')}</button>}
            </div>
            {cur.sections.length === 0 ? <p className="mt-3 rounded-xl bg-ambl p-3 text-sm text-[#8A5A10]">{L('This template is empty — tap Edit to add meals. AI skips empty templates.', 'हे टेम्प्लेट रिकामं आहे — “बदला” दाबून जेवण जोडा. AI रिकामी टेम्प्लेट वापरत नाही.')}</p> : (
              <div className="mt-3 grid gap-2">{cur.sections.map((x, i) => (
                <div key={i} className="rise rounded-xl border border-line p-3" style={{ '--i': i } as React.CSSProperties}>
                  <div className="flex items-baseline justify-between gap-2"><b>{x.title}</b><span className="tag t-gr">{x.rule}</span></div>
                  <p className="mt-1 text-sm">{x.items}</p>
                </div>
              ))}</div>
            )}
            {cur.rules.length > 0 && (
              <div className="mt-3 rounded-xl bg-[#FFF4EF] p-3">
                <p className="text-sm font-bold text-[#C2502A]">{L('Rules AI must follow', 'AI ने पाळायचे नियम')}</p>
                <ul className="mt-1 list-disc pl-5 text-sm">{cur.rules.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-mu">{L('Patients on this template', 'हे टेम्प्लेट वापरणारे')}</span>
              {users.slice(0, 8).map((u) => <Av key={u.id} name={u.full_name} size={30} />)}
              {users.length > 8 && <span className="text-sm text-mu">+{users.length - 8}</span>}
              <span className="ml-auto text-xs text-mu">{L('Last edited', 'शेवटचा बदल')} {fmtDate(cur.updated_at, i18n.language)}</span>
            </div>
          </Dc>
        ) : <Empty>{L('No templates yet.', 'टेम्प्लेट नाहीत.')}</Empty>}
        <Dc className="min-w-0">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[19px] font-bold">{L('Food library', 'पदार्थ यादी')}</h2><span className="text-sm text-mu">{fq.data?.length ?? 0} {L('items', 'पदार्थ')}</span></div>
          <div className="mt-2 flex gap-2"><input className="dfield" placeholder={L('Search food…', 'पदार्थ शोधा…')} value={s} onChange={(e) => setS(e.target.value)} />
            {isDoctor && <button onClick={() => setFood('new')} className="dbtn g shrink-0 px-3" aria-label={L('Add food', 'पदार्थ जोडा')}>+</button>}</div>
          <ul className="mt-2 max-h-[480px] divide-y divide-line overflow-y-auto">{foods.map((f) => (
            <li key={f.id}><button onClick={() => isDoctor && setFood(f)} className="flex w-full items-center gap-2 py-2 text-left text-sm" style={{ minHeight: 40 }}>
              <span className={`min-w-0 flex-1 truncate ${f.avoid ? 'text-red line-through' : ''}`}>{f.name}</span><span className="shrink-0 text-xs text-mu">{f.portion}</span><span className="w-12 shrink-0 text-right font-latin text-xs">~{f.kcal ?? '—'}</span>
            </button></li>
          ))}</ul>
          <p className="mt-2 text-xs text-mu">{L('kcal approx. · doctor can edit any value', 'kcal अंदाजे · डॉक्टर कोणतीही किंमत बदलू शकतात')}</p>
        </Dc>
      </div>
      {edit && <TemplateForm t={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={tq.reload} />}
      {food && <FoodForm food={food === 'new' ? undefined : food} onClose={() => setFood(null)} onSaved={fq.reload} />}
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, useToast } from '../components/Toast'
import { saveStory, useStories, type Story } from '../lib/doctor'
import { Dc, Modal, PageHead, Spinner, fmtDate, useL } from './ui'

const DISCLAIMER = 'हे परिणाम सामान्य नाहीत. परिणाम व्यक्तीनुसार बदलू शकतात.'
const COLS = [['requested', 'Requested', 'विनंती केली'], ['consent_given', 'Consent given', 'संमती मिळाली'], ['ready', 'Ready for content', 'कंटेंटसाठी तयार'], ['published', 'Published', 'प्रकाशित']] as const
const KINDS = ['text', 'voice', 'video', 'photo', 'reel', 'carousel'] as const

function StoryForm({ s, onClose, onSaved }: { s: Story; onClose: () => void; onSaved: () => void }) {
  const L = useL()
  const toast = useToast()
  const [f, setF] = useState({ status: s.status, kind: s.kind, title: s.title ?? '', quote: s.quote ?? '', display_name: s.display_name, keyword: s.keyword ?? '', leads_count: s.leads_count.toString(), note: s.note ?? '',
    c_text: s.consent?.text ?? false, c_photo: s.consent?.photo ?? false, c_audio: s.consent?.audio ?? false, c_video: s.consent?.video ?? false, c_name: s.consent?.name ?? false })
  const [busy, setBusy] = useState(false)
  async function save() {
    if ((f.status === 'ready' || f.status === 'published') && !(f.c_text || f.c_photo || f.c_audio || f.c_video)) return toast(L('Record what the patient consented to first.', 'आधी पेशंटने कशाला संमती दिली ते नोंदवा.'), false)
    setBusy(true)
    const { error } = await saveStory({ id: s.id, status: f.status, kind: f.kind, title: f.title.trim() || null, quote: f.quote.trim() || null, display_name: f.c_name ? f.display_name : 'hidden', keyword: f.keyword.trim() || null,
      leads_count: parseInt(f.leads_count) || 0, note: f.note.trim() || null, consent: { text: f.c_text, photo: f.c_photo, audio: f.c_audio, video: f.c_video, name: f.c_name },
      published_at: f.status === 'published' ? (s.published_at ?? new Date().toISOString()) : null })
    setBusy(false)
    if (error) return toast(L('Could not save', 'सेव्ह झालं नाही'), false)
    toast(L('Saved ✓', 'सेव्ह ✓')); onSaved(); onClose()
  }
  const box = (k: 'c_text' | 'c_photo' | 'c_audio' | 'c_video' | 'c_name', en: string, mr: string) => (
    <label className="flex items-center gap-2 rounded-xl bg-sand px-3 text-sm font-semibold" style={{ minHeight: 40 }}><input type="checkbox" className="h-4 w-4 accent-emerald" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{L(en, mr)}</label>
  )
  return (
    <Modal title={s.patients?.full_name ?? L('Story', 'कथा')} onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="dlabel">{L('Stage', 'टप्पा')}<select className="dfield mt-1" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Story['status'] })}>
          {COLS.map(([v, en, mr]) => <option key={v} value={v}>{L(en, mr)}</option>)}<option value="declined">{L('Declined', 'नकार')}</option></select></label>
        <label className="dlabel">{L('Format', 'प्रकार')}<select className="dfield mt-1" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <div className="md:col-span-2"><p className="dlabel">{L('Patient consented to (record exactly what they agreed)', 'पेशंटने संमती दिली (नेमकं जे मान्य केलं ते)')}</p>
          <div className="mt-1 flex flex-wrap gap-2">{box('c_text', 'Text', 'मजकूर')}{box('c_photo', 'Photo', 'फोटो')}{box('c_audio', 'Audio', 'आवाज')}{box('c_video', 'Video', 'व्हिडिओ')}{box('c_name', 'Show name', 'नाव दाखवा')}</div></div>
        {f.c_name && <label className="dlabel">{L('Name shown', 'दाखवायचं नाव')}<select className="dfield mt-1" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })}><option value="first_name">{L('First name only', 'फक्त पहिलं नाव')}</option><option value="full">{L('Full name', 'पूर्ण नाव')}</option></select></label>}
        <label className="dlabel md:col-span-2">{L('Their words (quote)', 'त्यांचे शब्द')}<textarea className="dfield mt-1" rows={3} maxLength={600} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></label>
        <label className="dlabel">{L('Content title', 'कंटेंट शीर्षक')}<input className="dfield mt-1" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="“12 आठवडे, रोज साथ”" /></label>
        <label className="dlabel">{L('Keyword it drives', 'कीवर्ड')}<input className="dfield mt-1" value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} placeholder="प्लेट" /></label>
        {f.status === 'published' && <label className="dlabel">{L('Leads from it', 'त्यातून आलेले लीड्स')}<input className="dfield mt-1" inputMode="numeric" value={f.leads_count} onChange={(e) => setF({ ...f, leads_count: e.target.value.replace(/\D/g, '') })} /></label>}
        <p className="rounded-xl bg-ambl p-2.5 text-sm md:col-span-2"><b>{L('Auto disclaimer', 'आपोआप सूचना')}:</b> {DISCLAIMER}</p>
        <button onClick={save} disabled={busy} className="dbtn e md:col-span-2">{busy ? <Spinner /> : L('Save', 'सेव्ह')}</button>
      </div>
    </Modal>
  )
}

export default function DStories({ go }: { go: (h: string) => void }) {
  const L = useL()
  const { i18n } = useTranslation()
  const toast = useToast()
  const q = useStories()
  const [open, setOpen] = useState<Story | null>(null)
  if (!q.data) return <div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>
  const all = q.data
  const name = (s: Story) => s.patients?.full_name ?? L('Anonymous', 'नाव नाही')
  function share() {
    const ready = all.filter((s) => s.status === 'ready')
    const txt = ready.map((s) => `• ${s.title ?? s.kind}${s.quote ? ` — “${s.quote}”` : ''} [${s.kind}; ${s.display_name === 'hidden' ? 'name hidden' : s.display_name}]\n  ${DISCLAIMER}`).join('\n\n')
    if (!txt) return toast(L('Nothing in “Ready for content” yet.', '“तयार” मध्ये अजून काही नाही.'), false)
    navigator.clipboard?.writeText(txt).then(() => toast(L('Copied — paste it to your social team ✓', 'कॉपी झालं — सोशल टीमला पाठवा ✓')))
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={L('Proof & stories', 'अनुभव व कथा')} sub={L('Real stories with consent · disclaimer added automatically', 'संमतीसह खऱ्या कथा · सूचना आपोआप')}
        right={<button onClick={share} className="dbtn g">{L('Share with social team →', 'सोशल टीमला पाठवा →')}</button>} />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {COLS.map(([st, en, mr], ci) => {
          const col = all.filter((s) => s.status === st)
          return (
            <section key={st} className="rise w-[78vw] max-w-[300px] shrink-0 snap-start rounded-2xl bg-sand/70 p-2 lg:w-auto lg:max-w-none" style={{ '--i': ci } as React.CSSProperties}>
              <h2 className="flex items-center justify-between px-1.5 pb-2 pt-1 font-display font-bold">{L(en, mr)} <span className="font-latin text-sm text-mu">{col.length}</span></h2>
              <ul className="flex flex-col gap-2">
                {col.map((s) => (
                  <li key={s.id}><button onClick={() => setOpen(s)} className="lift w-full rounded-xl border border-line bg-white p-3 text-left" style={{ minHeight: 0 }}>
                    {st === 'ready' || st === 'published' ? <b className="block">{s.title ?? name(s)}</b> : <b className="block">{name(s)}</b>}
                    <p className="text-xs text-mu">{st === 'requested' ? `${s.patients?.start_date ? L('Week', 'आठवडा') + ' ' + Math.max(1, Math.floor((Date.now() - Date.parse(s.patients.start_date)) / 6048e5) + 1) + ' · ' : ''}${L('asked', 'विचारलं')} ${fmtDate(s.requested_at, i18n.language)}`
                      : st === 'published' ? `${s.kind} · ${fmtDate(s.published_at, i18n.language)}` : `${s.kind} · ${s.display_name === 'hidden' ? L('name hidden', 'नाव लपवलं') : s.display_name === 'first_name' ? L('first name only', 'फक्त पहिलं नाव') : L('full name', 'पूर्ण नाव')}`}</p>
                    {s.quote && <p className="mt-1 line-clamp-2 text-sm">“{s.quote}”</p>}
                    {st === 'consent_given' && <div className="mt-1.5 flex flex-wrap gap-1">{(['text', 'photo', 'audio', 'video', 'name'] as const).map((k) => <span key={k} className={`tag ${s.consent?.[k] ? 't-em' : 't-gr'}`}>{k} {s.consent?.[k] ? '✓' : '✗'}</span>)}</div>}
                    {(st === 'ready' || st === 'published') && <p className="mt-1.5 text-[11px] text-mu">{DISCLAIMER}</p>}
                    {st === 'published' && s.keyword && <span className="tag t-em mt-1.5">{s.leads_count} {L('leads via', 'लीड्स')} “{s.keyword}”</span>}
                  </button>
                    {st === 'requested' && s.patient_id && <button onClick={() => go(`p/${s.patient_id}/messages`)} className="mt-1 text-xs font-semibold text-emerald" style={{ minHeight: 28 }}>{L('Send reminder →', 'आठवण पाठवा →')}</button>}
                  </li>
                ))}
                {col.length === 0 && <li className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-mu">—</li>}
              </ul>
            </section>
          )
        })}
      </div>
      {all.length === 0 && <Dc><p className="text-mu">{L('No stories yet. Testimonial requests appear here automatically at Week 4 · 8 · 12 (from the Today queue).', 'अजून कथा नाहीत. आठवडा 4 · 8 · 12 ला विनंत्या आपोआप इथे येतील.')}</p></Dc>}
      {open && <StoryForm s={open} onClose={() => setOpen(null)} onSaved={q.reload} />}
    </div>
  )
}

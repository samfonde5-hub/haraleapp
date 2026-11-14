import { useState } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Dc, PageHead, Spinner, useL } from './ui'

export default function DSettings({ onChange }: { onChange: () => void }) {
  const L = useL()
  const toast = useToast()
  const { profile, signOut, setProfileLocal } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [busy, setBusy] = useState(false)
  async function saveName() {
    setBusy(true)
    const v = name.trim().slice(0, 120) || null
    const { error } = await supabase.from('profiles').update({ full_name: v }).eq('id', profile!.id)
    setBusy(false)
    if (!error) setProfileLocal({ full_name: v })
    toast(error ? L('Failed', 'झालं नाही') : L('Saved ✓', 'सेव्ह ✓'), !error)
  }
  async function clearDemo() {
    if (!window.confirm(L('Remove ALL demo patients, leads, appointments and stories? Real data is not touched.', 'सर्व DEMO पेशंट्स, लीड्स, भेटी व कथा काढायच्या? खरा डेटा सुरक्षित राहील.'))) return
    const { error } = await supabase.rpc('doctor_clear_demo')
    toast(error ? L('Only the doctor can do this.', 'फक्त डॉक्टर हे करू शकतात.') : L('Demo data removed ✓', 'डेमो डेटा काढला ✓'), !error)
    onChange()
  }
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <PageHead title={L('Profile & settings', 'प्रोफाइल व सेटिंग्ज')} sub={profile?.email ?? ''} />
      <Dc>
        <label className="dlabel">{L('Display name', 'नाव')}<div className="mt-1 flex gap-2"><input className="dfield" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. C. Harale" />
          <button onClick={saveName} disabled={busy} className="dbtn e shrink-0">{busy ? <Spinner /> : L('Save', 'सेव्ह')}</button></div></label>
        <p className="mt-3 text-sm text-mu">{L('Role', 'भूमिका')}: <b className="text-ink">{profile?.role === 'doctor' ? L('Doctor · Admin', 'डॉक्टर · ॲडमिन') : L('Staff', 'स्टाफ')}</b></p>
      </Dc>
      {profile?.role === 'doctor' && (
        <Dc>
          <h2 className="font-display text-lg font-bold">{L('Demo data', 'डेमो डेटा')}</h2>
          <p className="mt-1 text-sm text-mu">{L('Sample patients/leads marked “Demo” are only for showing the system. Remove them before real use.', '“Demo” लिहिलेले नमुने फक्त दाखवण्यासाठी. खऱ्या वापरापूर्वी काढा.')}</p>
          <button onClick={clearDemo} className="dbtn g mt-3 text-red">{L('Remove demo data', 'डेमो डेटा काढा')}</button>
        </Dc>
      )}
      <button onClick={signOut} className="dbtn g">{L('Sign out', 'बाहेर पडा')}</button>
    </div>
  )
}

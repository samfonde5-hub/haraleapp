import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { patientMr, patientEn } from './locales/patient'
import { doctorMr, doctorEn } from './locales/doctor'

export const LANGS = [
  { code: 'mr', label: 'मराठी' },
  { code: 'en', label: 'English' },
] as const

const resources = {
  mr: { p: patientMr, d: doctorMr, t: {
    tagline: 'डॉ. हराळे यांची रोजची साथ',
    welcome: 'नमस्कार! 🙏',
    sub: 'तुमचं वजन, तुमची सवय, आणि डॉक्टरांचं रोजचं मार्गदर्शन — एकाच ॲपमध्ये.',
    status: 'सिस्टम तपासणी',
    db_ok: 'डेटाबेस जोडलेला आहे',
    db_bad: 'डेटाबेसशी संपर्क होत नाही',
    checking: 'तपासत आहे…',
    phase: 'Phase 0 · पाया तयार',
    lang: 'भाषा',
    wait: 'थांबा…',
    signout: 'बाहेर पडा',
    login: {
      title: 'लॉगिन करा',
      sub: 'तुमच्या ईमेलवर लॉगिन लिंक पाठवू. पासवर्ड लक्षात ठेवायची गरज नाही.',
      email: 'तुमचा ईमेल',
      send: 'लॉगिन लिंक पाठवा',
      sent_to: 'लिंक पाठवली आहे:',
      link_hint: '📩 ईमेल उघडा आणि “Sign in” लिंकवर क्लिक करा — तुम्ही आपोआप लॉगिन व्हाल. ईमेलमध्ये कोड असल्यास तो खाली टाका.',
      code: 'ईमेलमधला कोड टाका',
      verify: 'पुढे जा',
      change_email: 'ईमेल बदला',
      bad_email: 'कृपया योग्य ईमेल टाका.',
      bad_code: 'कृपया पूर्ण कोड टाका.',
      wrong_code: 'कोड चुकीचा आहे किंवा कालबाह्य झाला. पुन्हा प्रयत्न करा.',
      send_fail: 'कोड पाठवता आला नाही. थोड्या वेळाने पुन्हा प्रयत्न करा.',
      too_many: 'आत्ता ईमेल पाठवण्याची मर्यादा संपली आहे. आधी आलेला लिंक वापरा, किंवा सुमारे 1 तासाने पुन्हा प्रयत्न करा.',
      google: 'Google ने लॉगिन करा',
      link_expired: 'हा लॉगिन लिंक जुना झाला आहे. कृपया Google ने लॉगिन करा.',
      or_email: 'किंवा ईमेलने',
      already_sent: 'लिंक आधीच पाठवली आहे — ईमेल (Spam/Promotions सुद्धा) तपासा. नवीन लिंकची गरज नाही.',
      privacy: 'तुमची माहिती सुरक्षित आहे. फक्त तुम्ही आणि डॉक्टर ती पाहू शकतात.',
    },
    consent: {
      title: 'तुमची संमती',
      sub: 'तुमची माहिती कशी वापरायची, हे तुम्ही ठरवा. नंतर कधीही बदलू शकता.',
      required: 'आवश्यक',
      need_health: 'ॲप वापरण्यासाठी पहिली संमती आवश्यक आहे.',
      save: 'संमती द्या आणि पुढे जा',
      save_fail: 'सेव्ह झालं नाही. पुन्हा प्रयत्न करा.',
      change_later: 'प्रोफाइलमध्ये जाऊन कधीही बदलू शकता.',
      health_data: { title: 'आरोग्य माहिती', desc: 'वजन, ताटाचे फोटो, रिपोर्ट्स — फक्त डॉ. हराळे आणि त्यांच्या टीमसाठी.' },
      ai_drafts: { title: 'AI मदत', desc: 'AI तुमच्या प्लॅनचा मसुदा बनवेल, पण डॉक्टर तपासल्याशिवाय तुमच्यापर्यंत काहीही येणार नाही.' },
      reminders: { title: 'आठवण (Reminders)', desc: 'चेक-इन आणि भेटीची आठवण. रात्री 9 ते सकाळी 7 काहीही नाही.' },
      story: { title: 'तुमची गोष्ट शेअर करणे', desc: 'नाव लपवून तुमचा प्रवास इतरांना प्रेरणा म्हणून दाखवणे. पूर्णपणे ऐच्छिक.' },
    },
    patient: { hello: 'स्वागत आहे! 🙏', soon: 'तुमचं प्रोफाइल डॉक्टर लवकरच सुरू करतील. पुढच्या टप्प्यात इथे तुमचा रोजचा प्लॅन दिसेल.' },
    doctor: { hello: 'नमस्कार डॉक्टर 🙏', soon: 'तुमचा डॅशबोर्ड तयार होत आहे. पुढच्या टप्प्यात इथे आजचे पेशंट्स दिसतील.' },
  } },
  en: { p: patientEn, d: doctorEn, t: {
    tagline: "Dr. Harale's daily support",
    welcome: 'Hello! 🙏',
    sub: "Your weight, your habits and the doctor's daily guidance — in one app.",
    status: 'System check',
    db_ok: 'Database connected',
    db_bad: 'Cannot reach database',
    checking: 'Checking…',
    phase: 'Phase 0 · Foundation ready',
    lang: 'Language',
    wait: 'Please wait…',
    signout: 'Sign out',
    login: {
      title: 'Log in',
      sub: "We'll email you a login link. No password to remember.",
      email: 'Your email',
      send: 'Send login link',
      sent_to: 'Link sent to:',
      link_hint: '📩 Open the email and tap the “Sign in” link — you will be logged in automatically. If the email has a code, enter it below.',
      code: 'Enter the code from your email',
      verify: 'Continue',
      change_email: 'Change email',
      bad_email: 'Please enter a valid email.',
      bad_code: 'Please enter the full code.',
      wrong_code: 'The code is wrong or expired. Please try again.',
      send_fail: 'Could not send the code. Please try again shortly.',
      too_many: 'The email limit is reached for now. Use the link already sent, or try again in about 1 hour.',
      google: 'Continue with Google',
      link_expired: 'This login link has expired. Please continue with Google.',
      or_email: 'or with email',
      already_sent: 'A link was already sent — check your email (also Spam/Promotions). No need for a new one.',
      privacy: 'Your information is safe. Only you and the doctor can see it.',
    },
    consent: {
      title: 'Your consent',
      sub: 'You decide how your information is used. You can change this anytime.',
      required: 'Required',
      need_health: 'The first consent is required to use the app.',
      save: 'Agree and continue',
      save_fail: 'Could not save. Please try again.',
      change_later: 'You can change this anytime from your profile.',
      health_data: { title: 'Health information', desc: "Weight, plate photos, reports — only for Dr. Harale and his team." },
      ai_drafts: { title: 'AI help', desc: 'AI drafts your plan, but nothing reaches you until the doctor checks it.' },
      reminders: { title: 'Reminders', desc: 'Check-in and appointment reminders. Nothing between 9 PM and 7 AM.' },
      story: { title: 'Share your story', desc: 'Show your journey to inspire others, with your name hidden. Fully optional.' },
    },
    patient: { hello: 'Welcome! 🙏', soon: 'The doctor will activate your profile soon. Your daily plan will appear here in the next phase.' },
    doctor: { hello: 'Hello Doctor 🙏', soon: "Your dashboard is being built. Today's patients will appear here in the next phase." },
  } },
}

let saved = 'mr'
try { saved = localStorage.getItem('lang') || 'mr' } catch { /* private mode */ }
// Sirf 2 bhasha: Marathi (default) + English. Purana 'hi' save ho to Marathi.
if (saved !== 'mr' && saved !== 'en') saved = 'mr'

i18n.use(initReactI18next).init({
  resources,
  lng: saved,
  fallbackLng: 'mr',
  supportedLngs: ['mr', 'en'],
  defaultNS: 't',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (l) => {
  document.documentElement.lang = l
  try { localStorage.setItem('lang', l) } catch { /* ignore */ }
})

export default i18n

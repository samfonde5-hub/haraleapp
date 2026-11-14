import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const LANGS = [
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
] as const

const resources = {
  mr: { t: {
    tagline: 'डॉ. हराळे यांची रोजची साथ',
    welcome: 'नमस्कार! 🙏',
    sub: 'तुमचं वजन, तुमची सवय, आणि डॉक्टरांचं रोजचं मार्गदर्शन — एकाच ॲपमध्ये.',
    status: 'सिस्टम तपासणी',
    db_ok: 'डेटाबेस जोडलेला आहे',
    db_bad: 'डेटाबेसशी संपर्क होत नाही',
    checking: 'तपासत आहे…',
    phase: 'Phase 0 · पाया तयार',
    lang: 'भाषा',
  } },
  hi: { t: {
    tagline: 'डॉ. हराळे का रोज़ का साथ',
    welcome: 'नमस्ते! 🙏',
    sub: 'आपका वज़न, आपकी आदतें और डॉक्टर का रोज़ का मार्गदर्शन — एक ही ऐप में।',
    status: 'सिस्टम जाँच',
    db_ok: 'डेटाबेस जुड़ा हुआ है',
    db_bad: 'डेटाबेस से संपर्क नहीं हो रहा',
    checking: 'जाँच रहे हैं…',
    phase: 'Phase 0 · नींव तैयार',
    lang: 'भाषा',
  } },
  en: { t: {
    tagline: "Dr. Harale's daily support",
    welcome: 'Hello! 🙏',
    sub: "Your weight, your habits and the doctor's daily guidance — in one app.",
    status: 'System check',
    db_ok: 'Database connected',
    db_bad: 'Cannot reach database',
    checking: 'Checking…',
    phase: 'Phase 0 · Foundation ready',
    lang: 'Language',
  } },
}

let saved = 'mr'
try { saved = localStorage.getItem('lang') || 'mr' } catch { /* private mode */ }

i18n.use(initReactI18next).init({
  resources,
  lng: saved,
  fallbackLng: 'mr',
  defaultNS: 't',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (l) => {
  document.documentElement.lang = l
  try { localStorage.setItem('lang', l) } catch { /* ignore */ }
})

export default i18n

# Chinmay Wellness System — Product Requirements Document (PRD)

**Product:** Chinmay Wellness — Landing page + Patient app + Doctor/Admin app
**Client:** Dr. Chandrashekhar Harale, Chinmay Wellness Club, Kolhapur
**Built by:** Sam Fonde (with Claude as build partner)
**Version:** v1.1 · 14 Nov 2026 (v1.1: backend secrets → Supabase Edge Functions, Adobe asset pipeline, actual accounts)
**Status:** Draft. Sam approves this first, then build starts phase by phase.

> **How to read this PRD.** Every section has a **"Mentor note"** in simple Hinglish: kya bana rahe hain, kyun, aur kaise. Ye notes tumhare learning ke liye hain, taaki next project me tum khud system design kar sako.

---

## 0. Ek line me product

**"Dr. Harale ki roz ki personal guidance, ab har patient ke phone me. Doctor ka time bachaye, patient ko kabhi akela mehsoos na ho."**

The system has 3 parts that share **one database**:

| Part | Kaun use karega | Kahan chalega |
|---|---|---|
| **Landing page** | Naye log (Instagram ads, reels se aaye) | `chinmaywellnessclub.in` ya subdomain, fast static site |
| **Patient app** | Enrolled patients | PWA, browser + **Google Play Store** (same code) |
| **Doctor/Admin app** | Dr. Harale + staff | Same app, doctor login pe alag screens (laptop + phone) |

> **Mentor note — "one database, three faces":** Teen alag apps banane se teen jagah data hota aur sync ka jhanjhat hota. Isliye ek hi database (Supabase) hai, aur teen "chehre" (UI) hain. Patient jo check-in karta hai, wo doctor ko turant dikhta hai, kyunki dono ek hi table padh rahe hain. Big companies bhi yahi pattern use karti hain.

---

## 1. Problem → Solution (kyun bana rahe hain)

| Abhi ki problem (offline practice) | System ka solution |
|---|---|
| Doctor 100+ members ko roz manually WhatsApp pe follow-up karte hain, bahut time jaata hai | Auto check-in reminders + 2-minute "Today" queue, jisme sirf jinko zaroorat hai wahi dikhte hain |
| Thali photos WhatsApp me kho jaate hain, track nahi hote | Photo check-in → AI tag (balanced / rice extra / low veg) → doctor ek click me reply |
| Har hafte har patient ka plan manually likhna | AI doctor ke **apne templates** se draft banata hai → doctor approve karta hai (~40 sec/plan) |
| Patient chupchaap program chhod deta hai, doctor ko late pata chalta hai | Retention radar: risk pehle hi dikhta hai (missed check-ins, mood dip) |
| Ads se aaye leads ka hisaab nahi rehta | Leads pipeline + keyword tracking: kaunsi reel se client aaya |
| Reports (blood test etc.) kahin bhi pade rehte hain | Patient profile me reports + AI summary = "medical memory" (doctor verified) |
| Elderly patients ko padhne/likhne me dikkat | Voice notes (bolo → text), plan read-aloud (text → awaaz), Marathi-first UI |

**Business goal (client ke words):** "Weight ka naam aaye to sirf Dr. Harale ka naam aur chehra yaad aaye." App is brand ka daily touchpoint hai.

---

## 2. Users & roles

| Role | Kaun | Kya kar sakta hai |
|---|---|---|
| `patient` | Enrolled member | Apna data dekhna/likhna, check-in, plan, messages, booking |
| `doctor` | Dr. Harale | Sab kuch + plan approve + AI settings + reports |
| `staff` | Assistant/receptionist (optional) | Leads, appointments, messages; **medical notes aur plan approve nahi** |
| `lead` | Landing page visitor (login nahi) | Form/voice intake bhejna, challenge join karna |
| `family_viewer` *(Phase 2)* | Patient ka beta/beti | Parent ki progress dekhna (patient ki consent se) |

> **Mentor note — Roles kyun?** Isko **RBAC (Role-Based Access Control)** kehte hain. Har user ka ek role hota hai, aur database khud check karta hai ki wo kya dekh sakta hai. Agar staff ko medical notes dikhne lage to wo privacy breach hai. Ye rule hum code me nahi, **database ke andar** likhenge (RLS, section 8), taaki koi bug bhi data leak na kar sake.

---

## 3. Scope — kya banega (prototype se better)

✅ = prototype me tha · ⭐ = naya, value badhane ke liye add kiya

### 3.1 Landing page

| # | Feature | Detail |
|---|---|---|
| L1 | ✅ Hero + doctor ki story | Doctor ka real photo, "95 → 83 kg" story, disclaimer |
| L2 | ✅ Language switch | मराठी / English (sirf 2 bhasha, Marathi default), choice yaad rahegi |
| L3 | ✅ Doctor horizontal video | YouTube unlisted embed (free hosting, fast), "click to play" (page heavy nahi hoga) |
| L4 | ✅ Testimonial reels (vertical) | Sirf consent wale, disclaimer ke saath |
| L5 | ✅ Voice intake | Doctor ka voice note play → visitor apni problem **bolke** batata hai → text banta hai → lead create |
| L6 | ✅ 7-day FREE challenge form | Naam, phone, age, goal, 4 qualifying questions |
| L7 | ✅ App ka mention | "Join karne ke baad aapko milega" + app screenshots |
| L8 | ⭐ Sticky "Call / WhatsApp" bar | Mobile pe hamesha neeche, `tel:` aur `wa.me` links (ads ke calls yahin se) |
| L9 | ⭐ UTM + keyword tracking | Kaunsi ad/reel se aaya, ye lead ke saath save hoga (D2 aur D11 me dikhega) |
| L10 | ⭐ Meta Pixel + Conversions events | `Lead`, `Contact` events, taaki ads optimize ho sakein |
| L11 | ⭐ SEO + speed | Lighthouse 90+, Marathi meta tags, Google Business link |
| L12 | ⭐ Legal pages | Privacy policy, Terms, Medical disclaimer, Account deletion page (Play Store ke liye zaroori) |

### 3.2 Patient app (P-screens)

| # | Screen | Feature |
|---|---|---|
| P1 | ✅ आज (Today) | Greeting, week/day counter, aaj ka kaam, doctor ka voice message, streak, aaj ka thali plan |
| P2 | ✅ चेक-इन | Thali photo (auto-compress), weight, water, steps, mood, **30 sec me poora** |
| P3 | ✅ प्रगती | Weight graph, waist, check-in %, doctor ki weekly note, next appointment |
| P4 | ✅ Login | Phase 1: **Google one-tap + Email OTP**. Phase 2: WhatsApp OTP (API live hone pe) |
| P5 | ✅ संमती (Consent) | Granular toggles: health data, AI drafts, reminders, story use, kabhi bhi change |
| P6 | ✅ प्लॅन | Doctor-approved weekly plan, day tabs, "एकच लक्ष्य", workout, "बदल सुचवा" |
| P7 | ✅ संदेश | Doctor se chat, **voice notes** (auto transcript), plan updates inline |
| P8 | ✅ भेट बुक करा | Clinic / video, slot picker, auto reminders |
| P9 | ✅ Maintenance membership | Week 12 ke baad offer (price client confirm kare) |
| P10 | ⭐ मी (Profile) | Language, notification settings, privacy, data download, **account delete** |
| P11 | ⭐ Read-aloud 🔊 | Plan aur doctor ke messages **sunne** ka button (Marathi TTS), elderly ke liye |
| P12 | ⭐ Offline check-in | Net nahi hai? Check-in save hoga, net aate hi khud upload ho jaayega |
| P13 | ⭐ Reports upload | Patient khud blood report ki photo/PDF daal sake → doctor ke paas jaaye |
| P14 | ⭐ Weekly win card | Har Sunday ek sundar card ("is hafte −0.6 kg, 6/7 check-ins"). Share karna optional, naam chhupa ke. Free marketing |
| P15 | ⭐ Festival / wedding mode | "Lagna aahe" button → us din ka flexible plan (doctor template se) |
| P16 | ⭐ Safety button | "मला बरं वाटत नाही" → AI jawab nahi deta, seedha doctor ko alert + emergency number |

### 3.3 Doctor/Admin app (D-screens)

| # | Screen | Feature |
|---|---|---|
| D1 | ✅ Today | KPIs, "Needs your attention" auto-queue, search, add lead |
| D2 | ✅ Leads pipeline | Kanban (New → Qualified → Consult booked → Joined), keyword source, voice intake transcript |
| D3 | ✅ Patient profile | Tabs: Overview, Check-ins, Plan, Notes, **Reports + AI memory**, Consents, Messages |
| D4 | ✅ AI plan approvals | Drafts list: Safe / Needs your eye / Doctor-only, diff view, "Approve all safe" |
| D5 | ✅ Retention radar | Risk score + reason + suggested action (voice note / call) |
| D6 | ✅ AI plate review | Aaj ki saari thali photos, AI tags, "छान!" to all balanced (1 click) |
| D7 | ✅ Appointments | Weekly calendar, slot editor, first consult / review / video |
| D8 | ✅ Plans & food library | Doctor ke templates + foods list = **AI ke rules** |
| D9 | ✅ Automations | Har automation ON/OFF, last run, count |
| D10 | ✅ Proof & stories | Testimonial requests, consent status, auto disclaimer |
| D11 | ✅ Monthly report | Inquiries, joins, retention, keyword → client attribution, PDF download |
| D12 | ⭐ Doctor voice studio | Ek baar voice note record karke bahut patients ko bhejo (personal feel, kam time) |
| D13 | ⭐ Staff management | Staff add/remove, unki permissions |
| D14 | ⭐ Audit log | Kisne kab kya dekha/badla (medical data ke liye zaroori) |
| D15 | ⭐ Daily 7 AM digest | Doctor ko email/WhatsApp: "aaj 6 log dhyan maangte hain, 3 consults hain" |

### 3.4 Out of scope (v1 me nahi, baad me)

- Online payment (Razorpay): Phase 2. Abhi payment offline/UPI, doctor app me "paid" mark karega.
- Family viewer account: Phase 2.
- iPhone App Store: abhi nahi. iPhone users PWA "Add to Home Screen" se use karenge.
- Video call khud banana: nahi. Google Meet link auto-generate/attach hoga.
- WhatsApp Business API live: jab Meta verification ho jaaye, tab switch ON.

> **Mentor note — Scope kyun likhte hain?** "Out of scope" likhna utna hi zaroori hai jitna scope. Isse client baad me "ye bhi to bola tha" nahi keh sakta, aur tum ek baar me sab banane ke chakkar me project late nahi karte. **New features = chargeable**, ye quotation me bhi likha hai.

---

## 4. System design (architecture)

```
                         ┌────────────────────────────┐
  Visitor (Instagram) ──▶│  Landing page (static)     │── form / voice ──┐
                         │  Cloudflare Pages          │                  │
                         └────────────────────────────┘                  ▼
                         ┌────────────────────────────┐        ┌──────────────────┐
  Patient (phone/PWA/ ──▶│  App (React PWA)           │◀──────▶│  Supabase         │
  Play Store TWA)        │  patient + doctor screens  │  RLS   │  • Postgres DB    │
  Doctor (laptop) ──────▶│  Cloudflare Pages          │        │  • Auth (login)   │
                         └─────────────┬──────────────┘        │  • Storage (files)│
                                       │ secret work            │  • Realtime chat  │
                                       ▼                        └────────▲─────────┘
                         ┌────────────────────────────┐                 │
                         │  API: Supabase Edge        │── service key ──┘
                         │  Functions (Deno)          │
                         │  • AI calls (Gemini)       │──▶ Google Gemini (vision, text, TTS)
                         │  • Voice → text            │──▶ Workers AI Whisper / Gemini
                         │  • Email                   │──▶ Resend
                         │  • WhatsApp                │──▶ Meta Cloud API (test → live)
                         │  • Push notifications      │──▶ Web Push (free, VAPID)
                         └─────────────▲──────────────┘
                                       │
                         ┌─────────────┴──────────────┐
                         │  Scheduler: Supabase       │  7 AM digest · 8 PM missed check-in
                         │  pg_cron → Edge Functions  │  Sunday AI plan drafts · reminders
                         └────────────────────────────┘
```

### 4.1 Tech stack (final, free-tier friendly)

| Layer | Choice | Kyun ye |
|---|---|---|
| Frontend (app) | **React + Vite + TypeScript**, Tailwind CSS | Fast, simple, PWA-ready, TS se bugs kam |
| Frontend (landing) | **Astro** (static) | Bahut fast page load = ads ka cost kam, SEO achha |
| UI language | i18n (mr / en — **Hindi nahi**) via `i18next` | Ek click me language badle |
| PWA | `vite-plugin-pwa` (service worker) | Offline, install, push notifications |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + Realtime) | Login, database, files, live chat ek jagah, free |
| Server logic | **Supabase Edge Functions** (500k calls/month free) | API keys browser me kabhi nahi jaati; secrets Supabase vault me, kisi ko paste nahi karne padte |
| Scheduler | **Supabase pg_cron + pg_net** → Edge Functions | Daily/weekly automations free me, database ke paas hi |
| AI | **Google Gemini Flash** (vision + text + TTS) | Marathi samajhta hai, thali photo samajhta hai, sasta |
| Voice → text | **Gemini** (audio input), fallback Workers AI Whisper | Marathi + Marathi-English mix samajhta hai |
| Email | **Resend** | OTP, digests, reports |
| Hosting | **Cloudflare Pages** | Free commercial use, unlimited traffic |
| Code | **GitHub** (private repo) | Version history, auto-deploy |
| Android | **TWA via Bubblewrap/PWABuilder** | Wahi PWA Play Store pe, alag Android code nahi |
| Monitoring | Sentry free + Supabase logs | Error aaye to turant pata chale |

> **Mentor note — Next.js ki jagah Vite kyun?** Purani website Next.js me thi. Next.js server pe chalta hai, aur Cloudflare pe use chalane ke liye extra adapter lagta hai. Hamara app ek **SPA** hai (ek page jo khud screens badalta hai), jisme login ke baad SEO ki zaroorat nahi. Isliye Vite + React simple, fast aur 100% free hai. Landing page ke liye Astro, kyunki wahan SEO aur speed sabse zaroori hai.

> **Mentor note — "Frontend kabhi secret nahi rakhta":** Browser me jo code chalta hai, use koi bhi "View source" karke padh sakta hai. Isliye Gemini key, Resend key, WhatsApp token **sirf server (Supabase Edge Functions)** pe rahenge. Browser server ko bolta hai "is photo ko analyse karo", aur server key lagake Gemini ko call karta hai. Isko **BFF (Backend-for-Frontend)** pattern kehte hain.

> **Mentor note — v1.1 me backend Cloudflare se Supabase pe kyun shift kiya?** Cloudflare Functions me Gemini/Resend keys daalne ke liye tumhe har key dashboard me khud paste karni padti, ya keys chat me aati. Supabase Edge Functions ke secrets main seedha Supabase connector se set kar sakta hoon, to keys kabhi chat/WhatsApp me nahi ghoomti. Scheduler (pg_cron) bhi database ke andar hi hai. **Cloudflare ab sirf static hosting karega** (landing + app files), jo uska sabse strong aur free kaam hai. Ek kam moving part = kam galtiyan.

### 4.2 Domains

| Kya | Domain | Note |
|---|---|---|
| Development | `chinmay-app.pages.dev` | Cloudflare ka free temporary domain |
| App (production) | `app.chinmaywellnessclub.in` | Client ka existing domain, sirf ek **CNAME record** Hostinger DNS me |
| Landing | `chinmaywellnessclub.in` (ya `start.` subdomain) | **Decision needed:** purani Next.js site replace karni hai ya nahi |
| Email sender | `hello@chinmaywellnessclub.in` | Resend me domain verify |

> **Mentor note — Naya domain kharidna zaroori nahi.** Client ke paas `chinmaywellnessclub.in` pehle se hai. Subdomain (`app.`) free hota hai, bas DNS me ek line add karni hai. Play Store app isi domain se bandhega, isliye **Play Store se pehle `app.` subdomain final hona chahiye**.

### 4.3 Repo structure (monorepo)

```
chinmay/
├── apps/
│   ├── landing/        # Astro site
│   └── app/            # React PWA (patient + doctor)
│       ├── src/patient/   # P-screens
│       ├── src/doctor/    # D-screens
│       ├── src/shared/    # UI components, i18n, hooks
│       └── public/        # icons, manifest, assetlinks.json
├── supabase/functions/ # Edge Functions (AI, email, WhatsApp, push, cron jobs)
├── supabase/
│   ├── migrations/     # database tables + RLS (version-controlled)
│   └── seed.sql        # demo data
├── android/            # TWA config (Bubblewrap)
└── docs/               # PRD, runbooks, privacy policy
```

> **Mentor note — Migrations kya hain?** Database me table banana bhi "code" hai. Har change ek file me likhte hain (`001_create_patients.sql`), taaki kal naya database bane to ek command se sab same ho jaaye. Ye tumhare database ka git history hai.

---

## 5. Database design

### 5.1 Tables

| Table | Main columns | Purpose |
|---|---|---|
| `profiles` | id (= auth user), role, full_name, phone, email, lang, created_at | Har login user |
| `patients` | id, profile_id, dob, gender, city, height_cm, start_weight, target_weight, program (`12w`/`maintenance`), start_date, status (`active`/`paused`/`completed`/`dropped`), conditions_flag (diabetes/thyroid/PCOD/BP), doctor_only (bool) | Patient ka medical-program record |
| `consents` | patient_id, type (health_data / ai_drafts / reminders / story), granted (bool), at, version | Consent ka **history** (DPDP proof) |
| `leads` | id, name, phone, age, goal, answers (json), source (keyword/utm/ref), voice_url, transcript, ai_summary, stage, owner, created_at | Landing/Instagram leads |
| `checkins` | id, patient_id, date, meal (`breakfast`/`lunch`/`dinner`), photo_path, ai_tag, ai_items (json), ai_confidence, weight, water_glasses, steps, mood, note_text, note_voice_path, doctor_reaction | Daily check-ins |
| `measurements` | patient_id, date, weight, waist, hip | Weekly measurements |
| `plan_templates` | id, name, type (`diet`/`workout`), kcal, body (json), created_by | Doctor ke rules |
| `foods` | id, name_mr, name_en, category, portion, kcal_approx, tags | Kolhapuri food library |
| `plans` | id, patient_id, week_no, template_id, body (json), focus_goal, status (`draft`/`approved`/`sent`), risk_level (`safe`/`review`/`doctor_only`), ai_reason, approved_by, approved_at | Weekly plans |
| `threads` / `messages` | thread_id, sender_id, kind (`text`/`voice`/`plan_update`/`plate_reply`), body, audio_path, transcript, read_at | Chat |
| `appointment_slots` | date, start, end, mode (clinic/video), capacity | Doctor ki availability |
| `appointments` | id, patient_id / lead_id, slot_id, type (first_consult/review/maintenance), status, meet_link, paid (bool), amount | Booking |
| `reports` | id, patient_id, file_path, kind (blood/thyroid/other), report_date, uploaded_by | Medical reports |
| `medical_memory` | patient_id, summary (json: conditions, meds, key lab values, allergies), source_report_ids, verified_by_doctor (bool), version | AI ki "yaaddasht", **doctor verify karega** |
| `risk_scores` | patient_id, date, score, reasons (json), action_taken | Retention radar |
| `testimonials` | patient_id, type (text/audio/video/photo), content_path, quote, consent (json), status | Proof & stories |
| `automations` | key, enabled, last_run, run_count, config (json) | D9 switches |
| `notifications` | id, to_profile, channel (push/email/whatsapp), template, status, sent_at, error | Kya bheja, delivered ya nahi |
| `push_subscriptions` | profile_id, endpoint, keys | Web push |
| `audit_log` | actor_id, action, table, row_id, at, ip | Security trail |

### 5.2 Storage buckets (sab **private**)

| Bucket | Content | Access |
|---|---|---|
| `plates` | Thali photos (client-side compress ~100 KB) | Patient (own) + doctor/staff |
| `voice` | Voice notes | Thread members |
| `reports` | Medical reports | Patient (own) + doctor only (**staff nahi**) |
| `stories` | Consent wale testimonials | Doctor + staff |
| `public-assets` | Landing images, logos | Public |

Files ka link **signed URL** se milega, jo 1 ghante me expire ho jaata hai.

> **Mentor note — Signed URL:** Agar photo ka permanent public link ho, to wo WhatsApp pe forward hoke kisi ke bhi haath lag sakta hai. Signed URL ek "temporary entry pass" hai, jo 1 ghante baad bekaar ho jaata hai. Medical photos ke liye ye must hai.

> **Mentor note — Storage limit ka jugad:** Supabase free me 1 GB storage hai. 100 patients × 3 photos × 100 KB × 365 din ≈ 11 GB/saal hota hai, to ye bharega. Plan: (1) photo upload se pehle phone pe hi compress, (2) 90 din purani thali photos ka sirf thumbnail rakho, (3) client ka card milte hi Cloudflare R2 (10 GB free) pe shift. Code me storage ek hi file (`storage.ts`) me hai, isliye shift karna aasaan hai.

---

## 6. Key flows (step-by-step)

### 6.1 Lead → Patient (sabse important business flow)

1. Visitor Instagram reel/ad se landing page pe aata hai (UTM/keyword save).
2. Doctor ka 20 sec voice note sunta hai → apni problem **bolta** hai ya form bharta hai.
3. Voice → text (Whisper) → Gemini 3-line summary → `leads` table me.
4. Doctor/staff ko notification. Lead ko instant thank-you (email/WhatsApp test mode).
5. Lead 4 questions answer karta hai → "Qualified" → slot booking link.
6. First consult → doctor "Convert to patient" dabata hai → invite link.
7. Patient login (Google / email OTP) → consent screen → app ready.

### 6.2 Daily check-in loop

1. 8 AM push: "आजचं ताट दाखवा 🍽️"
2. Patient photo leta hai → phone pe compress → upload → `checkins` row.
3. Server Gemini vision ko bhejta hai → JSON: items, tag, confidence.
4. Doctor ke D6 me photo + tag aata hai. "Send छान! to all balanced" (1 click) ya personal reply.
5. 8 PM tak check-in nahi hua → ek gentle nudge (max 1/day, **spam nahi**).

### 6.3 Weekly AI plan (doctor-in-the-loop)

1. Sunday 6 AM cron: har active patient ke liye last week ka data (check-ins, weight trend, mood, doctor notes, medical memory).
2. Gemini ko prompt: **sirf doctor ke template + food library se** next week ka draft. Output strict JSON.
3. Rules engine risk level lagata hai:
   - `doctor_only`: diabetes/BP/thyroid/medication flag, ya pregnancy.
   - `review`: plateau, weight change > 1.5 kg/week, mood dip.
   - `safe`: baaki sab.
4. Doctor D4 me diff dekhta hai → Approve / Edit / Reject.
5. Approved → patient ko push + chat me "Plan update".
6. **Koi bhi AI plan bina doctor approval ke patient tak nahi jaata.** (Hard rule)

### 6.4 Reports → Medical memory

1. Doctor ya patient report upload karta hai (photo/PDF).
2. Gemini values extract karta hai (HbA1c, TSH, lipid profile etc.) → structured JSON.
3. Doctor "Verify" karta hai, uske baad hi `medical_memory` me jaata hai.
4. Aage har AI draft is memory ko padhta hai (jaise "TSH high hai → plan doctor_only").

### 6.5 Retention radar (rule-based, AI nahi)

Score (0–100) = missed check-ins + mood dips + unread messages + weight stall + missed appointment. Har subah 7 AM update. 70+ = High risk → doctor ko suggested action.

> **Mentor note — Har jagah AI nahi:** Retention score simple maths se ban sakta hai. Ye free hai, fast hai, aur doctor ko samajh aata hai ki score kyun aaya ("3 din check-in nahi"). AI wahan use karo jahan sach me zaroorat hai (photo samajhna, Marathi bolna, plan draft). Ise **"right tool for the job"** kehte hain.

---

## 7. AI design (safe + sasta)

| Feature | Model | Input → Output | Safety |
|---|---|---|---|
| Plate analysis | Gemini Flash (vision) | Photo → `{items[], tag, confidence}` | Confidence < 0.6 → "Unclear photo", doctor decide kare |
| Weekly plan draft | Gemini Flash (text) | Patient data + templates → plan JSON | Doctor approval mandatory, template ke bahar ka food reject |
| Voice → text | Gemini → fallback Workers AI Whisper | Audio → Marathi/English text | Original audio bhi saved |
| Text → voice | Gemini TTS | Plan/message → Marathi audio | Sirf approved content padha jaata hai |
| Report extraction | Gemini Flash (vision) | Report → lab values JSON | Doctor verify ke bina memory me nahi |
| Lead summary | Gemini Flash | Transcript → 3 lines | Internal only |
| Red-flag detection | Keyword rules + Gemini | Message → `urgent?` | Urgent → AI chup, doctor alert, emergency number dikhao |

**Rules:**
- Har AI output **JSON schema** se validate hoga, galat format aaye to retry ya doctor queue.
- Prompts me patient ka **naam/phone nahi** jaayega, sirf ID + zaroori data (data minimization).
- Gemini **paid tier** (billing ON, client ka card), kyunki free tier ka data review/training me use ho sakta hai. Patient data ke liye free tier nahi.
- Har AI call `ai_usage` me log hogi (cost track), aur per-patient daily limit rakhenge.
- Language: patient ki choice (mr/en) me output. **Hindi kahin nahi.**

**Estimated AI cost (100 patients):** ~3 photos/day + weekly plans + voice ≈ **₹300–800/month** (client ke card pe pass-through). Ise launch ke baad real usage se verify karenge.

---

## 8. Security & privacy (health data = sabse zaroori)

| # | Measure | Kaise |
|---|---|---|
| S1 | **Row Level Security (RLS)** har table pe | Patient sirf apni rows; staff ko reports/medical_memory nahi; doctor sab |
| S2 | Secrets server pe | Keys sirf Cloudflare env vars me, git me kabhi nahi (`.env` gitignored) |
| S3 | Private storage + signed URLs | Section 5.2 |
| S4 | Auth | Google + email OTP, session 30 din (patient), **doctor ke liye 2FA** + 12 ghante session |
| S5 | Input validation | Har API input `zod` se check; file type/size limit (photo 5 MB, PDF 10 MB) |
| S6 | Rate limiting | OTP: 5/hour/IP, AI: per-user daily cap, landing form: Cloudflare Turnstile (free captcha) |
| S7 | Audit log | Medical data dekhna/badalna log hoga |
| S8 | Consent (DPDP Act 2023) | Granular consent, version + time saved, withdraw anytime |
| S9 | Data rights | "Download my data" (JSON/PDF) + "Delete my account" (app + web page) |
| S10 | Notifications me health data nahi | Push/WhatsApp me sirf "Doctor ka message aaya", detail app ke andar |
| S11 | HTTPS + security headers | CSP, HSTS (Cloudflare) |
| S12 | Backups | Supabase free me automatic backup limited hai → **nightly `pg_dump` via GitHub Actions** (free) → encrypted file |
| S13 | Test mode lock | WhatsApp/SMS sirf whitelist numbers pe (Sam ka number) jab tak `MODE=live` na ho |
| S14 | Dependency safety | Dependabot alerts ON |

> **Mentor note — RLS kya hai, simple me:** Socho database ek building hai, aur har row ek kamra. RLS har darwaaze pe guard hai, jo pehle ID card check karta hai: "Tum Sunita ho? To sirf Sunita ka kamra khulega." Agar frontend me koi bug ho aur wo galti se sab patients maang le, tab bhi guard sirf apna data dega. Isliye health apps me RLS non-negotiable hai.

> **Mentor note — Purani galti mat dohrana:** Pehle chat me kai baar keys paste hui hain. Rule: **key kabhi chat/WhatsApp/code me nahi**, sirf dashboard ke "Environment variables" me. Galti se leak ho jaaye to turant "rotate" karo (nayi key banao, purani delete).

---

## 9. UX principles (smooth + user-friendly)

1. **Marathi-first**, bade fonts (min 16px, buttons 48px tall), high contrast. 50+ age group ke liye design.
2. **30-second rule:** roz ka check-in 30 sec se kam me.
3. **Ek screen = ek kaam.** Har screen pe ek bada primary button.
4. **Voice everywhere:** jahan typing hai, wahan 🎤 bhi.
5. **Kabhi shame nahi:** "Aaj miss hua? Koi baat nahi, kal phir." Red colour sirf safety ke liye.
6. **Fast on cheap phones:** first load < 2.5 sec on 4G, total JS < 200 KB, images WebP/AVIF, skeleton loaders.
7. **Offline-friendly:** check-in queue, last plan offline dikhe.
8. **Doctor UI = speed:** keyboard shortcuts, bulk actions, "2 minute me sab" ka feel.
9. **Accessibility:** screen reader labels, focus states, colour-blind safe tags (icon + text, sirf colour nahi).
10. **Consistency:** brand colours (Emerald #0F6B4C, Coral #FF7A50, Mint #B8F0D8), fonts Baloo 2 / Mukta / Poppins.

### 9.1 Image & asset plan (generic look avoid karne ke liye)

**Tool split:** Figma = realistic photo generation · **Adobe = polish + banners + fonts** · Client = real photos/videos.

| Asset | Source | Kahan use |
|---|---|---|
| Doctor photos (pheta wala, clinic) | **Client se real photos** → **Adobe Photoshop API: background remove + auto-tone** | Landing hero, app P1 doctor card, splash |
| Doctor horizontal video | Client record kare (1–2 min, landscape) → Adobe speech enhance (awaaz saaf) | Landing L3 |
| Testimonial reels | Real members, consent ke saath | Landing L4 |
| Doctor voice note (intake) | Client record kare, 20–30 sec → **Adobe Enhance Speech** | Landing L5, P1 voice card |
| Kolhapuri thali, bhakri, pithla, usal, poha photos | **Figma AI image generate** (realistic, top-view, natural light) → Adobe adjustments (brand-matched warm tone) → later real clinic photos se replace | Plan screens, food library, landing |
| Banners: landing hero, onboarding slides, festival/offer banners, weekly win card, Play Store feature graphic | **Adobe Express (HTML → editable Express design)** with **Adobe Fonts** (Baloo 2 + Mukta) | Landing, app onboarding, P14, store listing |
| Empty-state illustrations | Figma/Adobe vector (line style, brand colours) | "Abhi koi message nahi" etc. |
| App icon + splash | Logo → Adobe vectorize (crisp SVG) | PWA manifest, Play Store |
| Play Store screenshots (6) | Real app screens + Marathi captions, framed in Adobe Express | Store listing |
| UI micro-details (photo cards, gradients, depth) | Adobe-polished images + brand tokens | Har screen — "jaan" daalne ke liye |

**Rules:** Adobe Express designs sab editable rahenge taaki client/Sam baad me text badal sakein. Adobe/Figma generated images kabhi kisi patient ka "result" nahi dikhayenge.

> **Mentor note — Adobe kahan, Figma kahan?** Is environment me Adobe ka "naya photo generate karo" feature band hai, lekin editing (background hatana, tone theek karna, awaaz saaf karna), Adobe Fonts aur Express designs kaam karte hain. Isliye naya realistic photo Figma banata hai, aur Adobe use "finish" karta hai, jaise photographer photo kheenchta hai aur editor polish karta hai.
> ⚠️ Abhi is workspace se Adobe ke upload server (at.adobe.com) tak network block hai. Express link chahiye to claude.ai Settings → Capabilities me allow karna padega; tab tak final images yahin render hongi.

⚠️ Generated food images **sirf illustration** hain, kisi patient ke "result" ke roop me kabhi nahi.

---

## 10. Notifications matrix

| Event | Push | Email | WhatsApp (test→live) | Time |
|---|---|---|---|---|
| Morning check-in reminder | ✅ | – | ✅ (opt-in) | 8 AM |
| Missed check-in nudge | ✅ | – | ✅ max 1/day | 8 PM |
| Plan approved | ✅ | – | ✅ | On approve |
| Doctor message / voice | ✅ | – | – | Instant |
| Appointment reminder | ✅ | ✅ | ✅ | 24h + 2h before |
| Weekly win card | ✅ | – | – | Sunday 7 PM |
| Doctor daily digest | – | ✅ | ✅ | 7 AM |
| New lead | ✅ (doctor/staff) | ✅ | – | Instant |
| OTP | – | ✅ | Phase 2 | Instant |

Quiet hours: **9 PM – 7 AM koi notification nahi** (urgent safety alert chhodke).

---

## 11. Play Store readiness checklist

- [ ] Google Play Console account (client ke naam, $25 one-time). **Identity verification me din lagte hain, abhi start karo.**
- [ ] Naya personal account hai to **12 testers × 14 din closed testing** zaroori. 12–15 members/staff ki Gmail list ready rakho.
- [ ] TWA package: `in.chinmaywellnessclub.app`, Bubblewrap se build, signing key **safe jagah backup** (kho gayi to app update nahi hoga!)
- [ ] `/.well-known/assetlinks.json` on `app.chinmaywellnessclub.in` (Digital Asset Links)
- [ ] Privacy policy URL, Terms URL, **account deletion URL**
- [ ] Data safety form (kaunsa data, kyun, encrypted, deletable)
- [ ] Health apps declaration form
- [ ] Content rating questionnaire
- [ ] Target audience: 18+ only
- [ ] Store listing: icon 512×512, feature graphic 1024×500, 6 screenshots, Marathi + English description
- [ ] Medical disclaimer in-app + listing ("doctor ki salah ki jagah nahi...")
- [ ] Payments: v1 me app ke andar payment nahi. Phase 2 me Razorpay laane se pehle Play billing policy check karenge (clinic services vs digital content).

> **Mentor note — TWA kya hai?** Trusted Web Activity = tumhari website ko ek Android "frame" me wrap karke Play Store pe daalna. User ko lagta hai normal app hai (no browser bar), lekin andar wahi PWA chal raha hai. Fayda: ek code, do jagah. Website update karo, app khud update ho jaata hai, Play Store pe dobara submit nahi karna padta (sirf icon/permissions badalne pe).

---

## 12. Non-functional requirements

| Area | Target |
|---|---|
| Performance | LCP < 2.5s (4G), API p95 < 800 ms (AI calls < 8s with loader) |
| Availability | 99.5% (Cloudflare + Supabase) |
| Scale (v1) | 300 patients, 2,000 leads/month, free tier me |
| Browser support | Android Chrome 90+, iOS Safari 16.4+, desktop Chrome/Edge |
| Languages | mr (default), en — Hindi nahi (client decision, 14 Nov 2026) |
| Data retention | Plate photos: full 90 days, phir thumbnail; reports: program + 3 saal; deleted accounts: 30 din me purge |
| Observability | Sentry errors, uptime check (free), daily cron health email to Sam |

---

## 13. Cost table

| Service | Free limit | Kab paise lagenge | Kaun pay kare |
|---|---|---|---|
| Cloudflare Pages/Workers | Unlimited traffic, 1 lakh req/day | Bahut baad me | – |
| Supabase | 500 MB DB, 1 GB storage, 50k users | Storage bharne pe ya bada scale → Pro ~$25/mo | Client |
| Gemini | — | Paid tier from day 1 (privacy) ~₹300–800/mo | Client card |
| Workers AI | Daily free quota | Heavy voice use | Client |
| Resend | 3,000 emails/month | Zyada emails | Client |
| Domain | Existing | Renewal | Client |
| Play Console | $25 one-time | – | Client |
| WhatsApp Cloud API | Test number free; service replies free | Marketing/utility templates per message | Client |
| **Maintenance (Sam)** | — | **₹699/month** | Client |

**Third-party usage bills ₹699 me shaamil nahi hain, wo client ke card pe pass-through hain.** Ye quotation me bhi likhna hai.

---

## 14. Build plan (phases + approval gates)

Har step me Sam ka approval **pehle** liya jaayega: kya bana rahe hain, kyun, kaise.

| Phase | Kya banega | Output | Time (est.) |
|---|---|---|---|
| **0. Setup** | GitHub repo, Cloudflare Pages link, Supabase project, env vars, CI | Khaali app live on `pages.dev` | 1 din |
| **1. Foundation** | DB tables + RLS, auth (Google + email OTP), roles, i18n, design system | Login karke role-wise screen | 3–4 din |
| **2. Patient core** | P1 Today, P2 Check-in, P3 Progress, P5 Consent, P6 Plan, P10 Profile, offline | Patient roz use kar sake | 5–6 din |
| **3. Doctor core** | D1 Today, D3 Profile, D6 Plate review, D7 Appointments, D8 Library | Doctor manage kar sake | 5–6 din |
| **4. AI layer** | Plate AI, weekly drafts + D4, voice ↔ text, reports → memory, red-flags | AI features doctor-approved | 4–5 din |
| **5. Comms** | Chat + voice (P7), push, email, WhatsApp test mode, cron automations (D9), booking (P8) | Reminders automatic | 4 din |
| **6. Growth** | Landing page (Astro) + voice intake + leads (D2) + retention (D5) + stories (D10) + report (D11) | Ads → leads → patients | 5 din |
| **7. Hardening** | Security review, load test, backups, audit log, accessibility, Lighthouse | Production-ready | 3 din |
| **8. Launch** | Real domain, Play Store closed testing (14 din), pilot with 10 patients | Live 🚀 | 2 din + 14 din testing |

**Total:** ~5–6 hafte build + 2 hafte Play Store testing (dono saath chal sakte hain).

**Pilot rule:** Pehle sirf 5–10 patients ke saath 2 hafte chalayenge, phir sab 100+ members ko shift karenge.

---

## 15. Acceptance criteria (kab "done" maanenge)

- [ ] Patient 30 sec me check-in kar sake (photo + weight), 3G pe bhi
- [ ] Doctor 24 thali photos 3 minute me review kar sake
- [ ] AI plan **bina approval** patient tak jaana impossible (test se prove)
- [ ] Ek patient doosre patient ka data kisi bhi tarah na dekh sake (RLS test)
- [ ] Staff medical reports na dekh sake (RLS test)
- [ ] Language switch har screen pe kaam kare (mr/en)
- [ ] Account delete karne pe 30 din me data purge ho
- [ ] Test mode me WhatsApp sirf whitelist number pe jaaye
- [ ] Lighthouse: Performance 90+, Accessibility 95+
- [ ] Play Store closed testing pass

---

## 16. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Meta ads/content policy (before-after, kg claims) | Ads reject | Ad-safe creatives, disclaimer, no guarantees |
| AI galat thali/food pehchane | Patient confuse | Doctor review, confidence threshold, "AI estimate" label |
| Supabase free storage bhar jaaye | Uploads ruk jaayein | Compression + thumbnails + R2 plan + usage alert at 70% |
| Doctor ke paas approve karne ka time na ho | Plans late | "Approve all safe" + Sunday reminder + previous plan auto-continue (approved hi) |
| WhatsApp API delay | Reminders kam | Push + email fallback, wa.me links |
| Play Store rejection (health app) | Launch delay | Proper disclaimers, privacy, deletion, declarations; pehle closed testing |
| Signing key kho jaaye | App kabhi update na ho | 2 jagah encrypted backup (Sam + client) |
| Patients ko tech mushkil lage | Adoption kam | Marathi, voice, bade buttons, onboarding video (doctor ki awaaz me) |

---

## 17. Decisions needed (Sam / client)

1. **Landing domain:** purani Next.js site replace karein (`chinmaywellnessclub.in`) ya naya landing `start.` subdomain pe?
2. **Prices:** First consult ₹499 aur maintenance ₹999/month (prototype me the), ye confirm karo.
3. **Staff:** koi assistant use karega? Kitne log?
4. **Video consult:** Google Meet theek hai?
5. **Patient login:** Google + email OTP launch ke liye theek hai? (WhatsApp OTP Phase 2)
6. **Clinic timings** aur slots (prototype me 5–8 PM).

---

## 18. Setup status (14 Nov 2026)

| Service | Status | Note |
|---|---|---|
| GitHub `samfonde5-hub/haraleapp` | ✅ connected, empty | ⚠️ **Public hai → Private karna zaroori** (health app) |
| Supabase "harale app" | ✅ active | Region Singapore (ap-southeast-1) — theek hai, India se ~60 ms |
| Cloudflare | ✅ connected | Pages project Phase 0 me GitHub se link karna hai (dashboard click) |
| Vercel | ✅ connected | Production ke liye use nahi (Hobby = non-commercial). Sirf preview/testing ke liye optional |
| Resend | ✅ connected | Account me sirf dusre client ka domain hai → Chinmay emails **kabhi us domain se nahi**. Testing `onboarding@resend.dev` se (sirf Sam ke inbox tak) |
| Gemini key | ✅ mila | Supabase secret me jayegi. AI Studio me **billing ON** + key ko sirf "Generative Language API" tak restrict karna |
| Laptop | ✅ linked | Local preview ke liye ek folder chahiye (optional) |

**Abhi bhi chahiye:**
1. GitHub repo **Private** karo.
2. Google sign-in ke liye **OAuth Client ID + Secret** (Google Cloud, same project) — Phase 1 me step-by-step.
3. Gemini key pe billing ON hai ya nahi — confirm.
4. Client se: logos (PNG/SVG), doctor photos, voice note, program templates, clinic timings.
5. Meta developer app (WhatsApp test number) — Phase 5 se pehle.
6. Google Play Console — Phase 8 se pehle (client ke naam).

> **Laptop:** linked hai. Login, password aur payment wale steps tum khud karoge, main bataunga kahan click karna hai. Coding, database aur deploy main cloud se karunga (GitHub + Supabase connector).

---

## 19. Glossary (seekhne ke liye)

| Term | Matlab |
|---|---|
| **Frontend** | Jo screen pe dikhta hai (buttons, forms) |
| **Backend** | Server pe chalne wala code (AI call, email, secret kaam) |
| **Database** | Data ki almari (tables = drawers) |
| **API** | Frontend aur backend ke beech ki "khidki", jahan request aur jawab aate-jaate hain |
| **PWA** | Website jo app jaisi install hoti hai, offline chalti hai |
| **TWA** | PWA ko Play Store pe daalne ka tarika |
| **RLS** | Database ka har-row guard |
| **Env variable** | Secret settings (keys) jo code ke bahar rakhte hain |
| **Cron** | Time pe automatic chalne wala kaam ("roz 8 baje") |
| **Migration** | Database badlaav ki versioned file |
| **CI/CD** | Code push karo → automatic test + deploy |
| **Signed URL** | Temporary file link jo expire hota hai |
| **Rate limit** | Ek user kitni baar request kar sakta hai, ki limit (spam/abuse rokne ke liye) |
| **DPDP Act** | India ka data protection law (2023) |

---

*Next step after approval: Phase 0 (Setup). Main har step se pehle short me bataunga kya, kyun, kaise, aur tumhara "OK" milne ke baad hi aage badhunga.*

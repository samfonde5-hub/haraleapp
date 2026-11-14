# Chinmay Wellness System

Landing page + Patient app + Doctor/Admin app for Dr. Chandrashekhar Harale (Chinmay Wellness Club, Kolhapur).
Full spec: [`docs/PRD.md`](docs/PRD.md).

## Structure
```
apps/app/            React + Vite + TS PWA (patient + doctor screens)
supabase/migrations/ database tables + RLS (version-controlled)
supabase/functions/  Edge Functions (AI, email, WhatsApp, push, cron) — secrets live here
docs/                PRD, runbooks
```

## Run locally
```bash
cd apps/app
npm install
npm run dev
```

## Deploy
Cloudflare Pages, connected to this repo (auto-deploy on push to `main`):
- Root directory: `apps/app`
- Build command: `npm run build`
- Output directory: `dist`

## Security rules
- Only **public** keys in `apps/app/.env.*` (Supabase URL + publishable key). Data is protected by RLS.
- Gemini / Resend / WhatsApp / service-role keys live only in **Supabase Edge Function secrets**. Never in git, chat or WhatsApp.
- WhatsApp/SMS run in `test` mode (whitelist: Sam's number only) until the client approves `live`.

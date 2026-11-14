-- =====================================================================
-- Doctor panel (prototype D1–D11): leads, appointments, medical notes,
-- plan templates + food library, messages, stories, settings, automations.
-- Mentor note: har table pe RLS. Staff ko medical notes kabhi nahi dikhenge.
-- =====================================================================

-- ---------- Leads (D2) ----------
create type public.lead_stage as enum ('new', 'qualified', 'booked', 'joined', 'lost');
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null check (char_length(full_name) between 1 and 120),
  phone            text check (phone ~ '^\+?[0-9]{10,15}$'),
  source           text not null default 'manual' check (source in ('instagram', 'website', 'referral', 'whatsapp', 'ad', 'manual')),
  keyword          text check (char_length(keyword) <= 40),
  goal             text check (char_length(goal) <= 200),
  medical          text check (char_length(medical) <= 300),
  tried_before     text check (char_length(tried_before) <= 300),
  can_come         text check (char_length(can_come) <= 120),
  note             text check (char_length(note) <= 1000),
  answers_count    smallint not null default 0 check (answers_count between 0 and 4),
  stage            public.lead_stage not null default 'new',
  lost_reason      text check (char_length(lost_reason) <= 120),
  retry_at         date,
  patient_id       uuid references public.patients (id) on delete set null,
  utm              jsonb,
  is_demo          boolean not null default false,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create index leads_stage_idx on public.leads (stage, created_at desc);
create trigger leads_updated_at before update on public.leads for each row execute function private.set_updated_at();
create trigger leads_audit after insert or update or delete on public.leads for each row execute function private.write_audit();
create or replace function private.leads_stage_stamp() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stage is distinct from old.stage then new.stage_changed_at := now(); end if;
  return new;
end $$;
create trigger leads_stage_stamp before update on public.leads for each row execute function private.leads_stage_stamp();
create policy "team reads leads" on public.leads for select to authenticated using (private.is_team());
create policy "team adds leads" on public.leads for insert to authenticated with check (private.is_team());
create policy "team updates leads" on public.leads for update to authenticated using (private.is_team()) with check (private.is_team());
create policy "doctor deletes leads" on public.leads for delete to authenticated using (private.is_doctor());

-- ---------- Appointments (D7) ----------
create table public.appointments (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references public.patients (id) on delete cascade,
  lead_id      uuid references public.leads (id) on delete set null,
  name         text not null check (char_length(name) between 1 and 120),
  phone        text check (phone ~ '^\+?[0-9]{10,15}$'),
  starts_at    timestamptz not null,
  duration_min smallint not null default 30 check (duration_min between 10 and 180),
  kind         text not null default 'review' check (kind in ('first_consult', 'review', 'maintenance', 'video')),
  status       text not null default 'booked' check (status in ('booked', 'confirmed', 'done', 'no_show', 'cancelled')),
  paid         boolean not null default false,
  amount       integer check (amount between 0 and 100000),
  note         text check (char_length(note) <= 500),
  meet_link    text check (meet_link ~ '^https://'),
  reminded_at  timestamptz,
  is_demo      boolean not null default false,
  created_by   uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.appointments enable row level security;
create index appointments_time_idx on public.appointments (starts_at);
create trigger appointments_updated_at before update on public.appointments for each row execute function private.set_updated_at();
create trigger appointments_audit after insert or update or delete on public.appointments for each row execute function private.write_audit();
create policy "team reads appointments, patient reads own" on public.appointments for select to authenticated
  using (private.is_team() or (patient_id is not null and patient_id = private.my_patient_id()));
create policy "team adds appointments" on public.appointments for insert to authenticated with check (private.is_team());
create policy "team updates appointments" on public.appointments for update to authenticated using (private.is_team()) with check (private.is_team());
create policy "team deletes appointments" on public.appointments for delete to authenticated using (private.is_team());

-- ---------- Medical notes: DOCTOR ONLY (staff bhi nahi) ----------
create table public.patient_notes (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  author     uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.patient_notes enable row level security;
create index patient_notes_idx on public.patient_notes (patient_id, created_at desc);
create trigger patient_notes_audit after insert or update or delete on public.patient_notes for each row execute function private.write_audit();
create policy "doctor reads notes" on public.patient_notes for select to authenticated using (private.is_doctor());
create policy "doctor writes notes" on public.patient_notes for insert to authenticated with check (private.is_doctor());
create policy "doctor deletes notes" on public.patient_notes for delete to authenticated using (private.is_doctor());

-- ---------- Plan templates + food library (D8 = AI ke rules) ----------
create table public.plan_templates (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'diet' check (kind in ('diet', 'workout')),
  name       text not null check (char_length(name) between 1 and 80),
  kcal       integer check (kcal between 800 and 3500),
  level      text check (char_length(level) <= 30),
  sections   jsonb not null default '[]'::jsonb,   -- [{title, rule, items}]
  rules      text[] not null default '{}',
  updated_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plan_templates enable row level security;
create trigger plan_templates_updated_at before update on public.plan_templates for each row execute function private.set_updated_at();
create policy "team reads templates" on public.plan_templates for select to authenticated using (private.is_team());
create policy "doctor writes templates" on public.plan_templates for insert to authenticated with check (private.is_doctor());
create policy "doctor edits templates" on public.plan_templates for update to authenticated using (private.is_doctor()) with check (private.is_doctor());
create policy "doctor deletes templates" on public.plan_templates for delete to authenticated using (private.is_doctor());

create table public.foods (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 80),
  portion    text check (char_length(portion) <= 40),
  kcal       integer check (kcal between 0 and 2000),
  category   text not null default 'other' check (category in ('grain', 'dal', 'veg', 'protein', 'dairy', 'fruit', 'snack', 'sweet', 'drink', 'other')),
  avoid      boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.foods enable row level security;
create policy "team reads foods" on public.foods for select to authenticated using (private.is_team());
create policy "doctor writes foods" on public.foods for insert to authenticated with check (private.is_doctor());
create policy "doctor edits foods" on public.foods for update to authenticated using (private.is_doctor()) with check (private.is_doctor());
create policy "doctor deletes foods" on public.foods for delete to authenticated using (private.is_doctor());

-- Patient ↔ template + AI guardrails
alter table public.patients
  add column if not exists diet_template_id uuid references public.plan_templates (id) on delete set null,
  add column if not exists workout_template_id uuid references public.plan_templates (id) on delete set null,
  add column if not exists kcal_min integer check (kcal_min between 800 and 3500),
  add column if not exists kcal_max integer check (kcal_max between 800 and 3500),
  add column if not exists dislikes text check (char_length(dislikes) <= 300),
  add column if not exists on_medication boolean not null default false,
  add column if not exists is_demo boolean not null default false;

-- Medication → doctor only (same rule as conditions)
create or replace function private.patients_doctor_only() returns trigger language plpgsql set search_path = '' as $$
begin
  if cardinality(new.conditions) > 0 or new.on_medication then new.doctor_only := true; end if;
  return new;
end $$;

alter table public.plans
  add column if not exists source text not null default 'doctor' check (source in ('doctor', 'ai')),
  add column if not exists ai_changes jsonb,
  add column if not exists safety jsonb,
  add column if not exists week_start date;

-- ---------- Messages (P7 ↔ D3 Messages tab) ----------
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  sender_id   uuid references public.profiles (id) default auth.uid(),
  from_doctor boolean not null default false,
  body        text check (char_length(body) <= 2000),
  voice_path  text check (voice_path ~ '^[0-9a-f-]{36}/'),
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  check (body is not null or voice_path is not null)
);
alter table public.messages enable row level security;
create index messages_patient_idx on public.messages (patient_id, created_at desc);
create policy "patient reads own messages, team reads all" on public.messages for select to authenticated
  using (patient_id = private.my_patient_id() or private.is_team());
create policy "patient sends own message" on public.messages for insert to authenticated
  with check (patient_id = private.my_patient_id() and from_doctor = false and sender_id = (select auth.uid()));
create policy "team sends message" on public.messages for insert to authenticated
  with check (private.is_team() and from_doctor = true and sender_id = (select auth.uid()));
create policy "team marks read" on public.messages for update to authenticated using (private.is_team()) with check (private.is_team());

-- ---------- Proof & stories (D10) ----------
create table public.stories (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references public.patients (id) on delete cascade,
  status       text not null default 'requested' check (status in ('requested', 'consent_given', 'ready', 'published', 'declined')),
  kind         text not null default 'text' check (kind in ('text', 'voice', 'video', 'photo', 'reel', 'carousel')),
  title        text check (char_length(title) <= 120),
  quote        text check (char_length(quote) <= 600),
  display_name text not null default 'hidden' check (display_name in ('hidden', 'first_name', 'full')),
  consent      jsonb not null default '{}'::jsonb,
  keyword      text check (char_length(keyword) <= 40),
  leads_count  integer not null default 0 check (leads_count >= 0),
  note         text check (char_length(note) <= 500),
  requested_at timestamptz not null default now(),
  published_at timestamptz,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.stories enable row level security;
create trigger stories_updated_at before update on public.stories for each row execute function private.set_updated_at();
create policy "team manages stories" on public.stories for all to authenticated using (private.is_team()) with check (private.is_team());

-- ---------- Settings + automations (D7 slots, D9) ----------
create table public.app_settings (
  key        text primary key check (char_length(key) <= 60),
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "team reads settings" on public.app_settings for select to authenticated using (private.is_team());
create policy "doctor writes settings" on public.app_settings for insert to authenticated with check (private.is_doctor());
create policy "doctor edits settings" on public.app_settings for update to authenticated using (private.is_doctor()) with check (private.is_doctor());

create table public.automation_runs (
  id     bigint generated always as identity primary key,
  key    text not null,
  ran_at timestamptz not null default now(),
  items  integer not null default 0,
  note   text
);
alter table public.automation_runs enable row level security;
create index automation_runs_idx on public.automation_runs (key, ran_at desc);
create policy "team reads runs" on public.automation_runs for select to authenticated using (private.is_team());

insert into public.app_settings (key, value) values
  ('slots', '{"days":[1,2,3,4,5,6],"start":"17:00","end":"20:00","length":30,"location":"Clinic · Kolhapur"}'),
  ('automations', '{"lead_autoreply":true,"booking_link":true,"appt_reminders":true,"lead_nurture":true,"missed_checkin":true,"plan_drafts":true,"plate_tags":true,"daily_digest":true,"testimonial_request":true,"maintenance_offer":true}')
on conflict (key) do nothing;

-- ---------- Starter templates (doctor edits them) ----------
insert into public.plan_templates (kind, name, kcal, level, sections, rules) values
 ('diet', 'Kolhapuri balanced T1', 1400, null,
  '[{"title":"Breakfast","rule":"Pick 1","items":"पोहे 1 वाटी · उपमा 1 वाटी · थालीपीठ 1 · इडली 3"},{"title":"Lunch","rule":"Plate rule","items":"1 भाकरी/पोळी · 1 वाटी भाजी · 1 वाटी वरण/पिठलं · कोशिंबीर"},{"title":"Evening","rule":"Pick 1","items":"1 फळ · भाजलेले चणे · ताक"},{"title":"Dinner","rule":"Before 8 PM","items":"1 भाकरी · उसळ/डाळ · सूप"}]',
  array['Never go below 1,300 kcal','Max 1 sweet portion / week','Supplements only as advised by doctor','Medication patients → doctor writes manually','Respect patient dislikes & fasting days']),
 ('diet', 'Kolhapuri balanced T2', 1600, null,
  '[{"title":"Breakfast","rule":"Pick 1","items":"पोहे 1 वाटी · उपमा 1 वाटी · थालीपीठ 1 · इडली 3"},{"title":"Lunch","rule":"Plate rule","items":"2 भाकरी/पोळी · 1 वाटी भाजी · 1 वाटी वरण/पिठलं · कोशिंबीर"},{"title":"Evening","rule":"Pick 1","items":"1 फळ · भाजलेले चणे · ताक"},{"title":"Dinner","rule":"Before 8 PM","items":"1 भाकरी · उसळ/डाळ · सूप"}]',
  array['Never go below 1,300 kcal','Max 1 sweet portion / week','Supplements only as advised by doctor','Medication patients → doctor writes manually','Respect patient dislikes & fasting days']),
 ('diet', 'PCOD-friendly', 1500, null,
  '[{"title":"Breakfast","rule":"Protein first","items":"मूग डोसा 2 · बेसन चिला 2 · अंडी 2"},{"title":"Lunch","rule":"Plate rule","items":"1 ज्वारी भाकरी · भाजी · उसळ · कोशिंबीर"},{"title":"Evening","rule":"Pick 1","items":"भाजलेले चणे · ताक · पेरू"},{"title":"Dinner","rule":"Before 8 PM","items":"सूप · पनीर/डाळ · भाजी"}]',
  array['Low refined sugar','Protein in every meal','Never go below 1,300 kcal']),
 ('diet', 'Veg high-protein', 1600, null, '[]', array['Protein in every meal']),
 ('diet', 'Maintenance', 1800, null, '[]', array['Weekly weight check']),
 ('diet', 'Festival / wedding week flex', null, null, '[]', array['One flexible meal per day','Walk 20 min after heavy meals']),
 ('workout', 'Home 25-min W1', null, 'beginner', '[{"title":"Daily","rule":"25 min","items":"Warm-up 5 · Walk/spot jog 10 · Squats/wall push-ups 5 · Stretch 5"}]', '{}'),
 ('workout', 'Home 35-min W2', null, 'intermediate', '[]', '{}'),
 ('workout', 'Knee-friendly low impact', null, 'low impact', '[]', '{}');

insert into public.foods (name, portion, kcal, category) values
 ('ज्वारी भाकरी', '1 medium', 110, 'grain'), ('बाजरी भाकरी', '1 medium', 120, 'grain'), ('पोळी / चपाती', '1 medium', 100, 'grain'),
 ('भात', '1 वाटी', 200, 'grain'), ('पोहे', '1 वाटी', 180, 'grain'), ('उपमा', '1 वाटी', 190, 'grain'), ('थालीपीठ', '1', 160, 'grain'),
 ('इडली', '1', 40, 'grain'), ('डोसा', '1', 130, 'grain'), ('पिठलं', '1 वाटी', 150, 'dal'), ('वरण', '1 वाटी', 120, 'dal'),
 ('आमटी', '1 वाटी', 130, 'dal'), ('मटकी उसळ', '1 वाटी', 170, 'dal'), ('मूग उसळ', '1 वाटी', 150, 'dal'), ('चणा उसळ', '1 वाटी', 180, 'dal'),
 ('पालेभाजी', '1 वाटी', 80, 'veg'), ('फळभाजी', '1 वाटी', 90, 'veg'), ('कोशिंबीर', '1 वाटी', 40, 'veg'), ('सूप', '1 वाटी', 70, 'veg'),
 ('अंडी (उकडलेली)', '1', 75, 'protein'), ('पनीर', '50 g', 140, 'protein'), ('चिकन रस्सा', '1 वाटी', 220, 'protein'),
 ('तांबडा रस्सा', '1 वाटी', 140, 'protein'), ('पांढरा रस्सा', '1 वाटी', 160, 'protein'), ('मासे (भाजलेले)', '1 piece', 150, 'protein'),
 ('ताक', '1 ग्लास', 60, 'dairy'), ('दही', '1 वाटी', 100, 'dairy'), ('दूध', '1 ग्लास', 120, 'dairy'),
 ('पेरू', '1', 60, 'fruit'), ('सफरचंद', '1', 80, 'fruit'), ('पपई', '1 वाटी', 60, 'fruit'), ('केळं', '1', 100, 'fruit'),
 ('भाजलेले चणे', '30 g', 110, 'snack'), ('मखाणा', '1 वाटी', 90, 'snack'), ('चिवडा', '1 वाटी', 250, 'snack'),
 ('वडा पाव', '1', 290, 'snack'), ('मिसळ पाव', '1 plate', 450, 'snack'), ('भजी', '5 pieces', 250, 'snack'),
 ('गुलाबजाम', '1', 150, 'sweet'), ('शिरा', '1 वाटी', 300, 'sweet'), ('पुरणपोळी', '1', 290, 'sweet'),
 ('चहा (साखर)', '1 कप', 70, 'drink'), ('लिंबू पाणी (साखर नाही)', '1 ग्लास', 10, 'drink')
on conflict (name) do nothing;

-- =====================================================================
-- RPCs (one call per screen)
-- =====================================================================
-- Week number helper
create or replace function private.week_no(start_date date) returns integer language sql immutable set search_path = '' as $$
  select case when start_date is null then null else greatest(1, ((current_date - start_date) / 7) + 1) end
$$;

-- ---------- Retention radar (D5): rule-based risk score, reasons, suggestion ----------
create or replace function public.retention_radar() returns json language plpgsql stable security invoker set search_path = '' as $$
declare d date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return coalesce((select json_agg(r order by r.score desc) from (
    select x.*,
      least(100, (case when x.days_quiet >= 3 then 35 when x.days_quiet = 2 then 22 else 0 end)
               + (case when x.mood_recent is not null and x.mood_prev is not null and x.mood_recent < x.mood_prev - 0.7 then 18
                       when x.mood_recent is not null and x.mood_recent <= 2 then 15 else 0 end)
               + (case when x.weight_change_9d is not null and abs(x.weight_change_9d) < 0.2 then 15 else 0 end)
               + (case when x.ci_prev7 > 0 and x.ci_last7 < x.ci_prev7 * 0.6 then 15 else 0 end)
               + (case when x.unread > 1 then 10 else 0 end)
               + (case when x.no_shows > 0 then 15 else 0 end)) as score
    from (
      select p.id, p.full_name, p.phone, p.program, private.week_no(p.start_date) as week,
        coalesce(d - greatest((select max(log_date) from public.checkins c where c.patient_id = p.id),
                              (select max(log_date) from public.daily_logs l where l.patient_id = p.id)), 99) as days_quiet,
        (select avg(mood) from public.daily_logs l where l.patient_id = p.id and l.log_date > d - 4 and mood is not null) as mood_recent,
        (select avg(mood) from public.daily_logs l where l.patient_id = p.id and l.log_date between d - 14 and d - 4 and mood is not null) as mood_prev,
        (select max(weight_kg) - min(weight_kg) from public.daily_logs l where l.patient_id = p.id and l.log_date > d - 9 and weight_kg is not null
            having count(*) >= 3) as weight_change_9d,
        (select count(distinct log_date) from public.checkins c where c.patient_id = p.id and c.log_date > d - 7) as ci_last7,
        (select count(distinct log_date) from public.checkins c where c.patient_id = p.id and c.log_date between d - 14 and d - 7) as ci_prev7,
        (select count(*) from public.messages m where m.patient_id = p.id and not m.from_doctor and m.read_at is null) as unread,
        (select count(*) from public.appointments a where a.patient_id = p.id and a.status = 'no_show' and a.starts_at > now() - interval '30 days') as no_shows,
        (select mood from public.daily_logs l where l.patient_id = p.id and mood is not null order by log_date desc limit 1) as last_mood
      from public.patients p where p.status = 'active'
    ) x
  ) r), '[]');
end $$;
revoke all on function public.retention_radar() from public, anon; grant execute on function public.retention_radar() to authenticated;

-- ---------- Doctor dashboard (D1 + sidebar counts) ----------
create or replace function public.doctor_dashboard() returns json language plpgsql stable security invoker set search_path = '' as $$
declare
  d date := (now() at time zone 'Asia/Kolkata')::date;
  wk_start date := d - ((extract(isodow from d))::int - 1);
  m_start date := date_trunc('month', d)::date;
  radar json := public.retention_radar();
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return json_build_object(
    'today', d,
    'counts', json_build_object(
      'approvals', (select count(*) from public.plans where status = 'draft'),
      'radar_high', (select count(*) from json_array_elements(radar) e where (e->>'score')::int >= 50),
      'leads_new', (select count(*) from public.leads where stage = 'new'),
      'alerts', (select count(*) from public.alerts where status = 'open'),
      'unread', (select count(*) from public.messages where not from_doctor and read_at is null),
      'plates_todo', (select count(*) from public.checkins where log_date >= d - 1 and doctor_reaction is null)),
    'kpi', json_build_object(
      'active', (select count(*) from public.patients where status = 'active'),
      'leads_week', (select count(*) from public.leads where created_at >= wk_start),
      'leads_prev_week', (select count(*) from public.leads where created_at >= wk_start - 7 and created_at < wk_start),
      'consults_today', (select count(*) from public.appointments where (starts_at at time zone 'Asia/Kolkata')::date = d and status <> 'cancelled'),
      'first_today', (select count(*) from public.appointments where (starts_at at time zone 'Asia/Kolkata')::date = d and status <> 'cancelled' and kind = 'first_consult'),
      'checked_in_today', (select count(distinct patient_id) from (select patient_id from public.checkins where log_date = d union select patient_id from public.daily_logs where log_date = d) t)),
    'radar', radar,
    'leads_followup', coalesce((select json_agg(l) from (
        select id, full_name, phone, keyword, stage, answers_count, created_at, stage_changed_at, (d - (created_at at time zone 'Asia/Kolkata')::date) as age_days
          from public.leads
         where stage in ('new', 'qualified') and not exists (select 1 from public.appointments a where a.lead_id = leads.id and a.status <> 'cancelled')
           and (answers_count = 4 or created_at < now() - interval '2 days')
         order by created_at limit 10) l), '[]'),
    'good_week', coalesce((select json_agg(g) from (
        select p.id, p.full_name, p.phone, private.week_no(p.start_date) week,
               (select weight_kg from public.daily_logs l where l.patient_id = p.id and weight_kg is not null order by log_date desc limit 1)
             - (select weight_kg from public.daily_logs l where l.patient_id = p.id and weight_kg is not null and log_date <= d - 7 order by log_date desc limit 1) as change
          from public.patients p where p.status = 'active') g where g.change <= -0.5), '[]'),
    'testimonial_due', coalesce((select json_agg(t) from (
        select p.id, p.full_name, private.week_no(p.start_date) week from public.patients p
         where p.status = 'active' and private.week_no(p.start_date) in (4, 8, 12)
           and not exists (select 1 from public.stories s where s.patient_id = p.id and s.requested_at > now() - interval '21 days')) t), '[]'),
    'consults', coalesce((select json_agg(a order by a.starts_at) from (
        select id, name, phone, starts_at, kind, status, paid, amount, note, patient_id, lead_id, reminded_at from public.appointments
         where (starts_at at time zone 'Asia/Kolkata')::date = d and status <> 'cancelled') a), '[]'),
    'funnel', json_build_object(
      'inquiries', (select count(*) from public.leads where created_at >= m_start),
      'booked', (select count(*) from public.appointments where kind = 'first_consult' and created_at >= m_start and status <> 'cancelled'),
      'showed', (select count(*) from public.appointments where kind = 'first_consult' and starts_at >= m_start and status = 'done'),
      'joined', (select count(*) from public.leads where stage = 'joined' and stage_changed_at >= m_start))
  );
end $$;
revoke all on function public.doctor_dashboard() from public, anon; grant execute on function public.doctor_dashboard() to authenticated;

-- ---------- Global search ----------
create or replace function public.doctor_search(q text) returns json language plpgsql stable security invoker set search_path = '' as $$
declare s text := '%' || replace(replace(trim(coalesce(q, '')), '%', ''), '_', '') || '%';
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  if char_length(trim(coalesce(q, ''))) < 2 then return '[]'::json; end if;
  return coalesce((select json_agg(x) from (
    (select 'patient' as type, id, full_name, phone from public.patients where full_name ilike s or phone ilike s or invite_email ilike s limit 8)
    union all
    (select 'lead' as type, id, full_name, phone from public.leads where full_name ilike s or phone ilike s limit 8)) x), '[]');
end $$;
revoke all on function public.doctor_search(text) from public, anon; grant execute on function public.doctor_search(text) to authenticated;

-- ---------- Convert lead → patient (one click) ----------
create or replace function public.convert_lead(lead uuid, email text, start_weight numeric default null, target_weight numeric default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare l public.leads; pid uuid;
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  select * into l from public.leads where id = lead;
  if l.id is null then raise exception 'lead not found'; end if;
  if l.patient_id is not null then return l.patient_id; end if;
  insert into public.patients (full_name, phone, invite_email, start_weight, target_weight, start_date, is_demo)
  values (l.full_name, l.phone, nullif(lower(trim(email)), ''), start_weight, target_weight, (now() at time zone 'Asia/Kolkata')::date, l.is_demo)
  returning id into pid;
  update public.leads set stage = 'joined', patient_id = pid where id = lead;
  return pid;
end $$;
revoke all on function public.convert_lead(uuid, text, numeric, numeric) from public, anon; grant execute on function public.convert_lead(uuid, text, numeric, numeric) to authenticated;

-- ---------- Monthly report (D11) ----------
create or replace function public.monthly_report(month date) returns json language plpgsql stable security invoker set search_path = '' as $$
declare
  ms date := date_trunc('month', month)::date;
  me date := (date_trunc('month', month) + interval '1 month')::date;
  ps date := (date_trunc('month', month) - interval '1 month')::date;
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return json_build_object(
    'month', ms,
    'inquiries', (select count(*) from public.leads where created_at >= ms and created_at < me),
    'inquiries_prev', (select count(*) from public.leads where created_at >= ps and created_at < ms),
    'joined', (select count(*) from public.leads where stage = 'joined' and stage_changed_at >= ms and stage_changed_at < me),
    'new_patients', (select count(*) from public.patients where created_at >= ms and created_at < me),
    'active', (select count(*) from public.patients where status = 'active'),
    'dropped', (select count(*) from public.patients where status = 'dropped' and updated_at >= ms and updated_at < me),
    'maintenance', (select count(*) from public.patients where program = 'maintenance' and status = 'active'),
    'week4', (select json_build_object('cohort', count(*), 'active', count(*) filter (where exists (
        select 1 from public.checkins c where c.patient_id = p.id and c.log_date between p.start_date + 21 and p.start_date + 28)
        or exists (select 1 from public.daily_logs l where l.patient_id = p.id and l.log_date between p.start_date + 21 and p.start_date + 28)))
      from public.patients p where p.start_date is not null and p.start_date + 28 < me and p.start_date + 28 >= ms - 60),
    'by_keyword', coalesce((select json_agg(k order by k.leads desc) from (
        select coalesce(nullif(keyword, ''), case source when 'website' then 'Website' when 'referral' then 'Referral' else initcap(source) end) as keyword,
               count(*) leads, count(*) filter (where stage = 'joined') joined
          from public.leads where created_at >= ms and created_at < me group by 1) k), '[]'),
    'funnel', json_build_object(
      'inquiries', (select count(*) from public.leads where created_at >= ms and created_at < me),
      'booked', (select count(*) from public.appointments where kind = 'first_consult' and created_at >= ms and created_at < me and status <> 'cancelled'),
      'showed', (select count(*) from public.appointments where kind = 'first_consult' and starts_at >= ms and starts_at < me and status = 'done'),
      'joined', (select count(*) from public.leads where stage = 'joined' and stage_changed_at >= ms and stage_changed_at < me)),
    'best_story', (select row_to_json(s) from (select title, kind, keyword, leads_count, published_at from public.stories
        where status = 'published' and published_at >= ms and published_at < me order by leads_count desc limit 1) s),
    'plates', (select count(*) from public.checkins where created_at >= ms and created_at < me),
    'consults', (select count(*) from public.appointments where starts_at >= ms and starts_at < me and status = 'done'),
    'revenue_assess', (select coalesce(sum(amount), 0) from public.appointments where paid and starts_at >= ms and starts_at < me)
  );
end $$;
revoke all on function public.monthly_report(date) from public, anon; grant execute on function public.monthly_report(date) to authenticated;

-- ---------- Richer patient profile (D3 tabs) ----------
create or replace function public.doctor_patient(pid uuid) returns json language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return json_build_object(
    'patient', (select row_to_json(p) from (select id, full_name, phone, invite_email, status, program, start_date, start_weight, target_weight,
                 height_cm, conditions, doctor_only, city, dob, gender, diet_template_id, workout_template_id, kcal_min, kcal_max, dislikes, on_medication,
                 profile_id is not null as joined, private.week_no(start_date) as week, created_at from public.patients where id = pid) p),
    'logs', coalesce((select json_agg(l order by l.log_date) from (select log_date, weight_kg, water_glasses, steps, mood from public.daily_logs where patient_id = pid and log_date >= current_date - 120) l), '[]'),
    'measurements', coalesce((select json_agg(m order by m.measured_on) from (select measured_on, weight_kg, waist_cm, hip_cm from public.measurements where patient_id = pid) m), '[]'),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (select id, log_date, meal, photo_path, note, ai_tag, ai_items, ai_confidence, doctor_reaction, created_at from public.checkins where patient_id = pid order by created_at desc limit 60) c), '[]'),
    'plans', coalesce((select json_agg(x order by x.week_no desc) from (select id, week_no, status, focus_goal, body, doctor_note, approved_at, source, risk_level, ai_reason, ai_changes, safety from public.plans where patient_id = pid) x), '[]'),
    'alerts', coalesce((select json_agg(a order by a.created_at desc) from (select id, note, status, created_at from public.alerts where patient_id = pid order by created_at desc limit 10) a), '[]'),
    'notes', case when private.is_doctor() then coalesce((select json_agg(n order by n.created_at desc) from (select id, body, created_at from public.patient_notes where patient_id = pid) n), '[]') else null end,
    'consents', coalesce((select json_agg(c) from (select cc.type, cc.granted, cc.created_at from public.current_consents cc join public.patients p on p.profile_id = cc.profile_id where p.id = pid) c), '[]'),
    'messages', coalesce((select json_agg(m order by m.created_at) from (select id, from_doctor, body, voice_path, read_at, created_at from public.messages where patient_id = pid order by created_at desc limit 80) m), '[]'),
    'appointments', coalesce((select json_agg(a order by a.starts_at desc) from (select id, starts_at, kind, status, paid, amount, note from public.appointments where patient_id = pid order by starts_at desc limit 10) a), '[]'),
    'stories', coalesce((select json_agg(s) from (select id, status, kind, requested_at from public.stories where patient_id = pid) s), '[]')
  );
end $$;
revoke all on function public.doctor_patient(uuid) from public, anon; grant execute on function public.doctor_patient(uuid) to authenticated;

-- ---------- Patient list (adds week + template) ----------
create or replace function public.doctor_patients() returns json language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return coalesce((select json_agg(x order by x.full_name) from (
    select p.id, p.full_name, p.phone, p.invite_email, p.status, p.program, p.start_date, p.start_weight, p.target_weight,
           p.conditions, p.doctor_only, p.profile_id is not null as joined, private.week_no(p.start_date) as week, p.is_demo,
           (select weight_kg from public.daily_logs l where l.patient_id = p.id and weight_kg is not null order by log_date desc limit 1) last_weight,
           greatest((select max(log_date) from public.checkins where patient_id = p.id),
                    (select max(log_date) from public.daily_logs where patient_id = p.id)) last_active,
           (select count(*) from public.messages m where m.patient_id = p.id and not m.from_doctor and m.read_at is null) unread
      from public.patients p) x), '[]');
end $$;
revoke all on function public.doctor_patients() from public, anon; grant execute on function public.doctor_patients() to authenticated;

-- Patient home: also unread doctor messages + next appointment
create or replace function public.patient_home() returns json language sql stable security invoker set search_path = '' as $$
  with p as (select id, full_name, start_date, start_weight, target_weight, program, status from public.patients where profile_id = (select auth.uid()) limit 1)
  select json_build_object('patient',(select row_to_json(p) from p),
    'logs', coalesce((select json_agg(l order by l.log_date) from (select id, log_date, weight_kg, water_glasses, steps, mood from public.daily_logs where patient_id=(select id from p) and log_date >= current_date - 90) l),'[]'::json),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (select id, log_date, meal, photo_path, note, doctor_reaction, ai_tag, ai_items, created_at from public.checkins where patient_id=(select id from p) and log_date >= current_date - 90) c),'[]'::json),
    'plan', (select row_to_json(x) from (select id, week_no, status, focus_goal, body, doctor_note, approved_at from public.plans where patient_id=(select id from p) and status in ('approved','sent') order by week_no desc limit 1) x),
    'alert', (select row_to_json(a) from (select id, status, created_at from public.alerts where patient_id=(select id from p) and status <> 'resolved' and created_at > now() - interval '24 hours' order by created_at desc limit 1) a),
    'next_appt', (select row_to_json(a) from (select id, starts_at, kind, status, meet_link from public.appointments where patient_id=(select id from p) and starts_at > now() - interval '1 hour' and status in ('booked','confirmed') order by starts_at limit 1) a),
    'unread', (select count(*) from public.messages where patient_id=(select id from p) and from_doctor and read_at is null))
$$;
revoke all on function public.patient_home() from public, anon; grant execute on function public.patient_home() to authenticated;

-- Patient marks doctor messages read (only own, only read_at)
create or replace function public.patient_mark_read() returns void language sql security definer set search_path = '' as $$
  update public.messages set read_at = now()
   where patient_id = private.my_patient_id() and from_doctor and read_at is null
$$;
revoke all on function public.patient_mark_read() from public, anon; grant execute on function public.patient_mark_read() to authenticated;

-- Voice bucket: patient reads files in own patient's thread? Doctor uploads to <doctor uid>/...;
-- patient needs to play doctor's voice notes for THEIR thread → signed URL via security definer check.
create or replace function public.can_read_voice(path text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.messages m where m.voice_path = path and (m.patient_id = private.my_patient_id() or private.is_team()))
$$;
revoke all on function public.can_read_voice(text) from public, anon; grant execute on function public.can_read_voice(text) to authenticated;
create policy "patient reads voice of own thread" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.can_read_voice(name));

-- Demo cleanup (doctor one-click)
create or replace function public.doctor_clear_demo() returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not private.is_doctor() then raise exception 'doctor only' using errcode = '42501'; end if;
  delete from public.stories where is_demo;
  delete from public.appointments where is_demo;
  delete from public.leads where is_demo;
  delete from public.patients where is_demo;
end $$;
revoke all on function public.doctor_clear_demo() from public, anon; grant execute on function public.doctor_clear_demo() to authenticated;

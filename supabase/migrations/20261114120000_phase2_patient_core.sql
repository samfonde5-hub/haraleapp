-- =====================================================================
-- Phase 2 · Patient core: daily logs, meal check-ins, measurements, plans
-- Mentor note: har table pe wahi pattern — patient sirf apna,
-- team (doctor+staff) sab dekhe, plan sirf doctor approve kare.
-- =====================================================================

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.plan_status as enum ('draft', 'approved', 'sent', 'archived');

-- Which patients row belongs to the logged-in user?
create or replace function private.my_patient_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.patients where profile_id = auth.uid() limit 1
$$;
revoke all on function private.my_patient_id() from public;
grant execute on function private.my_patient_id() to authenticated;

-- ---------- Daily log: one row per patient per day ----------
create table public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  log_date      date not null default (now() at time zone 'Asia/Kolkata')::date,
  weight_kg     numeric(5, 1) check (weight_kg between 20 and 300),
  water_glasses smallint check (water_glasses between 0 and 30),
  steps         integer check (steps between 0 and 100000),
  mood          smallint check (mood between 1 and 5),
  note          text check (char_length(note) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (patient_id, log_date)
);
alter table public.daily_logs enable row level security;
create trigger daily_logs_updated_at before update on public.daily_logs
  for each row execute function private.set_updated_at();

-- ---------- Meal check-ins (thali photos) ----------
create table public.checkins (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients (id) on delete cascade,
  log_date         date not null default (now() at time zone 'Asia/Kolkata')::date,
  meal             public.meal_type not null,
  photo_path       text check (photo_path ~ '^[0-9a-f-]{36}/'),
  note             text check (char_length(note) <= 500),
  ai_tag           text check (ai_tag in ('balanced', 'rice_extra', 'low_veg', 'fried', 'sweet', 'unclear')),
  ai_items         jsonb,
  ai_confidence    numeric(3, 2) check (ai_confidence between 0 and 1),
  doctor_reaction  text check (char_length(doctor_reaction) <= 300),
  reacted_by       uuid references public.profiles (id),
  reacted_at       timestamptz,
  created_at       timestamptz not null default now()
);
alter table public.checkins enable row level security;
create index checkins_patient_date_idx on public.checkins (patient_id, log_date desc);
create index checkins_date_idx on public.checkins (log_date desc);

-- ---------- Weekly measurements ----------
create table public.measurements (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  measured_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  weight_kg   numeric(5, 1) check (weight_kg between 20 and 300),
  waist_cm    numeric(5, 1) check (waist_cm between 30 and 250),
  hip_cm      numeric(5, 1) check (hip_cm between 30 and 250),
  created_at  timestamptz not null default now(),
  unique (patient_id, measured_on)
);
alter table public.measurements enable row level security;

-- ---------- Weekly plans (doctor-approved only reach patient) ----------
create table public.plans (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  week_no      smallint not null check (week_no between 1 and 104),
  status       public.plan_status not null default 'draft',
  focus_goal   text check (char_length(focus_goal) <= 200),
  body         jsonb not null default '{}'::jsonb,
  doctor_note  text check (char_length(doctor_note) <= 1000),
  risk_level   text not null default 'safe' check (risk_level in ('safe', 'review', 'doctor_only')),
  ai_reason    text,
  approved_by  uuid references public.profiles (id),
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (patient_id, week_no)
);
alter table public.plans enable row level security;
create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();

-- HARD RULE (PRD §6.3): only a doctor can move a plan to approved/sent.
create or replace function private.guard_plan_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('approved', 'sent')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if auth.uid() is not null and not private.is_doctor() then
      raise exception 'Only the doctor can approve a plan' using errcode = '42501';
    end if;
    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end $$;
create trigger plans_guard_approval before insert or update on public.plans
  for each row execute function private.guard_plan_approval();

create trigger plans_audit after insert or update or delete on public.plans
  for each row execute function private.write_audit();

-- ---------- Reaction stamp on check-ins ----------
create or replace function private.stamp_reaction()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.doctor_reaction is distinct from old.doctor_reaction then
    new.reacted_by := auth.uid();
    new.reacted_at := now();
  end if;
  return new;
end $$;
create trigger checkins_stamp_reaction before update on public.checkins
  for each row execute function private.stamp_reaction();

-- =====================================================================
-- RLS
-- =====================================================================
-- daily_logs
create policy "patient reads own logs, team reads all" on public.daily_logs
  for select to authenticated using (patient_id = private.my_patient_id() or private.is_team());
create policy "patient writes own log" on public.daily_logs
  for insert to authenticated with check (patient_id = private.my_patient_id());
create policy "patient updates own log" on public.daily_logs
  for update to authenticated
  using (patient_id = private.my_patient_id()) with check (patient_id = private.my_patient_id());

-- checkins
create policy "patient reads own checkins, team reads all" on public.checkins
  for select to authenticated using (patient_id = private.my_patient_id() or private.is_team());
create policy "patient adds own checkin" on public.checkins
  for insert to authenticated
  with check (patient_id = private.my_patient_id()
              and doctor_reaction is null
              and (photo_path is null or split_part(photo_path, '/', 1) = (select auth.uid())::text));
create policy "patient deletes own checkin same day" on public.checkins
  for delete to authenticated
  using (patient_id = private.my_patient_id() and log_date = (now() at time zone 'Asia/Kolkata')::date);
create policy "team reacts to checkins" on public.checkins
  for update to authenticated using (private.is_team()) with check (private.is_team());

-- measurements
create policy "patient reads own measurements, team reads all" on public.measurements
  for select to authenticated using (patient_id = private.my_patient_id() or private.is_team());
create policy "patient or team adds measurement" on public.measurements
  for insert to authenticated with check (patient_id = private.my_patient_id() or private.is_team());
create policy "patient or team fixes measurement" on public.measurements
  for update to authenticated
  using (patient_id = private.my_patient_id() or private.is_team())
  with check (patient_id = private.my_patient_id() or private.is_team());

-- plans: patient sees ONLY approved/sent; drafts never
create policy "patient reads approved own plans, team reads all" on public.plans
  for select to authenticated
  using ((patient_id = private.my_patient_id() and status in ('approved', 'sent')) or private.is_team());
create policy "team drafts plans" on public.plans
  for insert to authenticated with check (private.is_team());
create policy "team edits plans" on public.plans
  for update to authenticated using (private.is_team()) with check (private.is_team());
create policy "doctor deletes plans" on public.plans
  for delete to authenticated using (private.is_doctor());

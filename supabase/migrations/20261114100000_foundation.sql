-- =====================================================================
-- Phase 1 · Foundation: roles, profiles, patients, consents, audit log,
-- private storage buckets. Every table has RLS ON (PRD §8 S1).
--
-- Mentor note: RLS = har row pe guard. Policies neeche likhi hain:
--   patient  -> sirf apna data
--   staff    -> patients/leads dekh sakta hai, medical reports NAHI
--   doctor   -> sab kuch
-- =====================================================================

-- ---------- Types ----------
create type public.app_role as enum ('patient', 'doctor', 'staff');
create type public.patient_status as enum ('active', 'paused', 'completed', 'dropped');
create type public.consent_type as enum ('health_data', 'ai_drafts', 'reminders', 'story');

-- ---------- Private schema for helper functions (not exposed via API) ----------
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------- updated_at helper ----------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Staff invites: which email gets doctor/staff role on signup ----------
create table public.staff_invites (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  role       public.app_role not null check (role in ('doctor', 'staff')),
  created_at timestamptz not null default now()
);
alter table public.staff_invites enable row level security;

-- ---------- Profiles: one row per login user ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null default 'patient',
  full_name  text check (char_length(full_name) <= 120),
  phone      text check (phone ~ '^\+?[0-9]{10,15}$'),
  email      text,
  lang       text not null default 'mr' check (lang in ('mr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------- Role helpers (security definer: read role without RLS recursion) ----------
create or replace function private.my_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_doctor()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'doctor' from public.profiles where id = auth.uid()), false)
$$;

create or replace function private.is_team()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('doctor', 'staff') from public.profiles where id = auth.uid()), false)
$$;

revoke all on function private.my_role(), private.is_doctor(), private.is_team() from public;
grant execute on function private.my_role(), private.is_doctor(), private.is_team() to authenticated;

-- ---------- Auto-create profile on signup ----------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role;
  v_lang text;
begin
  select si.role into v_role from public.staff_invites si where si.email = lower(new.email);
  v_lang := coalesce(new.raw_user_meta_data ->> 'lang', 'mr');
  if v_lang not in ('mr', 'en') then v_lang := 'mr'; end if;

  insert into public.profiles (id, role, email, lang)
  values (new.id, coalesce(v_role, 'patient'), lower(new.email), v_lang);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------- Guard: only a doctor (or the server) can change a role ----------
create or replace function private.guard_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not private.is_doctor() then
    raise exception 'Only a doctor can change roles' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and auth.uid() is not null then
    raise exception 'Email is managed by login, not editable here' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.guard_role_change();

-- ---------- Patients: the medical-program record ----------
create table public.patients (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references public.profiles (id) on delete set null,
  full_name      text not null check (char_length(full_name) between 1 and 120),
  phone          text check (phone ~ '^\+?[0-9]{10,15}$'),
  dob            date check (dob > date '1920-01-01' and dob < current_date),
  gender         text check (gender in ('female', 'male', 'other')),
  city           text check (char_length(city) <= 80),
  height_cm      numeric(5, 1) check (height_cm between 50 and 250),
  start_weight   numeric(5, 1) check (start_weight between 20 and 300),
  target_weight  numeric(5, 1) check (target_weight between 20 and 300),
  program        text not null default '12w' check (program in ('12w', 'maintenance', 'challenge7')),
  start_date     date,
  status         public.patient_status not null default 'active',
  conditions     text[] not null default '{}'
                 check (conditions <@ array['diabetes', 'thyroid', 'pcod', 'bp', 'pregnancy', 'other']),
  doctor_only    boolean not null default false,
  created_by     uuid references public.profiles (id) default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.patients enable row level security;
create index patients_status_idx on public.patients (status);
create trigger patients_updated_at before update on public.patients
  for each row execute function private.set_updated_at();

-- Any medical condition => AI drafts must go to the doctor only (PRD §6.3)
create or replace function private.patients_doctor_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  if cardinality(new.conditions) > 0 then new.doctor_only := true; end if;
  return new;
end $$;
create trigger patients_doctor_only before insert or update on public.patients
  for each row execute function private.patients_doctor_only();

-- ---------- Consents: append-only history (DPDP proof, PRD §8 S8) ----------
create table public.consents (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type       public.consent_type not null,
  granted    boolean not null,
  version    text not null default 'v1',
  created_at timestamptz not null default now()
);
alter table public.consents enable row level security;
create index consents_profile_idx on public.consents (profile_id, type, created_at desc);

-- Latest decision per consent type (respects caller's RLS)
create view public.current_consents with (security_invoker = true) as
  select distinct on (profile_id, type) profile_id, type, granted, version, created_at
  from public.consents
  order by profile_id, type, created_at desc;

-- ---------- Audit log (PRD §8 S7) ----------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid default auth.uid(),
  action     text not null,
  table_name text not null,
  row_id     text,
  details    jsonb,
  at         timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create index audit_log_at_idx on public.audit_log (at desc);

create or replace function private.write_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row text;
  v_details jsonb;
begin
  v_row := coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null);
  if tg_table_name = 'profiles' then
    -- only log role changes for profiles
    if tg_op <> 'UPDATE' or new.role is not distinct from old.role then return null; end if;
    v_details := jsonb_build_object('old_role', old.role, 'new_role', new.role);
  end if;
  insert into public.audit_log (action, table_name, row_id, details)
  values (lower(tg_op), tg_table_name, v_row, v_details);
  return null;
end $$;

create trigger patients_audit after insert or update or delete on public.patients
  for each row execute function private.write_audit();
create trigger profiles_audit after update on public.profiles
  for each row execute function private.write_audit();

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- staff_invites: doctor only
create policy "doctor manages invites" on public.staff_invites
  for all to authenticated using (private.is_doctor()) with check (private.is_doctor());

-- profiles
create policy "read own profile or team reads all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or private.is_team());
create policy "update own profile or doctor" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or private.is_doctor())
  with check (id = (select auth.uid()) or private.is_doctor());

-- patients
create policy "patient reads own record, team reads all" on public.patients
  for select to authenticated using (profile_id = (select auth.uid()) or private.is_team());
create policy "team creates patients" on public.patients
  for insert to authenticated with check (private.is_team());
create policy "team updates patients" on public.patients
  for update to authenticated using (private.is_team()) with check (private.is_team());
create policy "doctor deletes patients" on public.patients
  for delete to authenticated using (private.is_doctor());

-- consents (append-only: no update/delete policies)
create policy "user records own consent" on public.consents
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "user reads own consents, team reads all" on public.consents
  for select to authenticated using (profile_id = (select auth.uid()) or private.is_team());

-- audit_log: doctor read-only; writes only via trigger
create policy "doctor reads audit log" on public.audit_log
  for select to authenticated using (private.is_doctor());

-- =====================================================================
-- STORAGE: private buckets. Path convention: <owner_profile_id>/<file>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('plates',  'plates',  false,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('voice',   'voice',   false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav']),
  ('reports', 'reports', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('stories', 'stories', false, 52428800, array['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

-- plates + voice: owner folder, team can read; team can also upload voice (doctor's voice notes)
create policy "owner uploads plates/voice" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('plates', 'voice') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "team uploads voice" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'voice' and private.is_team());
create policy "owner or team reads plates/voice" on storage.objects
  for select to authenticated
  using (bucket_id in ('plates', 'voice')
         and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_team()));
create policy "owner deletes own plates/voice" on storage.objects
  for delete to authenticated
  using (bucket_id in ('plates', 'voice') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- reports: owner + DOCTOR only (staff must NOT see medical reports)
create policy "owner or doctor uploads reports" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports'
              and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_doctor()));
create policy "owner or doctor reads reports" on storage.objects
  for select to authenticated
  using (bucket_id = 'reports'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_doctor()));
create policy "doctor deletes reports" on storage.objects
  for delete to authenticated
  using (bucket_id = 'reports' and private.is_doctor());

-- stories: team only
create policy "team manages stories" on storage.objects
  for all to authenticated
  using (bucket_id = 'stories' and private.is_team())
  with check (bucket_id = 'stories' and private.is_team());

-- ---------- Seed: test doctor/admin (Sam) ----------
insert into public.staff_invites (email, role) values ('samfonde0@gmail.com', 'doctor')
on conflict (email) do nothing;

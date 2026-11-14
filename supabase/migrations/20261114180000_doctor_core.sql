-- =====================================================================
-- Phase 3 · Doctor core: patient invite-by-email + dashboard RPCs
-- Mentor note: doctor patient ko EMAIL se jodta hai. Patient jab us email se
-- login karta hai (Google ya link), trigger apne aap dono ko jod deta hai.
-- =====================================================================
alter table public.patients add column if not exists invite_email text
  check (invite_email is null or (invite_email = lower(invite_email) and position('@' in invite_email) > 1));
create unique index if not exists patients_invite_email_key on public.patients (invite_email) where invite_email is not null;

-- New login → agar doctor ne is email se patient banaya hai, to jod do
create or replace function private.link_patient_on_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'patient' and new.email is not null then
    update public.patients set profile_id = new.id
     where invite_email = lower(new.email) and profile_id is null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_link_patient on public.profiles;
create trigger profiles_link_patient after insert on public.profiles
  for each row execute function private.link_patient_on_profile();

-- Doctor patient banaye aur us email ka user pehle se ho → turant jod do
create or replace function private.link_patient_on_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is null and new.invite_email is not null then
    select p.id into new.profile_id from public.profiles p
     where p.email = new.invite_email and p.role = 'patient'
       and not exists (select 1 from public.patients x where x.profile_id = p.id)
     limit 1;
  end if;
  return new;
end $$;
drop trigger if exists patients_link_on_insert on public.patients;
create trigger patients_link_on_insert before insert or update of invite_email on public.patients
  for each row execute function private.link_patient_on_insert();

-- ---------- Doctor "Today" in ONE call ----------
create or replace function public.doctor_today() returns json language plpgsql stable security invoker set search_path = '' as $$
declare d date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return json_build_object(
    'today', d,
    'alerts', coalesce((select json_agg(a order by a.created_at desc) from (
        select al.id, al.note, al.status, al.created_at, p.id patient_id, p.full_name, p.phone
          from public.alerts al join public.patients p on p.id = al.patient_id
         where al.status <> 'resolved' order by al.created_at desc limit 20) a), '[]'),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (
        select ch.id, ch.meal, ch.photo_path, ch.note, ch.ai_tag, ch.ai_items, ch.doctor_reaction, ch.created_at, p.id patient_id, p.full_name
          from public.checkins ch join public.patients p on p.id = ch.patient_id
         where ch.log_date >= d - 1 order by ch.created_at desc limit 60) c), '[]'),
    'quiet', coalesce((select json_agg(q) from (
        select p.id, p.full_name, p.phone,
               greatest((select max(log_date) from public.checkins where patient_id = p.id),
                        (select max(log_date) from public.daily_logs where patient_id = p.id)) last_active
          from public.patients p where p.status = 'active') q
        where q.last_active is null or q.last_active < d - 1), '[]'),
    'counts', json_build_object(
        'active', (select count(*) from public.patients where status = 'active'),
        'checkins_today', (select count(*) from public.checkins where log_date = d),
        'to_react', (select count(*) from public.checkins where log_date >= d - 1 and doctor_reaction is null),
        'open_alerts', (select count(*) from public.alerts where status = 'open'))
  );
end $$;
revoke all on function public.doctor_today() from public, anon; grant execute on function public.doctor_today() to authenticated;

-- ---------- Patient list with progress ----------
create or replace function public.doctor_patients() returns json language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return coalesce((select json_agg(x order by x.full_name) from (
    select p.id, p.full_name, p.phone, p.invite_email, p.status, p.program, p.start_date, p.start_weight, p.target_weight,
           p.conditions, p.doctor_only, p.profile_id is not null as joined,
           (select weight_kg from public.daily_logs l where l.patient_id = p.id and weight_kg is not null order by log_date desc limit 1) last_weight,
           greatest((select max(log_date) from public.checkins where patient_id = p.id),
                    (select max(log_date) from public.daily_logs where patient_id = p.id)) last_active
      from public.patients p) x), '[]');
end $$;
revoke all on function public.doctor_patients() from public, anon; grant execute on function public.doctor_patients() to authenticated;

-- ---------- One patient, everything for the profile screen ----------
create or replace function public.doctor_patient(pid uuid) returns json language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_team() then raise exception 'team only' using errcode = '42501'; end if;
  return json_build_object(
    'patient', (select row_to_json(p) from (select id, full_name, phone, invite_email, status, program, start_date, start_weight, target_weight,
                 height_cm, conditions, doctor_only, city, profile_id is not null as joined from public.patients where id = pid) p),
    'logs', coalesce((select json_agg(l order by l.log_date) from (select log_date, weight_kg, water_glasses, steps, mood from public.daily_logs where patient_id = pid and log_date >= current_date - 120) l), '[]'),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (select id, log_date, meal, photo_path, note, ai_tag, ai_items, doctor_reaction, created_at from public.checkins where patient_id = pid order by created_at desc limit 40) c), '[]'),
    'plans', coalesce((select json_agg(x order by x.week_no desc) from (select id, week_no, status, focus_goal, body, doctor_note, approved_at from public.plans where patient_id = pid) x), '[]'),
    'alerts', coalesce((select json_agg(a order by a.created_at desc) from (select id, note, status, created_at from public.alerts where patient_id = pid order by created_at desc limit 10) a), '[]')
  );
end $$;
revoke all on function public.doctor_patient(uuid) from public, anon; grant execute on function public.doctor_patient(uuid) to authenticated;

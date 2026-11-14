-- One round-trip for the patient home (was 4 sequential requests).
-- SECURITY INVOKER: runs with the caller's rights, so RLS still applies.
create or replace function public.patient_home()
returns json language sql stable security invoker set search_path = '' as $$
  with p as (
    select id, full_name, start_date, start_weight, target_weight, program, status
    from public.patients where profile_id = (select auth.uid()) limit 1
  )
  select json_build_object(
    'patient', (select row_to_json(p) from p),
    'logs', coalesce((select json_agg(l order by l.log_date) from (
        select id, log_date, weight_kg, water_glasses, steps, mood from public.daily_logs
        where patient_id = (select id from p) and log_date >= current_date - 90) l), '[]'::json),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (
        select id, log_date, meal, photo_path, note, doctor_reaction, created_at from public.checkins
        where patient_id = (select id from p) and log_date >= current_date - 90) c), '[]'::json),
    'plan', (select row_to_json(x) from (
        select id, week_no, status, focus_goal, body, doctor_note, approved_at from public.plans
        where patient_id = (select id from p) and status in ('approved', 'sent')
        order by week_no desc limit 1) x)
  )
$$;
revoke all on function public.patient_home() from public, anon;
grant execute on function public.patient_home() to authenticated;

-- Profile + latest consents in one round-trip (RLS applies: security invoker).
create or replace function public.me()
returns json language sql stable security invoker set search_path = '' as $$
  select json_build_object(
    'profile', (select row_to_json(x) from (select id, role, full_name, email, lang from public.profiles where id = (select auth.uid())) x),
    'consents', coalesce((select json_object_agg(type, granted) from public.current_consents where profile_id = (select auth.uid())), '{}'::json)
  )
$$;
revoke all on function public.me() from public, anon;
grant execute on function public.me() to authenticated;

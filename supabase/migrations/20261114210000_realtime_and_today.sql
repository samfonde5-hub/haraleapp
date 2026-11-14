-- Live updates (doctor sees new plates/messages/alerts without refresh; patient sees replies)
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.checkins; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.alerts; exception when duplicate_object then null; end;
end $$;

-- doctor_today: include ai_confidence for plate review detail
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
        select ch.id, ch.meal, ch.photo_path, ch.note, ch.ai_tag, ch.ai_items, ch.ai_confidence, ch.doctor_reaction, ch.created_at, ch.log_date, p.id patient_id, p.full_name
          from public.checkins ch join public.patients p on p.id = ch.patient_id
         where ch.log_date >= d - 1 order by ch.created_at desc limit 80) c), '[]'),
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

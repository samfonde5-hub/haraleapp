-- =====================================================================
-- Patient AI (early Phase 4): plate AI fields to patient + safety alerts
-- Mentor note: AI tag/tip sirf SERVER (Edge Function, service role) likhta hai.
-- Patient ke paas checkins pe UPDATE policy hai hi nahi, to wo fake tag nahi daal sakta.
-- =====================================================================

-- Safety button (PRD P16): AI is path pe KABHI jawab nahi deta — seedha doctor ko.
create table public.alerts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  kind        text not null default 'unwell' check (kind in ('unwell')),
  note        text check (char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'seen', 'resolved')),
  handled_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.alerts enable row level security;
create index alerts_open_idx on public.alerts (status, created_at desc);
create index alerts_patient_idx on public.alerts (patient_id, created_at desc);
create trigger alerts_updated_at before update on public.alerts
  for each row execute function private.set_updated_at();
create trigger alerts_audit after insert or update on public.alerts
  for each row execute function private.write_audit();

create policy "patient raises own alert" on public.alerts
  for insert to authenticated with check (patient_id = private.my_patient_id() and status = 'open');
create policy "patient reads own alerts, team reads all" on public.alerts
  for select to authenticated using (patient_id = private.my_patient_id() or private.is_team());
create policy "team handles alerts" on public.alerts
  for update to authenticated using (private.is_team()) with check (private.is_team());

-- Spam guard: ek patient 10 min me max 3 alerts
create or replace function private.alerts_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.alerts where patient_id = new.patient_id and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many alerts, please call' using errcode = '54000';
  end if;
  return new;
end $$;
create trigger alerts_rate before insert on public.alerts
  for each row execute function private.alerts_rate_limit();

-- patient_home now also returns AI tag/tip per check-in + last open alert
create or replace function public.patient_home() returns json language sql stable security invoker set search_path = '' as $$
  with p as (select id, full_name, start_date, start_weight, target_weight, program, status from public.patients where profile_id = (select auth.uid()) limit 1)
  select json_build_object('patient',(select row_to_json(p) from p),
    'logs', coalesce((select json_agg(l order by l.log_date) from (select id, log_date, weight_kg, water_glasses, steps, mood from public.daily_logs where patient_id=(select id from p) and log_date >= current_date - 90) l),'[]'::json),
    'checkins', coalesce((select json_agg(c order by c.created_at desc) from (select id, log_date, meal, photo_path, note, doctor_reaction, ai_tag, ai_items, created_at from public.checkins where patient_id=(select id from p) and log_date >= current_date - 90) c),'[]'::json),
    'plan', (select row_to_json(x) from (select id, week_no, status, focus_goal, body, doctor_note, approved_at from public.plans where patient_id=(select id from p) and status in ('approved','sent') order by week_no desc limit 1) x),
    'alert', (select row_to_json(a) from (select id, status, created_at from public.alerts where patient_id=(select id from p) and status <> 'resolved' and created_at > now() - interval '24 hours' order by created_at desc limit 1) a))
$$;
revoke all on function public.patient_home() from public, anon; grant execute on function public.patient_home() to authenticated;

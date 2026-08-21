-- Dashboard reads use a database aggregate instead of downloading every
-- registration and counting rows in a Vercel function.
create or replace view public.event_stats
with (security_invoker = true)
as
select
  e.id,
  e.organizer_id,
  e.name,
  e.description,
  e.starts_at,
  e.ends_at,
  e.location,
  e.capacity,
  e.created_at,
  count(distinct r.id)::integer as registered_count,
  count(distinct c.id)::integer as checked_in_count,
  greatest(e.capacity - count(distinct r.id)::integer, 0)::integer as spots_left
from public.events e
left join public.registrations r on r.event_id = e.id
left join public.checkins c on c.registration_id = r.id
group by e.id;

grant select on public.event_stats to authenticated;

-- Organizer-assisted lookup has the same ownership boundary as token
-- redemption, but does not depend on the attendee's short-lived QR token.
create or replace function public.manual_checkin_registration(
  p_registration_id uuid,
  p_client_event_id uuid,
  p_station_id text default 'manual-desk'
)
returns table (
  result text,
  registration_id uuid,
  attendee_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_registration public.registrations;
  v_event public.events;
  v_checkin public.checkins;
begin
  select r.* into v_registration
  from public.registrations r
  where r.id = p_registration_id
  for update;

  if v_registration.id is null then
    return query select 'invalid_registration', null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select e.* into v_event from public.events e where e.id = v_registration.event_id;
  if v_event.organizer_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Only the event organizer can check attendees in.';
  end if;

  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  if v_checkin.id is not null then
    return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
    return;
  end if;

  insert into public.checkins (registration_id, client_event_id, station_id)
  values (v_registration.id, p_client_event_id, coalesce(nullif(trim(p_station_id), ''), 'manual-desk'))
  returning * into v_checkin;

  return query select 'accepted', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
exception
  when unique_violation then
    select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
    return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
end;
$$;

revoke execute on function public.manual_checkin_registration(uuid, uuid, text) from public, anon;
grant execute on function public.manual_checkin_registration(uuid, uuid, text) to authenticated;

create index if not exists checkins_registration_id_idx on public.checkins(registration_id);

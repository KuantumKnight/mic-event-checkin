-- Clerk owns sessions; Supabase remains the protected event database.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists clerk_user_id text;

update public.profiles p
set email = lower(trim(u.email))
from auth.users u
where u.id = p.id and p.email is null and u.email is not null;

create unique index if not exists profiles_clerk_user_id_key on public.profiles (clerk_user_id) where clerk_user_id is not null;
create index if not exists profiles_email_idx on public.profiles (lower(email));

drop function if exists public.register_for_event(uuid, text, text);
create or replace function public.register_for_event(
  p_actor_profile_id uuid,
  p_event_id uuid,
  p_display_name text,
  p_email text default null
)
returns table (registration_id uuid, event_id uuid, qr_token text, token_expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_role text;
  v_capacity integer;
  v_registered integer;
  v_status public.event_status;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_registration public.registrations;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + interval '10 minutes';
begin
  select p.email, p.role into v_email, v_role from public.profiles p where p.id = p_actor_profile_id;
  if v_email is null or v_role <> 'attendee' then
    raise exception using errcode = '42501', message = 'Only attendee accounts can register.';
  end if;

  select e.capacity, e.status, e.starts_at, e.ends_at into v_capacity, v_status, v_starts_at, v_ends_at
  from public.events e where e.id = p_event_id for update;
  if v_capacity is null then raise exception using errcode = 'P0002', message = 'Event not found.'; end if;
  if v_status <> 'published' then raise exception using errcode = 'P0003', message = 'Registration is closed for this event.'; end if;
  if v_starts_at <= now() or (v_ends_at is not null and v_ends_at <= now()) then
    raise exception using errcode = 'P0004', message = 'Registration is closed because this event has started or ended.';
  end if;

  select count(*) into v_registered from public.registrations r where r.event_id = p_event_id;
  if v_registered >= v_capacity then raise exception using errcode = 'P0001', message = 'This event is at capacity.'; end if;

  insert into public.registrations (event_id, attendee_id, display_name, email)
  values (p_event_id, p_actor_profile_id, trim(p_display_name), v_email)
  returning * into v_registration;
  insert into public.registration_tokens (registration_id, token_hash, expires_at)
  values (v_registration.id, encode(digest(v_token, 'sha256'), 'hex'), v_expires);
  return query select v_registration.id, v_registration.event_id, v_token, v_expires;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'You are already registered for this event.';
end;
$$;

drop function if exists public.refresh_registration_token(uuid);
create or replace function public.refresh_registration_token(p_actor_profile_id uuid, p_registration_id uuid)
returns table (qr_token text, token_expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if not exists (select 1 from public.registrations r where r.id = p_registration_id and r.attendee_id = p_actor_profile_id) then
    raise exception using errcode = '42501', message = 'Registration not found.';
  end if;
  update public.registration_tokens set invalidated_at = now() where registration_id = p_registration_id and consumed_at is null;
  insert into public.registration_tokens (registration_id, token_hash, expires_at) values (p_registration_id, encode(digest(v_token, 'sha256'), 'hex'), v_expires);
  return query select v_token, v_expires;
end;
$$;

drop function if exists public.redeem_checkin_token(uuid, text, uuid, text);
create or replace function public.redeem_checkin_token(
  p_actor_profile_id uuid,
  p_event_id uuid,
  p_qr_token text,
  p_client_event_id uuid,
  p_station_id text default 'web-scanner'
)
returns table (result text, registration_id uuid, attendee_name text, checked_in_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_scanner_event public.events;
  v_token public.registration_tokens;
  v_registration public.registrations;
  v_event public.events;
  v_checkin public.checkins;
begin
  select e.* into v_scanner_event from public.events e where e.id = p_event_id;
  if v_scanner_event.id is null or v_scanner_event.organizer_id <> p_actor_profile_id then
    raise exception using errcode = '42501', message = 'Only the event organizer can use this scanner.';
  end if;
  select rt.* into v_token from public.registration_tokens rt where rt.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex') for update;
  if v_token.id is null then return query select 'invalid_token', null::uuid, null::text, null::timestamptz; return; end if;
  select r.* into v_registration from public.registrations r where r.id = v_token.registration_id for update;
  select e.* into v_event from public.events e where e.id = v_registration.event_id;
  if v_event.organizer_id <> p_actor_profile_id then raise exception using errcode = '42501', message = 'Only the event organizer can check attendees in.'; end if;
  if v_registration.event_id <> p_event_id then return query select 'wrong_event', v_registration.id, v_registration.display_name, null::timestamptz; return; end if;
  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  if v_checkin.id is not null then return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at; return; end if;
  if v_token.consumed_at is not null or v_token.invalidated_at is not null then return query select 'invalid_token', v_registration.id, v_registration.display_name, null::timestamptz; return; end if;
  if v_token.expires_at <= now() then return query select 'expired_token', v_registration.id, v_registration.display_name, null::timestamptz; return; end if;
  insert into public.checkins (registration_id, client_event_id, station_id) values (v_registration.id, p_client_event_id, coalesce(nullif(trim(p_station_id), ''), 'web-scanner')) returning * into v_checkin;
  update public.registration_tokens set consumed_at = now() where id = v_token.id;
  return query select 'accepted', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
exception when unique_violation then
  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
end;
$$;

drop function if exists public.manual_checkin_registration(uuid, uuid, uuid, text);
create or replace function public.manual_checkin_registration(
  p_actor_profile_id uuid,
  p_event_id uuid,
  p_registration_id uuid,
  p_client_event_id uuid,
  p_station_id text default 'manual-desk'
)
returns table (result text, registration_id uuid, attendee_name text, checked_in_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_registration public.registrations;
  v_event public.events;
  v_checkin public.checkins;
begin
  select r.* into v_registration from public.registrations r where r.id = p_registration_id for update;
  if v_registration.id is null then return query select 'invalid_registration', null::uuid, null::text, null::timestamptz; return; end if;
  if v_registration.event_id <> p_event_id then return query select 'wrong_event', v_registration.id, v_registration.display_name, null::timestamptz; return; end if;
  select e.* into v_event from public.events e where e.id = p_event_id;
  if v_event.organizer_id <> p_actor_profile_id then raise exception using errcode = '42501', message = 'Only the event organizer can check attendees in.'; end if;
  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  if v_checkin.id is not null then return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at; return; end if;
  insert into public.checkins (registration_id, client_event_id, station_id) values (v_registration.id, p_client_event_id, coalesce(nullif(trim(p_station_id), ''), 'manual-desk')) returning * into v_checkin;
  return query select 'accepted', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
exception when unique_violation then
  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
end;
$$;

drop function if exists public.cancel_registration(uuid);
create or replace function public.cancel_registration(p_actor_profile_id uuid, p_registration_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_registration public.registrations;
begin
  select r.* into v_registration from public.registrations r where r.id = p_registration_id and r.attendee_id = p_actor_profile_id for update;
  if v_registration.id is null then raise exception using errcode = 'P0002', message = 'Registration not found.'; end if;
  if exists (select 1 from public.checkins c where c.registration_id = v_registration.id) then raise exception using errcode = 'P0001', message = 'A checked-in registration cannot be cancelled.'; end if;
  delete from public.registration_tokens where registration_id = v_registration.id;
  delete from public.registrations where id = v_registration.id;
  return 'cancelled';
end;
$$;

revoke execute on function public.register_for_event(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.refresh_registration_token(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.redeem_checkin_token(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.manual_checkin_registration(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_registration(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, uuid, text, text) to service_role;
grant execute on function public.refresh_registration_token(uuid, uuid) to service_role;
grant execute on function public.redeem_checkin_token(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.manual_checkin_registration(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.cancel_registration(uuid, uuid) to service_role;

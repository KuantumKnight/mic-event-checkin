-- MIC Event Check-in
-- The two write paths below are intentionally database-owned:
-- 1. register_for_event locks the event row before counting registrations.
-- 2. redeem_checkin_token locks the registration row before accepting a check-in.
-- This keeps capacity and duplicate prevention correct across multiple Vercel instances.

create extension if not exists pgcrypto;

create type public.app_role as enum ('attendee', 'organizer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'attendee',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default 'MIC Commons',
  capacity integer not null check (capacity between 1 and 10000),
  created_at timestamptz not null default now(),
  constraint event_dates_make_sense check (ends_at is null or ends_at > starts_at)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  email text not null,
  created_at timestamptz not null default now(),
  unique (event_id, attendee_id)
);

create table public.registration_tokens (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  client_event_id uuid not null unique,
  station_id text not null default 'web-scanner',
  checked_in_at timestamptz not null default now()
);

create index registrations_event_id_idx on public.registrations(event_id);
create index registrations_attendee_id_idx on public.registrations(attendee_id);
create unique index registrations_event_email_idx on public.registrations(event_id, lower(email));
create index registration_tokens_registration_id_idx on public.registration_tokens(registration_id);
create index checkins_checked_in_at_idx on public.checkins(checked_in_at);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_tokens enable row level security;
alter table public.checkins enable row level security;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select on public.registrations to authenticated;
grant select on public.registration_tokens to authenticated;
grant select on public.checkins to authenticated;

create policy "users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "authenticated users can discover events"
  on public.events for select to authenticated
  using (true);

create policy "organizers can create their own events"
  on public.events for insert to authenticated
  with check (
    organizer_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'organizer')
  );

create policy "organizers can update their own events"
  on public.events for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "organizers can delete their own events"
  on public.events for delete to authenticated
  using (organizer_id = (select auth.uid()));

create policy "attendees and organizers can read relevant registrations"
  on public.registrations for select to authenticated
  using (
    attendee_id = (select auth.uid())
    or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = (select auth.uid()))
  );

create policy "attendees can read their own tokens"
  on public.registration_tokens for select to authenticated
  using (
    exists (
      select 1 from public.registrations r
      where r.id = registration_id and r.attendee_id = (select auth.uid())
    )
  );

create policy "organizers can read event check-ins"
  on public.checkins for select to authenticated
  using (
    exists (
      select 1
      from public.registrations r
      join public.events e on e.id = r.event_id
      where r.id = registration_id and e.organizer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.registrations r
      where r.id = registration_id and r.attendee_id = (select auth.uid())
    )
  );

-- The RPCs are the only authenticated write surface for registrations and check-ins.
-- They are SECURITY DEFINER because the client must not receive direct insert privileges;
-- every function performs an explicit auth.uid() ownership/organizer check before writing.
revoke insert, update, delete on public.registrations from authenticated;
revoke insert, update, delete on public.registration_tokens from authenticated;
revoke insert, update, delete on public.checkins from authenticated;

create or replace function public.register_for_event(
  p_event_id uuid,
  p_display_name text,
  p_email text
)
returns table (
  registration_id uuid,
  event_id uuid,
  qr_token text,
  token_expires_at timestamptz
)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_capacity integer;
  v_registered integer;
  v_registration public.registrations;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'You must be signed in to register.';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception using errcode = '42501', message = 'Profile is not ready yet.';
  end if;

  -- Lock the event row. Concurrent registration requests for the same event queue here.
  select e.capacity into v_capacity
  from public.events e
  where e.id = p_event_id
  for update;

  if v_capacity is null then
    raise exception using errcode = 'P0002', message = 'Event not found.';
  end if;

  select count(*) into v_registered
  from public.registrations r
  where r.event_id = p_event_id;

  if v_registered >= v_capacity then
    raise exception using errcode = 'P0001', message = 'This event is at capacity.';
  end if;

  insert into public.registrations (event_id, attendee_id, display_name, email)
  values (p_event_id, v_user_id, trim(p_display_name), lower(trim(p_email)))
  returning * into v_registration;

  insert into public.registration_tokens (registration_id, token_hash, expires_at)
  values (
    v_registration.id,
    encode(digest(v_token, 'sha256'), 'hex'),
    v_expires
  );

  return query select v_registration.id, v_registration.event_id, v_token, v_expires;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'You are already registered for this event.';
end;
$$;

grant execute on function public.register_for_event(uuid, text, text) to authenticated;

create or replace function public.refresh_registration_token(p_registration_id uuid)
returns table (qr_token text, token_expires_at timestamptz)
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + interval '10 minutes';
begin
  if not exists (
    select 1 from public.registrations r
    where r.id = p_registration_id and r.attendee_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Registration not found.';
  end if;

  update public.registration_tokens
  set invalidated_at = now()
  where registration_id = p_registration_id and consumed_at is null and invalidated_at is null;

  insert into public.registration_tokens (registration_id, token_hash, expires_at)
  values (p_registration_id, encode(digest(v_token, 'sha256'), 'hex'), v_expires);

  return query select v_token, v_expires;
end;
$$;

grant execute on function public.refresh_registration_token(uuid) to authenticated;

create or replace function public.redeem_checkin_token(
  p_qr_token text,
  p_client_event_id uuid,
  p_station_id text default 'web-scanner'
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
  v_token public.registration_tokens;
  v_registration public.registrations;
  v_event public.events;
  v_checkin public.checkins;
begin
  select rt.* into v_token
  from public.registration_tokens rt
  where rt.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
  for update;

  if v_token.id is null then
    return query select 'invalid_token', null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select r.* into v_registration
  from public.registrations r
  where r.id = v_token.registration_id
  for update;

  select e.* into v_event from public.events e where e.id = v_registration.event_id;
  if v_event.organizer_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Only the event organizer can check attendees in.';
  end if;

  select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
  if v_checkin.id is not null then
    return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
    return;
  end if;

  if v_token.consumed_at is not null or v_token.invalidated_at is not null then
    return query select 'invalid_token', v_registration.id, v_registration.display_name, null::timestamptz;
    return;
  end if;

  if v_token.expires_at <= now() then
    return query select 'expired_token', v_registration.id, v_registration.display_name, null::timestamptz;
    return;
  end if;

  insert into public.checkins (registration_id, client_event_id, station_id)
  values (v_registration.id, p_client_event_id, coalesce(nullif(trim(p_station_id), ''), 'web-scanner'))
  returning * into v_checkin;

  update public.registration_tokens set consumed_at = now() where id = v_token.id;

  return query select 'accepted', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
exception
  when unique_violation then
    select c.* into v_checkin from public.checkins c where c.registration_id = v_registration.id;
    return query select 'already_checked_in', v_registration.id, v_registration.display_name, v_checkin.checked_in_at;
end;
$$;

grant execute on function public.redeem_checkin_token(text, uuid, text) to authenticated;

-- The dashboard subscribes to these rows through Supabase Realtime.
alter publication supabase_realtime add table public.events, public.registrations, public.checkins;

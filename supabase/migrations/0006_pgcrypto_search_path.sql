-- Supabase installs pgcrypto functions in the extensions schema.
-- Keep security-definer RPCs able to resolve gen_random_bytes and digest.
alter function public.register_for_event(uuid, uuid, text, text)
  set search_path = public, extensions, pg_temp;

alter function public.refresh_registration_token(uuid, uuid)
  set search_path = public, extensions, pg_temp;

alter function public.redeem_checkin_token(uuid, uuid, text, uuid, text)
  set search_path = public, extensions, pg_temp;

alter function public.manual_checkin_registration(uuid, uuid, uuid, uuid, text)
  set search_path = public, extensions, pg_temp;

alter function public.cancel_registration(uuid, uuid)
  set search_path = public, extensions, pg_temp;

-- Keep SECURITY DEFINER functions callable only through the intended paths.
-- The auth trigger calls handle_new_user internally; it is not an API endpoint.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.register_for_event(uuid, text, text) from public, anon;
grant execute on function public.register_for_event(uuid, text, text) to authenticated;

revoke execute on function public.refresh_registration_token(uuid) from public, anon;
grant execute on function public.refresh_registration_token(uuid) to authenticated;

revoke execute on function public.redeem_checkin_token(text, uuid, text) from public, anon;
grant execute on function public.redeem_checkin_token(text, uuid, text) to authenticated;

create index if not exists events_organizer_id_idx on public.events(organizer_id);

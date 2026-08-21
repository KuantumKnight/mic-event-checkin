import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view this pass.", 401);
  const { registrationId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("id, display_name, email, created_at, attendee_id, events(id, name, description, starts_at, ends_at, location, capacity), checkins(checked_in_at, station_id)")
    .eq("id", registrationId)
    .eq("attendee_id", profile.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!data) return jsonError("Pass not found.", 404);
  return NextResponse.json({ registration: { ...data, events: Array.isArray(data.events) ? data.events[0] ?? null : data.events } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to cancel this registration.", 401);
  const { registrationId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_registration", { p_registration_id: registrationId });
  if (error) return jsonError(error.message, supabaseErrorStatus(error.message));
  return NextResponse.json({ result: data });
}

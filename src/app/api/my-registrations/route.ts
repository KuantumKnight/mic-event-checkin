import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view your registrations.", 401);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("id, display_name, email, created_at, events(id, name, starts_at, ends_at, location, capacity), checkins(checked_in_at)")
    .eq("attendee_id", profile.id)
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ registrations: data ?? [] });
}

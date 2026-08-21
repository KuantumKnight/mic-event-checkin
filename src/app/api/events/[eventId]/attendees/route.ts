import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view attendees.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can view attendee lists.", 403);

  const { eventId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("id, display_name, email, created_at, checkins(checked_in_at, station_id)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ attendees: data ?? [] });
}

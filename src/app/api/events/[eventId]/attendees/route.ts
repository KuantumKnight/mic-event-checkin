import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view attendees.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can view attendee lists.", 403);

  const { eventId } = await params;
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase.from("events").select("id").eq("id", eventId).eq("organizer_id", profile.id).maybeSingle();
  if (eventError) return jsonError(eventError.message, 400);
  if (!event) return jsonError("Event not found.", 404);
  let attendeesQuery = supabase
    .from("registrations")
    .select("id, display_name, email, created_at, checkins(checked_in_at, station_id)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (query) {
    const safeQuery = query.replaceAll(",", " ").replaceAll("%", "").replaceAll("_", "");
    attendeesQuery = attendeesQuery.or(`display_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`);
  }
  const { data, error } = await attendeesQuery.limit(query ? 10 : 500);

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ attendees: data ?? [] });
}

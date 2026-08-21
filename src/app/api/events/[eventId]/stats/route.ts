import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view event stats.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can view event stats.", 403);

  const { eventId } = await params;
  const supabase = await createClient();
  const [{ data: stats, error: statsError }, { data: attendees, error: attendeesError }] = await Promise.all([
    supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, registered_count, checked_in_count, spots_left").eq("id", eventId).single(),
    supabase.from("registrations").select("id, display_name, email, created_at, checkins(checked_in_at, station_id)").eq("event_id", eventId).order("created_at", { ascending: false }).limit(8),
  ]);

  if (statsError || !stats) return jsonError("Event not found.", 404);
  if (attendeesError) return jsonError(attendeesError.message, 400);

  const checkedInTimes = (attendees ?? []).flatMap((row) => (row.checkins ?? []).map((checkin) => checkin.checked_in_at));
  return NextResponse.json({
    stats: {
      ...stats,
      arrival_rate: Math.round((stats.checked_in_count / Math.max(stats.registered_count, 1)) * 100),
      no_shows: Math.max(stats.registered_count - stats.checked_in_count, 0),
      recent_arrivals: (attendees ?? []).filter((row) => row.checkins?.[0]).slice(0, 6),
      latest_checkin_at: checkedInTimes[0] ?? null,
    },
  });
}

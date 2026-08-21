import { createClient, getProfile } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to export attendance.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can export attendance.", 403);

  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase.from("events").select("id").eq("id", eventId).eq("organizer_id", profile.id).maybeSingle();
  if (eventError) return jsonError(eventError.message, 400);
  if (!event) return jsonError("Event not found.", 404);
  const { data, error } = await supabase
    .from("registrations")
    .select("display_name, email, created_at, checkins(checked_in_at, station_id)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 400);
  const rows = [
    ["Name", "Email", "Registered at", "Checked in at", "Station"],
    ...(data ?? []).map((row) => {
      const checkin = row.checkins?.[0];
      return [row.display_name, row.email, row.created_at, checkin?.checked_in_at ?? "No-show", checkin?.station_id ?? ""];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${eventId}-attendees.csv"`,
    },
  });
}

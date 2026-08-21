import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, supabaseErrorStatus } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const createEventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().min(2).max(160).default("MIC Commons"),
  capacity: z.number().int().min(1).max(10000),
});

export async function GET() {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to view events.", 401);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_stats")
    .select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, created_at, registered_count, checked_in_count, spots_left")
    .order("starts_at", { ascending: true });

  if (error) return jsonError(error.message, supabaseErrorStatus(error.message));

  return NextResponse.json({
    events: (data ?? []).map((event) => ({
      ...event,
      registered: event.registered_count,
      checkedIn: event.checked_in_count,
    })),
  });
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to create an event.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can create events.", 403);

  const parsed = createEventSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Please check the event details.", 422, parsed.error.flatten());

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organizer_id: profile.id,
      name: parsed.data.name,
      description: parsed.data.description,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      location: parsed.data.location,
      capacity: parsed.data.capacity,
    })
    .select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, created_at")
    .single();

  if (error) return jsonError(error.message, supabaseErrorStatus(error.message));
  return NextResponse.json({ event: data }, { status: 201 });
}

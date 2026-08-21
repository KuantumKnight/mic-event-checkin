import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, supabaseErrorStatus } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const updateSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(2000).optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime().optional(), location: z.string().trim().min(2).max(160), capacity: z.number().int().min(1).max(10000), status: z.enum(["draft", "published", "cancelled", "archived"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) return jsonError("Sign in to edit events.", 401); if (profile.role !== "organizer") return jsonError("Only organizers can edit events.", 403);
  const parsed = updateSchema.safeParse(await request.json()); if (!parsed.success) return jsonError("Please check the event details.", 422, parsed.error.flatten());
  const { eventId } = await params; const supabase = await createClient(); const { data, error } = await supabase.from("events").update({ name: parsed.data.name, description: parsed.data.description, starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, location: parsed.data.location, capacity: parsed.data.capacity, status: parsed.data.status }).eq("id", eventId).eq("organizer_id", profile.id).select("id, name, description, starts_at, ends_at, location, capacity, status").single();
  if (error) return jsonError(error.message, supabaseErrorStatus(error.message)); return NextResponse.json({ event: data });
}

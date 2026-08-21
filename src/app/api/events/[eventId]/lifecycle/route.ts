import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, supabaseErrorStatus } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["cancelled", "archived"]) });

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to update event lifecycle.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can update event lifecycle.", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Choose a valid lifecycle action.", 422, parsed.error.flatten());
  const { eventId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update({ status: parsed.data.status }).eq("id", eventId).eq("organizer_id", profile.id).select("id, status").single();
  if (error) return jsonError(error.message, supabaseErrorStatus(error.message));
  return NextResponse.json({ event: data });
}

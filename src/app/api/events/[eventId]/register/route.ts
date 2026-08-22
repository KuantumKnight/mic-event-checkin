import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, supabaseErrorStatus } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
});

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to register for this event.", 401);

  const parsed = registrationSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Enter a valid name.", 422, parsed.error.flatten());
  const { eventId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", {
    p_actor_profile_id: profile.id,
    p_event_id: eventId,
    p_display_name: parsed.data.displayName,
    p_email: null,
  });

  if (error) {
    const message = /capacity/i.test(error.message)
      ? "This event is full. Choose another event or try again if a place becomes available."
      : /already registered|duplicate|unique/i.test(error.message)
        ? "You are already registered for this event."
        : /started|ended|closed/i.test(error.message)
          ? "Registration is closed for this event."
          : /only attendee|profile/i.test(error.message)
            ? "Your attendee profile is not ready yet. Please sign in again."
            : "Registration could not be completed. Please try again.";
    return jsonError(message, supabaseErrorStatus(error.message));
  }
  return NextResponse.json({ registration: data?.[0] ?? null }, { status: 201 });
}

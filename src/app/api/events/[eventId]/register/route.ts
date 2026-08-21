import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, supabaseErrorStatus } from "@/lib/http";
import { createClient, getClaims } from "@/lib/supabase/server";

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
});

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const claims = await getClaims();
  if (!claims?.sub) return jsonError("Sign in to register for this event.", 401);

  const parsed = registrationSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Enter a valid name.", 422, parsed.error.flatten());
  const { eventId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_display_name: parsed.data.displayName,
    p_email: null,
  });

  if (error) return jsonError(error.message, supabaseErrorStatus(error.message));
  return NextResponse.json({ registration: data?.[0] ?? null }, { status: 201 });
}

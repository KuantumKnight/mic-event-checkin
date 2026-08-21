import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const schema = z.object({ registrationId: z.string().uuid() });

export async function POST(_request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to refresh your QR code.", 401);
  const { registrationId } = await params;
  const parsed = schema.safeParse({ registrationId });
  if (!parsed.success) return jsonError("Registration not found.", 404);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refresh_registration_token", {
    p_actor_profile_id: profile.id,
    p_registration_id: registrationId,
  });
  if (error) return jsonError(error.message, /not found|permission/i.test(error.message) ? 403 : 400);
  return NextResponse.json({ token: data?.[0] ?? null });
}

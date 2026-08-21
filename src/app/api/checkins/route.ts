import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const checkinSchema = z.object({
  qrToken: z.string().min(16),
  clientEventId: z.string().uuid().default(() => randomUUID()),
  stationId: z.string().trim().max(80).default("web-scanner"),
});

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to check attendees in.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can check attendees in.", 403);

  const parsed = checkinSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("That QR code is not valid.", 422, parsed.error.flatten());
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_checkin_token", {
    p_qr_token: parsed.data.qrToken,
    p_client_event_id: parsed.data.clientEventId,
    p_station_id: parsed.data.stationId,
  });

  if (error) return jsonError(error.message, 400);
  const result = data?.[0];
  if (!result) return jsonError("The scanner returned no result.", 502);
  if (result.result === "accepted") return NextResponse.json({ checkin: result });
  if (result.result === "already_checked_in") return NextResponse.json({ checkin: result, error: "Already checked in." }, { status: 409 });
  if (result.result === "expired_token") return NextResponse.json({ checkin: result, error: "This QR code has expired. Ask the attendee to refresh it." }, { status: 410 });
  return NextResponse.json({ checkin: result, error: "This QR code is not valid." }, { status: 400 });
}

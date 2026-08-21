import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getProfile } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to continue.", 401);
  return NextResponse.json({ profile });
}

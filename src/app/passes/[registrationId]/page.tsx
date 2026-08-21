import { notFound, redirect } from "next/navigation";
import { PassClient } from "@/components/pass-client";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PassPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login");
  const { registrationId } = await params; const supabase = await createClient(); const { data } = await supabase.from("registrations").select("id, display_name, email, events(id, name, description, starts_at, ends_at, location), checkins(checked_in_at, station_id)").eq("id", registrationId).eq("attendee_id", profile.id).maybeSingle();
  if (!data) notFound();
  return <PassClient initialRegistration={data} />;
}

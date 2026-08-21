import { notFound, redirect } from "next/navigation";
import { ScannerWorkstation } from "@/components/scanner-workstation";
import type { EventSummary } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login"); if (profile.role !== "organizer") redirect("/events");
  const { eventId } = await params; const supabase = await createClient(); const { data } = await supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, registered_count, checked_in_count, spots_left, status").eq("id", eventId).single();
  if (!data) notFound();
  return <ScannerWorkstation event={data as EventSummary} />;
}

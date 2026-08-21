import { notFound, redirect } from "next/navigation";
import { EventRegistrationForm } from "@/components/event-registration-form";
import type { EventSummary } from "@/lib/event-types";
import { createClient, getClaims, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventRegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  const claims = await getClaims();
  if (!profile) redirect("/login");
  if (profile.role !== "attendee") redirect("/events");
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: catalog } = await supabase.rpc("list_event_catalog");
  const event = (catalog ?? []).find((item) => item.id === eventId) as EventSummary | undefined;
  if (!event) notFound();
  return <EventRegistrationForm event={event} attendeeName={profile.full_name || String(claims?.email || "").split("@")[0]} attendeeEmail={String(claims?.email || "")} />;
}

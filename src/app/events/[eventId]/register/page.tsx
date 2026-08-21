import { notFound, redirect } from "next/navigation";
import { EventRegistrationForm } from "@/components/event-registration-form";
import type { EventSummary } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventRegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "attendee") redirect("/events");
  const { eventId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("id, name, description, starts_at, ends_at, location, capacity").eq("id", eventId).single();
  if (!data) notFound();
  const { count } = await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const event = { ...data, registered_count: count ?? 0, checked_in_count: 0, spots_left: Math.max(data.capacity - (count ?? 0), 0) } as EventSummary;
  return <EventRegistrationForm event={event} />;
}

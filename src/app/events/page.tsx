import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventList } from "@/components/event-list";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { EventSummary, Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";
import { AttendeeEvents } from "@/components/attendee-events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, created_at, registered_count, checked_in_count, spots_left").order("starts_at", { ascending: true });
  const events = (data ?? []) as EventSummary[];
  if (profile.role === "attendee") return <AttendeeEvents initialEvents={events} profileName={profile.full_name || ""} />;
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Events" title="A clear list of every room." description="Create, inspect, export, and open a check-in desk from the event record." action={<Link className="button button-primary" href="/events/new"><Plus size={16} /> New event</Link>} /><EventList events={events} /></OrganizerShell>;
}

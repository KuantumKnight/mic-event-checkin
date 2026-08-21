import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventList } from "@/components/event-list";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { EventSummary, Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";
import { AttendeeEvents } from "@/components/attendee-events";
import { DataError } from "@/components/data-error";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  if (profile.role === "attendee") {
    const { data, error } = await supabase.rpc("list_event_catalog");
    if (error) return <DataError message="Published events could not be loaded." onRetry="/events" />;
    return <AttendeeEvents initialEvents={(data ?? []).map((event) => ({ ...event, organizer_id: undefined, created_at: undefined })) as EventSummary[]} profileName={profile.full_name || ""} />;
  }
  const { data, error } = await supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, created_at, registered_count, checked_in_count, spots_left, status").order("starts_at", { ascending: true });
  if (error) return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Events" title="A clear list of every room." description="The event record could not be loaded." /><DataError message="Events could not be loaded." onRetry="/events" /></OrganizerShell>;
  const events = (data ?? []) as EventSummary[];
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Events" title="A clear list of every room." description="Create, inspect, export, and open a check-in desk from the event record." action={<Link className="button button-primary" href="/events/new"><Plus size={16} /> New event</Link>} /><EventList events={events} /></OrganizerShell>;
}

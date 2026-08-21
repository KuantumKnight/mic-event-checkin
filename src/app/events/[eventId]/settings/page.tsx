import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventSettingsForm } from "@/components/event-settings-form";
import { EventLifecycleActions } from "@/components/event-lifecycle-actions";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { EventSummary, Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login"); if (profile.role !== "organizer") redirect("/events"); const { eventId } = await params; const supabase = await createClient(); const { data } = await supabase.from("events").select("id, name, description, starts_at, ends_at, location, capacity, status").eq("id", eventId).single(); if (!data) notFound();
  const event = { ...data, registered_count: 0, checked_in_count: 0, spots_left: data.capacity } as EventSummary;
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Settings" title={event.name} description="Update the event record used by attendee registration and the scanner." /><div className="subnav"><Link href={`/events/${eventId}/overview`}><ArrowLeft size={14} /> Overview</Link><Link href={`/events/${eventId}/registrations`}>Registrations</Link><Link href={`/events/${eventId}/check-ins`}>Check-ins</Link><Link className="active" href={`/events/${eventId}/settings`}>Settings</Link></div><EventSettingsForm event={event} /><div className="lifecycle-panel"><span className="eyebrow">Lifecycle</span><h2>{event.status}</h2><p>Cancellation closes registration. Archiving keeps the record without exposing it to attendees.</p><EventLifecycleActions eventId={eventId} status={event.status} /></div><section className="info-note"><Info size={17} /><p><strong>QR validity is intentionally short.</strong> Attendee passes expire after 10 minutes. An offline scan can reconcile only before that token expires; expired queue records remain visible on the workstation for review.</p><Link className="text-link" href={`/scan/${eventId}`}>Open scanner <ExternalLink size={14} /></Link></section></OrganizerShell>;
}

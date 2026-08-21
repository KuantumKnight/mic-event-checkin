import { ArrowLeft, Download, Mail, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login"); if (profile.role !== "organizer") redirect("/events");
  const { eventId } = await params; const supabase = await createClient();
  const [{ data: event }, { data: registrations }] = await Promise.all([supabase.from("events").select("id, name").eq("id", eventId).eq("organizer_id", profile.id).single(), supabase.from("registrations").select("id, display_name, email, created_at, checkins(checked_in_at, station_id)").eq("event_id", eventId).order("created_at", { ascending: true })]);
  if (!event) notFound();
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Registrations" title={event.name} description="The registration record is the source of truth for capacity and attendee identity." action={<a className="button button-outline" href={`/api/events/${eventId}/export`}><Download size={15} /> Export CSV</a>} /><div className="subnav"><Link href={`/events/${eventId}/overview`}><ArrowLeft size={14} /> Overview</Link><Link className="active" href={`/events/${eventId}/registrations`}>Registrations</Link><Link href={`/events/${eventId}/check-ins`}>Check-ins</Link><Link href={`/events/${eventId}/settings`}>Settings</Link></div><section className="table-panel"><div className="table-summary"><span><Users size={16} /> {registrations?.length ?? 0} registered</span></div>{registrations?.length ? <div className="data-table"><div className="data-table-head"><span>Attendee</span><span>Registered</span><span>Arrival</span></div>{registrations.map((registration) => <div className="data-table-row" key={registration.id}><span><strong>{registration.display_name}</strong><small><Mail size={12} /> {registration.email}</small></span><span>{new Date(registration.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><span className={registration.checkins?.[0] ? "text-success" : "muted"}>{registration.checkins?.[0] ? `Checked in · ${new Date(registration.checkins[0].checked_in_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Not checked in"}</span></div>)}</div> : <div className="empty-state compact"><Users size={20} /><h2>No registrations</h2><p>Attendees will appear here after they register.</p></div>}</section></OrganizerShell>;
}

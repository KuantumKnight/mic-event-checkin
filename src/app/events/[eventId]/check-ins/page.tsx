import { ArrowLeft, CheckCircle2, ScanLine } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckInsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login"); if (profile.role !== "organizer") redirect("/events");
  const { eventId } = await params; const supabase = await createClient(); const [{ data: event }, { data: registrations }] = await Promise.all([supabase.from("events").select("id, name").eq("id", eventId).eq("organizer_id", profile.id).single(), supabase.from("registrations").select("id, display_name, email, checkins(checked_in_at, station_id)").eq("event_id", eventId).order("created_at", { ascending: false })]);
  if (!event) notFound();
  const checkins = (registrations || []).filter((registration) => registration.checkins?.[0]);
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Check-ins" title={event.name} description="Every arrival shown here was accepted by the concurrency-safe database write path." action={<Link className="button button-dark" href={`/scan/${eventId}`}><ScanLine size={15} /> Open scanner</Link>} /><div className="subnav"><Link href={`/events/${eventId}/overview`}><ArrowLeft size={14} /> Overview</Link><Link href={`/events/${eventId}/registrations`}>Registrations</Link><Link className="active" href={`/events/${eventId}/check-ins`}>Check-ins</Link><Link href={`/events/${eventId}/settings`}>Settings</Link></div><section className="table-panel"><div className="table-summary"><span><CheckCircle2 size={16} /> {checkins.length} accepted arrivals</span></div>{checkins.length ? <div className="data-table"><div className="data-table-head"><span>Attendee</span><span>Checked in at</span><span>Station</span></div>{checkins.map((registration) => <div className="data-table-row" key={registration.id}><span><strong>{registration.display_name}</strong><small>{registration.email}</small></span><span>{new Date(registration.checkins[0].checked_in_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><span className="mono-label">{registration.checkins[0].station_id}</span></div>)}</div> : <div className="empty-state compact"><CheckCircle2 size={20} /><h2>No check-ins yet</h2><p>Open the scanner when the first attendee arrives.</p></div>}</section></OrganizerShell>;
}

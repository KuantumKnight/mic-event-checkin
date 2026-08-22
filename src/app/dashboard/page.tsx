import { ArrowUpRight, Plus, ScanLine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventList } from "@/components/event-list";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { EventSummary, Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";
import { DataError } from "@/components/data-error";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "attendee") return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, created_at, registered_count, checked_in_count, spots_left, status").eq("organizer_id", profile.id).order("starts_at", { ascending: true }).limit(6);
  if (error) return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Operations overview" title="Monitor event activity." description="The dashboard could not be loaded." /><DataError message="Dashboard data could not be loaded." onRetry="/dashboard" /></OrganizerShell>;
  const events = (data ?? []) as EventSummary[];
  const totalRegistered = events.reduce((sum, event) => sum + event.registered_count, 0);
  const totalCheckedIn = events.reduce((sum, event) => sum + event.checked_in_count, 0);
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Operations overview" title="Monitor event activity." description="Track registrations, arrivals, and scanner access from one place." action={<Link className="button button-primary" href="/events/new"><Plus size={16} /> New event</Link>} /><section className="metric-grid"><div className="metric-card"><span>Published events</span><strong>{events.length}</strong><small>Visible to signed-in attendees</small></div><div className="metric-card"><span>Registrations</span><strong>{totalRegistered}</strong><small>Across the events in view</small></div><div className="metric-card"><span>Arrivals</span><strong>{totalCheckedIn}</strong><small>Accepted at the check-in desk</small></div></section><section className="section-heading"><div><span className="eyebrow">Events</span><h2>Manage your events</h2></div><Link className="text-link" href="/events">View all events <ArrowUpRight size={15} /></Link></section><EventList events={events} /><section className="callout"><div><span className="eyebrow">Scanner</span><h2>Open a scanner for an event.</h2><p>Scan passes, search registrations, and reconcile offline scans from one workstation.</p></div><Link className="button button-dark" href={events[0] ? `/scan/${events[0].id}` : "/events"}><ScanLine size={16} /> Open scanner</Link></section></OrganizerShell>;
}

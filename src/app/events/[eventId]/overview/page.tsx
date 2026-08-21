import { notFound, redirect } from "next/navigation";
import { EventOverview } from "@/components/event-overview";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import type { EventStats, Profile } from "@/lib/event-types";
import { createClient, getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const profile = await getProfile(); if (!profile) redirect("/login"); if (profile.role !== "organizer") redirect("/events");
  const { eventId } = await params; const supabase = await createClient();
  const [{ data: stats }, { data: attendees }] = await Promise.all([supabase.from("event_stats").select("id, organizer_id, name, description, starts_at, ends_at, location, capacity, registered_count, checked_in_count, spots_left").eq("id", eventId).single(), supabase.from("registrations").select("id, display_name, email, created_at, checkins(checked_in_at, station_id)").eq("event_id", eventId).order("created_at", { ascending: false }).limit(8)]);
  if (!stats) notFound();
  const initialStats = { ...stats, arrival_rate: Math.round((stats.checked_in_count / Math.max(stats.registered_count, 1)) * 100), no_shows: Math.max(stats.registered_count - stats.checked_in_count, 0), latest_checkin_at: attendees?.flatMap((row) => row.checkins?.map((checkin) => checkin.checked_in_at) || [])[0] || null, recent_arrivals: (attendees || []).filter((row) => row.checkins?.[0]).slice(0, 6) } as EventStats;
  return <OrganizerShell profile={profile as Profile}><PageHeader eyebrow="Event overview" title="A live event record." description="Stats are aggregated in Postgres. The page refreshes when events, registrations, or check-ins change." /><EventOverview eventId={eventId} initialStats={initialStats} /></OrganizerShell>;
}

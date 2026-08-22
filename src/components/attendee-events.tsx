"use client";

import { ArrowUpRight, CalendarDays, CheckCircle2, Loader2, LogOut, MapPin, Ticket } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EventSummary } from "@/lib/event-types";
import { DataError } from "@/components/data-error";
import { BrandMark } from "@/components/brand-mark";

type Registration = { id: string; events: { id: string; name: string; starts_at: string; location: string } | null; checkins: Array<{ checked_in_at: string }> };

export function AttendeeEvents({ initialEvents, profileName }: { initialEvents: EventSummary[]; profileName: string }) {
  const { signOut: clerkSignOut } = useClerk();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadRegistrations() { setLoading(true); setLoadError(false); try { const response = await fetch("/api/my-registrations", { cache: "no-store" }); if (!response.ok) throw new Error("load failed"); const body = await response.json(); setRegistrations(body.registrations ?? []); } catch { setLoadError(true); } finally { setLoading(false); } }
  useEffect(() => { void loadRegistrations(); }, []);
  const registeredIds = new Set(registrations.map((registration) => registration.events?.id));

  async function signOut() { await clerkSignOut(); window.location.assign("/login"); }

  return <main className="attendee-page"><header className="attendee-header"><Link href="/events" className="site-wordmark"><BrandMark compact /><span>EVENTS</span></Link><div className="attendee-account"><span>{profileName || "Attendee"}</span><button onClick={signOut} aria-label="Sign out"><LogOut size={16} /></button></div></header><section className="attendee-hero"><span className="eyebrow">Attendee access</span><h1>Find an event.</h1><p>Register for an event and keep your pass ready for check-in.</p></section><section className="attendee-section"><div className="section-heading"><div><span className="eyebrow">Published events</span><h2>Available to register</h2></div></div>{!initialEvents.length ? <div className="empty-state"><CalendarDays size={22} /><h2>No published events</h2><p>There are no open events right now.</p></div> : <div className="attendee-event-grid">{initialEvents.map((event) => <article className="attendee-event-card" key={event.id}><div className="attendee-event-top"><span className="date-label">{new Date(event.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span><span className="status-chip">{event.spots_left} spots left</span></div><h3>{event.name}</h3><p>{event.description || "Event details will be shared here."}</p><div className="event-meta"><span><MapPin size={14} /> {event.location}</span><span><CalendarDays size={14} /> {new Date(event.starts_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span></div>{registeredIds.has(event.id) ? <Link className="button button-dark button-full" href={`/passes/${registrations.find((registration) => registration.events?.id === event.id)?.id}`}><Ticket size={16} /> View pass <ArrowUpRight size={15} /></Link> : <Link className="button button-outline button-full" href={`/events/${event.id}/register`}>Open event <ArrowUpRight size={15} /></Link>}</article>)}</div>}</section><section className="attendee-section"><div className="section-heading"><div><span className="eyebrow">Your passes</span><h2>Registered events</h2></div></div>{loadError ? <DataError message="Your passes could not be loaded." onRetry="/events" /> : loading ? <p className="muted"><Loader2 size={15} className="spin" /> Loading your registrations…</p> : registrations.length ? <div className="pass-list">{registrations.map((registration) => <Link className="pass-row" href={`/passes/${registration.id}`} key={registration.id}><span className="pass-icon"><Ticket size={17} /></span><span><strong>{registration.events?.name}</strong><small>{registration.events ? new Date(registration.events.starts_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Event"} · {registration.checkins?.[0] ? "Checked in" : "Not checked in"}</small></span><ArrowUpRight size={17} /></Link>)}</div> : <div className="quiet-note">Your registered passes will appear here.</div>}</section><footer className="attendee-footer">MIC Event Check-in</footer></main>;
}

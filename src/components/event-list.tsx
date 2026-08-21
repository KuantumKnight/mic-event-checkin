"use client";

import { ArrowUpRight, CalendarPlus, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { formatEventDate, type EventSummary } from "@/lib/event-types";

export function EventList({ events, attendee = false }: { events: EventSummary[]; attendee?: boolean }) {
  if (!events.length) return <div className="empty-state"><CalendarPlus size={22} /><h2>No events yet</h2><p>{attendee ? "Published MIC events will appear here." : "Create your first event when you are ready to open the desk."}</p>{!attendee && <Link className="button button-primary" href="/events/new">Create event</Link>}</div>;
  return <div className="event-list">{events.map((event) => <article className="event-row" key={event.id}><div className="event-date-block"><span>{new Date(event.starts_at).toLocaleDateString("en-IN", { month: "short" })}</span><strong>{new Date(event.starts_at).getDate()}</strong></div><div className="event-row-main"><span className="eyebrow">{formatEventDate(event.starts_at)}</span><h2>{event.name}</h2><p>{event.description || "No description added."}</p><div className="event-meta"><span><MapPin size={14} /> {event.location}</span><span><Users size={14} /> {event.registered_count} / {event.capacity} registered</span></div></div><div className="event-row-side"><span className="status-chip">{event.checked_in_count} arrived</span><Link className="icon-link" href={attendee ? `/events/${event.id}/register` : `/events/${event.id}/overview`} aria-label={`Open ${event.name}`}><ArrowUpRight size={18} /></Link></div></article>)}</div>;
}

"use client";

import { ArrowUpRight, CalendarPlus, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { formatEventDate, type EventSummary } from "@/lib/event-types";
import { useMemo, useState } from "react";

export function EventList({ events, attendee = false }: { events: EventSummary[]; attendee?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("soonest");
  const filteredEvents = useMemo(() => events.filter((event) => event.name.toLowerCase().includes(query.toLowerCase()) && (status === "all" || event.status === status)).sort((a, b) => sort === "latest" ? new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime() : new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()), [events, query, sort, status]);
  if (!events.length) return <div className="empty-state"><CalendarPlus size={22} /><h2>No events yet</h2><p>{attendee ? "Published MIC events will appear here." : "Create an event to start registration."}</p>{!attendee && <Link className="button button-primary" href="/events/new">Create event</Link>}</div>;
  return <><div className="list-controls"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events" aria-label="Search events" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter events by status"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort events"><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></div><div className="event-list">{filteredEvents.length ? filteredEvents.map((event) => <article className="event-row" key={event.id}><div className="event-date-block"><span>{new Date(event.starts_at).toLocaleDateString("en-IN", { month: "short" })}</span><strong>{new Date(event.starts_at).getDate()}</strong></div><div className="event-row-main"><span className="eyebrow">{formatEventDate(event.starts_at)}</span><h2>{event.name}</h2><p>{event.description || "No description added."}</p><div className="event-meta"><span><MapPin size={14} /> {event.location}</span><span><Users size={14} /> {event.registered_count} / {event.capacity} registered</span></div></div><div className="event-row-side"><span className="status-chip">{event.status} · {event.checked_in_count} arrived</span><Link className="icon-link" href={attendee ? `/events/${event.id}/register` : `/events/${event.id}/overview`} aria-label={`Open ${event.name}`}><ArrowUpRight size={18} /></Link></div></article>) : <div className="quiet-note">No events match those filters.</div>}</div></>;
}

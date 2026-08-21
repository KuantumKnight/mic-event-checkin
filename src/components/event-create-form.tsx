"use client";

import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function localDateTime(value: string) { return value ? new Date(value).toISOString() : undefined; }

export function EventCreateForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(form.get("name")), description: String(form.get("description") || ""), startsAt: localDateTime(String(form.get("startsAt"))), endsAt: localDateTime(String(form.get("endsAt") || "")), location: String(form.get("location")), capacity: Number(form.get("capacity")), status: String(form.get("status")) }) });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(body.error || "The event could not be created."); return; }
    window.location.assign(`/events/${body.event.id}/overview`);
  }
  return <form className="form-card event-form" onSubmit={submit}><div className="form-intro"><CalendarPlus size={20} /><div><span className="eyebrow">New event</span><h2>Give the room a clear shape.</h2><p>Every field is stored in Supabase and becomes part of the organizer record.</p></div></div><div className="form-grid"><label>Event name<input name="name" required minLength={2} maxLength={120} placeholder="MIC Open House" /></label><label>Location<input name="location" required defaultValue="MIC Commons" /></label><label>Starts at<input name="startsAt" type="datetime-local" required /></label><label>Ends at<input name="endsAt" type="datetime-local" /></label><label>Capacity<input name="capacity" type="number" min={1} max={10000} required defaultValue={100} /></label><label>Status<select name="status" defaultValue="published"><option value="published">Published — open registration</option><option value="draft">Draft — organizer only</option></select></label><label className="wide-field">Description<textarea name="description" rows={4} maxLength={2000} placeholder="What should attendees know before they arrive?" /></label></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="button button-quiet" href="/events"><ArrowLeft size={15} /> Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <CalendarPlus size={16} />} Create event</button></div></form>;
}

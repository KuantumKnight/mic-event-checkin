"use client";

import { ArrowLeft, Check, Loader2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EventSummary } from "@/lib/event-types";
import { BrandMark } from "@/components/brand-mark";

export function EventRegistrationForm({ event, attendeeName, attendeeEmail }: { event: EventSummary; attendeeName: string; attendeeEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(formEvent.currentTarget);
    const response = await fetch(`/api/events/${event.id}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: String(form.get("displayName")) }) });
    const body = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(body.error || "Registration could not be completed."); return; }
    if (body.registration?.registration_id) window.location.assign(`/passes/${body.registration.registration_id}`);
  }
  return <main className="attendee-page"><header className="attendee-header"><Link href="/events" className="site-wordmark"><BrandMark compact /><span>EVENTS</span></Link><Link className="text-link" href="/events"><ArrowLeft size={15} /> All events</Link></header><section className="register-layout"><div className="register-copy"><span className="eyebrow">Registration</span><h1>{event.name}</h1><p>{event.description || "Event details and registration instructions."}</p><div className="register-facts"><span><MapPin size={16} /> {event.location}</span><span><Users size={16} /> {event.spots_left} of {event.capacity} spots available</span><span>{new Date(event.starts_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</span></div></div><form className="form-card register-card" onSubmit={submit}><span className="eyebrow">Attendee details</span><h2>Register for this event</h2><p>Your signed-in account provides the attendee identity.</p><label>Full name<input name="displayName" required minLength={2} defaultValue={attendeeName} placeholder="Your name" /></label><label>Email address<input name="email" type="email" value={attendeeEmail} readOnly /></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary button-full" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Register for event</button><small className="form-help">Your QR pass expires after 10 minutes. Refresh it before check-in if needed.</small></form></section></main>;
}

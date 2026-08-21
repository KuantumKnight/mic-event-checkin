"use client";

import QRCode from "qrcode";
import { ArrowUpRight, CalendarDays, Check, Clock3, Loader2, MapPin, RefreshCw, Ticket, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

type EventItem = { id: string; name: string; starts_at: string; location: string; registered: number; capacity: number };
type Registration = { id: string; display_name: string; email: string; events: { id: string; name: string; starts_at: string; location: string } | null; checkins: Array<{ checked_in_at: string }> };

export function AttendeeHome() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [qrState, setQrState] = useState<{ registrationId: string; token: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ displayName: "", email: "" });

  async function load() {
    const [eventsResponse, registrationsResponse] = await Promise.all([fetch("/api/events"), fetch("/api/my-registrations")]);
    const eventsPayload = await eventsResponse.json();
    const registrationsPayload = await registrationsResponse.json();
    setEvents(eventsPayload.events ?? []);
    setRegistrations(registrationsPayload.registrations ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function register(event: EventItem) {
    setBusy(true);
    setNotice(null);
    const response = await fetch(`/api/events/${event.id}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: form.displayName, email: form.email }) });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) { setNotice(payload.error ?? "Registration failed."); return; }
    const registration = payload.registration;
    setQrState({ registrationId: registration.registration_id, token: registration.qr_token, expiresAt: registration.token_expires_at });
    setSelectedEvent(null);
    setNotice("You’re registered. Save this QR for the door.");
    await load();
  }

  async function refreshQr() {
    if (!qrState) return;
    setBusy(true);
    const response = await fetch(`/api/registrations/${qrState.registrationId}/token`, { method: "POST" });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) { setNotice(payload.error ?? "Could not refresh QR."); return; }
    setQrState({ registrationId: qrState.registrationId, token: payload.token.qr_token, expiresAt: payload.token.token_expires_at });
  }

  return <main className="attendee-page"><header className="attendee-header"><BrandMark /><div className="attendee-header-copy"><span className="eyebrow">Attendee space</span><h1>Show up for what matters.</h1><p>Your events, your pass, one calm screen.</p></div><div className="attendee-header-orb"><Ticket size={24} /></div></header><div className="attendee-content">{notice && <div className="attendee-notice"><Check size={16} />{notice}</div>}<section><div className="attendee-section-heading"><div><span className="eyebrow">Your passes</span><h2>Registered events</h2></div></div>{registrations.length ? <div className="pass-grid">{registrations.map((registration) => <div className="pass-card" key={registration.id}><div className="pass-card-top"><span className="pass-icon"><Ticket size={18} /></span><span className={registration.checkins.length ? "status-badge live" : "status-badge"}>{registration.checkins.length ? "Checked in" : "Registered"}</span></div><h3>{registration.events?.name ?? "MIC event"}</h3><div className="pass-meta"><span><CalendarDays size={13} />{registration.events ? new Date(registration.events.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date TBA"}</span><span><MapPin size={13} />{registration.events?.location ?? "MIC Commons"}</span></div><button className="button button-secondary" onClick={() => setQrState({ registrationId: registration.id, token: "", expiresAt: "" })}>Show my QR <ArrowUpRight size={14} /></button></div>)}</div> : <div className="empty-pass"><Ticket size={25} /><h3>No passes yet</h3><p>Choose an event below and your unique QR pass will appear here.</p></div>}</section><section className="browse-section"><div className="attendee-section-heading"><div><span className="eyebrow">Open to the community</span><h2>Find an event</h2></div><button className="text-button" onClick={() => void load()}>Refresh <RefreshCw size={13} /></button></div><div className="browse-grid">{events.map((event) => <div className="browse-card" key={event.id}><div className="browse-card-top"><span className="browse-date">{new Date(event.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span><span>{Math.max(event.capacity - event.registered, 0)} spots left</span></div><h3>{event.name}</h3><p><Clock3 size={13} /> {new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} <span>·</span> {event.location}</p><button className="button button-primary" onClick={() => { setForm({ displayName: "", email: "" }); setSelectedEvent(event); }} disabled={event.registered >= event.capacity}>Register <ArrowUpRight size={14} /></button></div>)}</div></section></div>{selectedEvent && <div className="modal-backdrop"><div className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="eyebrow">Register</span><h2>{selectedEvent.name}</h2></div><button className="icon-button" onClick={() => setSelectedEvent(null)} aria-label="Close"><X size={18} /></button></div><p className="registration-copy">We’ll create a unique, short-lived QR pass for you. No shared event QR codes.</p><div className="form-stack"><label>Name<input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Your name" /></label><label>Email<input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" placeholder="you@example.com" /></label></div><button className="button button-primary auth-submit" onClick={() => void register(selectedEvent)} disabled={busy || !form.displayName.trim() || !form.email.includes("@")} style={{ marginTop: 18 }}>{busy ? <Loader2 size={16} className="spin" /> : <Ticket size={16} />} {busy ? "Registering…" : "Confirm registration"}</button></div></div>}{qrState && <QrPass state={qrState} busy={busy} onClose={() => setQrState(null)} onRefresh={() => void refreshQr()} />}</main>;
}

function QrPass({ state, busy, onClose, onRefresh }: { state: { registrationId: string; token: string; expiresAt: string }; busy: boolean; onClose: () => void; onRefresh: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [token, setToken] = useState(state.token);
  const [expiresAt, setExpiresAt] = useState(state.expiresAt);
  const [loading, setLoading] = useState(!state.token);
  useEffect(() => {
    let active = true;
    async function render() {
      let nextToken = token;
      if (!nextToken) {
        const response = await fetch(`/api/registrations/${state.registrationId}/token`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok) return;
        nextToken = payload.token.qr_token;
        if (active) { setToken(nextToken); setExpiresAt(payload.token.token_expires_at); }
      }
      if (canvasRef.current && nextToken) await QRCode.toCanvas(canvasRef.current, nextToken, { width: 245, margin: 1, color: { dark: "#20283a", light: "#ffffff" } });
      if (active) setLoading(false);
    }
    void render();
    return () => { active = false; };
  }, [state.registrationId, token]);
  return <div className="modal-backdrop"><div className="qr-pass-card" role="dialog" aria-modal="true"><button className="icon-button qr-close" onClick={onClose} aria-label="Close"><X size={18} /></button><span className="eyebrow">Your unique entry pass</span><h2>Show this at the door.</h2><p>It refreshes every 10 minutes and becomes unusable after a successful scan.</p><div className="qr-canvas-wrap">{loading ? <Loader2 size={25} className="spin" /> : <canvas ref={canvasRef} aria-label="Your event QR code" />}</div><div className="qr-expiry"><Clock3 size={13} /> Expires {expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "soon"}</div><button className="button button-secondary" onClick={onRefresh} disabled={busy}><RefreshCw size={15} /> Refresh pass</button></div></div>;
}

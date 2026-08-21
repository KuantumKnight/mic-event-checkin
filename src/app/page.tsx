"use client";

import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  LayoutDashboard,
  Menu,
  QrCode,
  ScanLine,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

type View = "overview" | "events" | "scanner" | "attendees";

const eventSeed = [
  { id: "design-night", name: "Design Night / 02", date: "Tonight · 6:30 PM", location: "Innovation Lab", registered: 128, checkedIn: 86, capacity: 180, accent: "violet", status: "Live now" },
  { id: "build-room", name: "Build Room / 04", date: "Tomorrow · 10:00 AM", location: "Seminar Hall A", registered: 74, checkedIn: 0, capacity: 120, accent: "blue", status: "Upcoming" },
  { id: "founders-table", name: "Founders Table / 01", date: "24 Aug · 4:00 PM", location: "MIC Commons", registered: 42, checkedIn: 0, capacity: 60, accent: "green", status: "Upcoming" },
];

const attendees = [
  { name: "Aarav Mehta", initials: "AM", track: "Product", time: "6:27 PM", status: "Checked in" },
  { name: "Diya Nair", initials: "DN", track: "Design", time: "6:25 PM", status: "Checked in" },
  { name: "Rohan Shah", initials: "RS", track: "Engineering", time: "6:24 PM", status: "Checked in" },
  { name: "Maya Iyer", initials: "MI", track: "Marketing", time: "6:22 PM", status: "Checked in" },
  { name: "Kabir Rao", initials: "KR", track: "Engineering", time: "6:18 PM", status: "Checked in" },
];

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(eventSeed[0].id);
  const [events, setEvents] = useState(eventSeed);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0],
    [events, selectedEventId],
  );

  function addDemoEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "New MIC Event");
    const nextEvent = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + Date.now(),
      name,
      date: "25 Aug · 6:00 PM",
      location: "MIC Commons",
      registered: 0,
      checkedIn: 0,
      capacity: Number(form.get("capacity") || 100),
      accent: "orange",
      status: "Upcoming",
    } as const;
    setEvents((current) => [nextEvent, ...current]);
    setSelectedEventId(nextEvent.id);
    setShowNewEvent(false);
    setView("events");
  }

  function markDemoCheckIn() {
    setEvents((current) => current.map((event) => event.id === selectedEvent.id ? { ...event, checkedIn: Math.min(event.checkedIn + 1, event.registered) } : event));
  }

  return (
    <main className="app-shell">
      <aside className={mobileOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="sidebar-top">
          <BrandMark />
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">KD</div>
          <div><strong>KuantumKnight Dev</strong><span>Organizer workspace</span></div>
          <ChevronDown size={15} />
        </div>

        <nav className="nav-stack" aria-label="Primary navigation">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={view === "overview"} onClick={() => { setView("overview"); setMobileOpen(false); }} />
          <NavItem icon={<CalendarDays size={17} />} label="Events" active={view === "events"} onClick={() => { setView("events"); setMobileOpen(false); }} badge={events.length.toString()} />
          <NavItem icon={<ScanLine size={17} />} label="Scan desk" active={view === "scanner"} onClick={() => { setView("scanner"); setMobileOpen(false); }} />
          <NavItem icon={<Users size={17} />} label="Attendees" active={view === "attendees"} onClick={() => { setView("attendees"); setMobileOpen(false); }} />
        </nav>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="nav-stack">
          <NavItem icon={<Settings2 size={17} />} label="Settings" />
          <NavItem icon={<ExternalLink size={17} />} label="MIC handbook" />
        </nav>

        <div className="sidebar-footer">
          <div className="status-line"><span className="status-dot" /> All systems operational</div>
          <div className="profile-row"><div className="profile-avatar">SD</div><div><strong>Sarvesh Dav</strong><span>Organizer</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>MIC workspace</span><span className="slash">/</span><strong>{view === "overview" ? "Overview" : view === "scanner" ? "Scan desk" : view[0].toUpperCase() + view.slice(1)}</strong></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><span /></button><div className="topbar-avatar">SD</div></div>
        </header>

        {view === "overview" && <Overview event={selectedEvent} onEventChange={setSelectedEventId} events={events} onNew={() => setShowNewEvent(true)} onScan={() => setView("scanner")} onCheckIn={markDemoCheckIn} onInsight={() => setShowInsight(true)} />}
        {view === "events" && <EventsView events={events} selectedEventId={selectedEventId} onSelect={setSelectedEventId} onNew={() => setShowNewEvent(true)} />}
        {view === "scanner" && <ScannerView event={selectedEvent} onCheckIn={markDemoCheckIn} />}
        {view === "attendees" && <AttendeesView event={selectedEvent} />}
      </section>

      {showNewEvent && <div className="modal-backdrop" role="presentation"><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-event-title"><div className="modal-heading"><div><span className="eyebrow">New event</span><h2 id="new-event-title">Create an event</h2></div><button className="icon-button" onClick={() => setShowNewEvent(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={addDemoEvent} className="form-stack"><label>Event name<input name="name" required placeholder="e.g. Product teardown / 01" /></label><label>Capacity<input name="capacity" type="number" min="1" max="10000" defaultValue="100" /></label><button className="button button-primary" type="submit">Create event <ArrowUpRight size={16} /></button></form></div></div>}
      {showInsight && <div className="modal-backdrop" role="presentation"><div className="modal-card insight-modal" role="dialog" aria-modal="true" aria-labelledby="insight-title"><div className="modal-heading"><div><span className="eyebrow">AI event insight</span><h2 id="insight-title">Tonight at a glance</h2></div><button className="icon-button" onClick={() => setShowInsight(false)} aria-label="Close"><X size={18} /></button></div><div className="insight-answer"><Sparkles size={18} /><p>86 of 128 registered attendees have checked in so far. That puts tonight at <strong>67.2%</strong> attendance, with <strong>94 spots</strong> still open.</p></div><div className="insight-source">Based on live event data · AI explanations never invent the numbers</div></div></div>}
    </main>
  );
}

function NavItem({ icon, label, active = false, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick}><span className="nav-icon">{icon}</span><span>{label}</span>{badge && <em>{badge}</em>}</button>;
}

function Overview({ event, events, onEventChange, onNew, onScan, onCheckIn, onInsight }: { event: typeof eventSeed[number]; events: typeof eventSeed; onEventChange: (id: string) => void; onNew: () => void; onScan: () => void; onCheckIn: () => void; onInsight: () => void }) {
  const attendance = Math.round((event.checkedIn / Math.max(event.registered, 1)) * 100);
  return <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">Saturday, 21 August 2026</span><h1>Good evening, Sarvesh <span className="wave">✦</span></h1><p>Here’s the pulse of your MIC events.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={onInsight}><Sparkles size={16} /> Ask about this event</button><button className="button button-primary" onClick={onNew}>Create event <ArrowUpRight size={16} /></button></div></div><div className="event-picker-row"><div className="select-wrap"><CalendarDays size={16} /><select value={event.id} onChange={(e) => onEventChange(e.target.value)} aria-label="Select event">{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div><span className="live-pill"><span /> {event.status === "Live now" ? "Live tracking" : "Ready to register"}</span></div><div className="hero-grid"><div className="hero-card"><div className="hero-card-top"><div><span className="eyebrow light">Selected event</span><h2>{event.name}</h2><p><Clock3 size={14} /> {event.date} <span>·</span> {event.location}</p></div><div className={`event-symbol ${event.accent}`}><QrCode size={24} /></div></div><div className="hero-metrics"><div><strong>{event.checkedIn}</strong><span>checked in</span></div><div className="metric-divider" /><div><strong>{event.registered}</strong><span>registered</span></div><div className="metric-divider" /><div><strong>{event.capacity - event.registered}</strong><span>spots left</span></div></div><div className="progress-block"><div className="progress-label"><span>Attendance progress</span><strong>{attendance}%</strong></div><div className="progress-track"><span style={{ width: `${attendance}%` }} /></div></div><div className="hero-card-actions"><button className="button button-light" onClick={onScan}><ScanLine size={16} /> Open scan desk</button><button className="text-button" onClick={onCheckIn}>+ Simulate check-in</button></div></div><div className="quick-card"><div className="card-heading"><div><span className="eyebrow">Live feed</span><h3>Latest check-ins</h3></div><span className="live-dot-label"><span /> Live</span></div><div className="attendee-list">{attendees.slice(0, 4).map((attendee) => <div className="attendee-row" key={attendee.name}><div className="mini-avatar">{attendee.initials}</div><div className="attendee-main"><strong>{attendee.name}</strong><span>{attendee.track}</span></div><time>{attendee.time}</time><Check size={15} className="check-icon" /></div>)}</div><button className="view-all-button">View all attendees <ArrowUpRight size={14} /></button></div></div><div className="section-heading"><div><span className="eyebrow">Command center</span><h2>Everything in one place</h2></div><button className="text-button">Last updated just now <span className="status-dot" /></button></div><div className="command-grid"><StatCard icon={<Users size={18} />} label="Total registrations" value={event.registered.toString()} trend="+12.4%" detail="vs. previous event" tone="blue" /><StatCard icon={<ScanLine size={18} />} label="Check-in rate" value={`${attendance}%`} trend="+8.1%" detail="vs. previous event" tone="green" /><StatCard icon={<Clock3 size={18} />} label="Peak check-ins" value="6:24 PM" trend="24 people" detail="in a 10 minute window" tone="orange" /><StatCard icon={<CalendarDays size={18} />} label="Next event" value="Tomorrow" trend="10:00 AM" detail="Build Room / 04" tone="violet" /></div><div className="bottom-grid"><div className="activity-card"><div className="card-heading"><div><span className="eyebrow">Activity</span><h3>Event timeline</h3></div><button className="icon-button"><Download size={17} /></button></div><div className="timeline"><TimelineItem time="6:27 PM" title="Aarav Mehta checked in" detail="Design track · QR scan accepted" tone="green" /><TimelineItem time="6:21 PM" title="Check-in momentum picked up" detail="18 attendees arrived in the last 10 minutes" tone="blue" /><TimelineItem time="6:00 PM" title="Doors opened" detail="Scan desk is live at Innovation Lab" tone="violet" /></div></div><div className="insight-card"><div className="insight-orb"><Sparkles size={19} /></div><span className="eyebrow">Built for better events</span><h3>Turn the live room into your next move.</h3><p>Ask questions in plain English. MIC combines your event data with a little context to surface a useful answer.</p><button className="button button-dark" onClick={onInsight}>Try an insight <ArrowUpRight size={15} /></button></div></div></div>;
}

function StatCard({ icon, label, value, trend, detail, tone }: { icon: React.ReactNode; label: string; value: string; trend: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong>{value}</strong><div className="stat-foot"><span className="trend">{trend}</span><span>{detail}</span></div></div>; }
function TimelineItem({ time, title, detail, tone }: { time: string; title: string; detail: string; tone: string }) { return <div className="timeline-item"><div className={`timeline-dot ${tone}`} /><div className="timeline-copy"><div><strong>{title}</strong><time>{time}</time></div><span>{detail}</span></div></div>; }

function EventsView({ events, selectedEventId, onSelect, onNew }: { events: typeof eventSeed; selectedEventId: string; onSelect: (id: string) => void; onNew: () => void }) { return <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">Workspace</span><h1>Your events</h1><p>A quiet place to set the room up well.</p></div><button className="button button-primary" onClick={onNew}>Create event <ArrowUpRight size={16} /></button></div><div className="event-table-card"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search events" /></div><button className="button button-secondary">All events <ChevronDown size={15} /></button></div><div className="event-table"><div className="table-row table-head"><span>Event</span><span>When</span><span>Registration</span><span>Status</span><span /></div>{events.map((event) => <button className={event.id === selectedEventId ? "table-row selected" : "table-row"} key={event.id} onClick={() => onSelect(event.id)}><span className="event-name-cell"><span className={`tiny-symbol ${event.accent}`}><QrCode size={14} /></span><strong>{event.name}</strong></span><span>{event.date}</span><span>{event.registered} / {event.capacity}</span><span><span className={event.status === "Live now" ? "status-badge live" : "status-badge"}>{event.status}</span></span><ArrowUpRight size={15} /></button>)}</div></div></div>; }
function ScannerView({ event, onCheckIn }: { event: typeof eventSeed[number]; onCheckIn: () => void }) { const [lastScan, setLastScan] = useState<string | null>(null); return <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">Organizer tool</span><h1>Scan desk</h1><p>Scan a unique attendee QR code to check them in.</p></div><span className="live-pill"><span /> {event.name}</span></div><div className="scanner-layout"><div className="scanner-card"><div className="scanner-frame"><div className="scanner-corner top-left" /><div className="scanner-corner top-right" /><div className="scanner-corner bottom-left" /><div className="scanner-corner bottom-right" /><ScanLine size={42} strokeWidth={1.4} /><span>Camera preview will appear here</span></div><div className="scanner-controls"><button className="button button-primary" onClick={() => { setLastScan("Aarav Mehta"); onCheckIn(); }}><ScanLine size={17} /> Simulate QR scan</button><p>Offline scans are queued on this device and sync safely once the connection returns.</p></div></div><div className="scan-result-card"><span className="eyebrow">Last scan</span>{lastScan ? <><div className="scan-success"><Check size={18} /><span>Accepted</span></div><h2>{lastScan}</h2><p>Checked in just now · Design track</p><button className="text-button">View attendee record <ArrowUpRight size={14} /></button></> : <div className="empty-state"><QrCode size={30} /><h3>Ready when you are</h3><p>Point the camera at a single attendee QR code.</p></div>}</div></div></div>; }
function AttendeesView({ event }: { event: typeof eventSeed[number] }) { return <div className="content-wrap"><div className="page-heading"><div><span className="eyebrow">{event.name}</span><h1>Attendees</h1><p>{event.checkedIn} checked in · {event.registered - event.checkedIn} still to arrive.</p></div><button className="button button-secondary"><Download size={16} /> Export CSV</button></div><div className="attendees-card"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search attendees" /></div><span className="result-count">{event.registered} registrations</span></div><div className="attendee-table"><div className="table-row table-head"><span>Attendee</span><span>Track</span><span>Checked in at</span><span>Status</span></div>{attendees.map((attendee) => <div className="table-row" key={attendee.name}><span className="event-name-cell"><span className="mini-avatar">{attendee.initials}</span><strong>{attendee.name}</strong></span><span>{attendee.track}</span><span>{attendee.time}</span><span><span className="status-badge live">{attendee.status}</span></span></div>)}</div></div></div>; }

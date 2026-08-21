"use client";

import { Archive, Ban, Check, Loader2 } from "lucide-react";
import { useState } from "react";

export function EventLifecycleActions({ eventId, status }: { eventId: string; status: string }) {
  const [action, setAction] = useState<"cancelled" | "archived" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() { if (!action) return; setBusy(true); setError(null); const response = await fetch(`/api/events/${eventId}/lifecycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) }); const body = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) setError(body.error || "Lifecycle update failed."); else window.location.reload(); }
  if (status === "archived") return <p className="muted"><Archive size={15} /> Archived</p>;
  const label = status === "cancelled" ? "Archive event" : "Cancel event";
  return <div className="lifecycle-actions">{action ? <div className="confirm-row"><span>{action === "cancelled" ? "Cancel this event and close registration?" : "Archive this cancelled event?"}</span><button className="button button-small button-outline" onClick={() => setAction(null)}>Keep</button><button className="button button-small button-dark" disabled={busy} onClick={() => void run}>{busy ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Confirm</button></div> : <button className="button button-outline" onClick={() => setAction(status === "cancelled" ? "archived" : "cancelled")}>{status === "cancelled" ? <Archive size={15} /> : <Ban size={15} />} {label}</button>}{error && <p className="form-error">{error}</p>}</div>;
}

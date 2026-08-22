"use client";

import { BrainCircuit, Loader2, Send } from "lucide-react";
import { useState } from "react";

export function AiInsightBox({ eventId }: { eventId: string }) {
  const [question, setQuestion] = useState("What is the current attendance rate?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function ask(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setAnswer(null);
    const response = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, question }) });
    const body = await response.json().catch(() => ({})); setBusy(false); setAnswer(response.ok ? body.answer : body.error || "Insight unavailable."); setSource(body.source || null);
  }
  return <section className="insight-box"><div className="insight-heading"><BrainCircuit size={19} /><div><span className="eyebrow">Event insight</span><h2>Ask about this event</h2></div></div><form onSubmit={ask} className="insight-form"><input value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={500} /><button className="button button-dark" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Ask</button></form>{answer && <div className="insight-answer"><p>{answer}</p>{source && <small>Source: {source === "ai" ? "AI grounded in this event's database stats" : "database fallback"}</small>}</div>}</section>;
}

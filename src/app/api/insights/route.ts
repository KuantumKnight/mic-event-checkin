import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { createClient, getProfile } from "@/lib/supabase/server";

const insightSchema = z.object({
  eventId: z.string().uuid(),
  question: z.string().trim().min(3).max(500),
});

type Stats = {
  eventName: string;
  registered: number;
  checkedIn: number;
  capacity: number;
  spotsLeft: number;
  noShows: number;
  attendanceRate: number;
  peakTime: string | null;
};

function getFallback(question: string, stats: Stats) {
  const normalized = question.toLowerCase();
  if (normalized.includes("percentage") || normalized.includes("no-show") || normalized.includes("no show")) {
    return `${stats.noShows} registered attendee${stats.noShows === 1 ? " is" : "s are"} currently marked as a no-show (${Math.round((stats.noShows / Math.max(stats.registered, 1)) * 100)}%).`;
  }
  if (normalized.includes("peak")) return stats.peakTime ? `Check-ins peaked around ${stats.peakTime}.` : "There are not enough check-ins to identify a peak yet.";
  if (normalized.includes("spot")) return `${stats.spotsLeft} spot${stats.spotsLeft === 1 ? " is" : "s are"} left for ${stats.eventName}.`;
  return `${stats.checkedIn} of ${stats.registered} registered attendees have checked in so far (${stats.attendanceRate}%).`;
}

async function askOpenAI(question: string, stats: Stats) {
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Answer only from the supplied event statistics. Never invent or change a number. Keep the answer to two concise sentences." },
        { role: "user", content: JSON.stringify({ question, stats }) },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const json = await response.json();
  return json.choices?.[0]?.message?.content?.trim() as string | undefined;
}

async function askGemini(question: string, stats: Stats) {
  const model = process.env.AI_MODEL || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Answer only from these event statistics. Never invent or change a number. Keep the answer to two concise sentences.\nQuestion: ${question}\nStats: ${JSON.stringify(stats)}` }] }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() as string | undefined;
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return jsonError("Sign in to ask about an event.", 401);
  if (profile.role !== "organizer") return jsonError("Only organizers can view event insights.", 403);

  const parsed = insightSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Ask a clear question about this event.", 422, parsed.error.flatten());
  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase.from("events").select("id, name, capacity").eq("id", parsed.data.eventId).single();
  if (eventError || !event) return jsonError("Event not found.", 404);

  const { data: registrations, error: registrationsError } = await supabase
    .from("registrations")
    .select("id, checkins(checked_in_at)")
    .eq("event_id", event.id);
  if (registrationsError) return jsonError(registrationsError.message, 400);

  const checkinTimes = (registrations ?? []).flatMap((row) => (row.checkins ?? []).map((checkin) => new Date(checkin.checked_in_at).getTime()));
  const byTenMinuteWindow = new Map<number, number>();
  for (const timestamp of checkinTimes) {
    const bucket = Math.floor(timestamp / (10 * 60 * 1000));
    byTenMinuteWindow.set(bucket, (byTenMinuteWindow.get(bucket) ?? 0) + 1);
  }
  const peakBucket = [...byTenMinuteWindow.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const peakTime = peakBucket ? new Date(peakBucket * 10 * 60 * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  const registered = registrations?.length ?? 0;
  const checkedIn = checkinTimes.length;
  const stats: Stats = {
    eventName: event.name,
    registered,
    checkedIn,
    capacity: event.capacity,
    spotsLeft: Math.max(event.capacity - registered, 0),
    noShows: Math.max(registered - checkedIn, 0),
    attendanceRate: Math.round((checkedIn / Math.max(registered, 1)) * 100),
    peakTime,
  };

  const fallback = getFallback(parsed.data.question, stats);
  if (!process.env.AI_API_KEY || !process.env.AI_PROVIDER) return NextResponse.json({ answer: fallback, source: "fallback", stats });

  try {
    const answer = process.env.AI_PROVIDER === "gemini"
      ? await askGemini(parsed.data.question, stats)
      : await askOpenAI(parsed.data.question, stats);
    return NextResponse.json({ answer: answer || fallback, source: answer ? "ai" : "fallback", stats });
  } catch {
    return NextResponse.json({ answer: fallback, source: "fallback", stats });
  }
}

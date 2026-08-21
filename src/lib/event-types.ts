export type Profile = {
  id: string;
  full_name: string | null;
  role: "attendee" | "organizer";
};

export type EventSummary = {
  id: string;
  organizer_id?: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string;
  capacity: number;
  created_at?: string;
  registered_count: number;
  checked_in_count: number;
  spots_left: number;
  status: "draft" | "published" | "cancelled" | "archived";
};

export type EventStats = EventSummary & {
  arrival_rate: number;
  no_shows: number;
  latest_checkin_at: string | null;
  recent_arrivals: Array<{
    id: string;
    display_name: string;
    email: string;
    created_at: string;
    checkins: Array<{ checked_in_at: string; station_id: string }>;
  }>;
};

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatShortTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
}

export function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

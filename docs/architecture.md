# MIC Check-in: architecture notes

## The simple explanation

The browser renders the organizer and attendee experiences. Next.js route handlers are the thin server boundary. Supabase owns authentication, Postgres data, and realtime updates. The database owns the two rules that must stay correct under concurrency.

```text
Attendee / Organizer browser
          |
          v
Next.js route handlers  --->  Supabase Auth
          |
          +-----------------> Postgres + RLS + RPC transactions
          |
          +-----------------> AI provider (server-side only)
```

## Why Postgres handles registration capacity

`register_for_event` locks the event row with `FOR UPDATE` before counting registrations and inserting a new one. If 500 requests arrive together for a capacity-50 event, only one transaction can inspect that event row at a time. Exactly 50 transactions can pass the count; the rest receive a clean capacity error.

## Why duplicate check-ins stay impossible

`checkins.registration_id` is unique, and `redeem_checkin_token` locks the registration row before inserting. The second scan returns `already_checked_in` with the original timestamp. The uniqueness constraint is the final safety net even if two server processes race.

## QR screenshot tradeoff

Each registration receives a random token that is stored only as a SHA-256 hash. The attendee QR token expires after 10 minutes and can be refreshed; a successful scan consumes it. This makes old screenshots short-lived and prevents the same token from being accepted twice. The tradeoff is that the attendee needs to open the app occasionally to refresh a token.

## Offline scanning decision

The scanner creates a client event ID for every scan and stores pending scans in IndexedDB when the network is unavailable. When connectivity returns, it syncs each ID to the server. The database unique constraint makes retries idempotent. If Station A scans offline and Station B checks the attendee in first, Station A's later sync receives `already_checked_in` and marks its local item reconciled with the server timestamp; it never overwrites the earlier check-in.

## Roles

The `profiles.role` column is the source of truth. Organizer actions also verify that the current user owns the event. UI hiding is only a convenience; RLS and RPC checks enforce the boundary.

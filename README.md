# MIC Event Check-in

MIC Event Check-in is a small, production-shaped event desk for organizers and attendees. It is public, deployed, and built around one interview-friendly idea: capacity and duplicate check-in are database invariants, not UI promises.

Live demo: [mic-event-checkin.vercel.app](https://mic-event-checkin.vercel.app)

## What the app does

- Organizers create events, inspect real registration/check-in counts, export CSV, ask grounded event questions, and open a dedicated scanner workstation.
- Attendees register with their verified Supabase account email, receive a short-lived QR pass, and see a checked-in confirmation after the door accepts it.
- The scanner accepts QR codes, locks duplicate camera decodes while a response is pending, provides manual name/email lookup, and queues scans in IndexedDB when the station briefly loses connectivity.
- Events move through draft, published, cancelled, and archived states. Attendees see only published events; registration closes for drafts, cancelled events, and events that have started or ended.
- Every scan carries the event ID of its open workstation. A pass from another event is rejected before check-in, including during offline reconciliation.
- Supabase Realtime refreshes the event overview when `events`, `registrations`, or `checkins` change.

## The engineering case study

```text
Attendee pass -> POST /api/checkins -> redeem_checkin_token()
                                      | row lock + token expiry + unique registration_id
                                      v
                              public.checkins
                                      |
                         Realtime -> organizer dashboard
```

`register_for_event()` derives the email from `auth.users`, locks the event row before counting registrations, and rejects closed lifecycle/time windows. `redeem_checkin_token()` locks the registration row, verifies the scanner event, and inserts the single check-in. The unique constraints are the final guard if two Vercel instances race. Organizer pages use the security-invoker `event_stats` view; attendee pages use the security-definer `list_event_catalog()` aggregate RPC so RLS never turns public capacity into a user-specific count. A Postgres trigger also prevents capacity being lowered below existing registrations.

The concurrency proof harness sends parallel requests to a hosted deployment and checks that capacity is not exceeded and the same registration cannot be accepted twice:

```bash
pnpm proof:concurrency
```

## Routes

`/` · `/login` · `/dashboard` · `/events` · `/events/new` · `/events/[eventId]/overview` · `/events/[eventId]/registrations` · `/events/[eventId]/check-ins` · `/events/[eventId]/settings` · `/scan/[eventId]` · `/passes/[registrationId]`

## Stack and deployment

- Next.js App Router + TypeScript on Vercel
- Supabase Auth, Postgres, RLS, Realtime, and SQL RPCs
- `html5-qrcode` for camera scanning, `qrcode` for attendee passes, Lucide for interface icons
- Geist through `next/font`; restrained off-white/ink/lime operations UI

Vercel is connected to `KuantumKnight/mic-event-checkin`. Production environment variables are configured in Vercel; no secrets belong in this repository:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
AI_PROVIDER (optional)
AI_API_KEY (optional)
AI_MODEL (optional)
AI_BASE_URL (optional for OpenAI-compatible providers)
```

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

The signed-out E2E smoke checks run without credentials. The golden hosted flow is available when these environment variables are set; it covers organizer creation, attendee registration, correct-event acceptance, duplicate rejection, wrong-event rejection, and the checked-in pass:

```bash
$env:E2E_ORGANIZER_EMAIL="organizer@example.com"
$env:E2E_ORGANIZER_PASSWORD="..."
$env:E2E_ATTENDEE_EMAIL="attendee@example.com"
$env:E2E_ATTENDEE_PASSWORD="..."
pnpm test:e2e
```

For an interview-ready organizer account, seed Auth and the matching profile through the Supabase Admin API in one command. Keep the service-role key out of `.env.local` commits:

```bash
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:DEMO_ORGANIZER_EMAIL="demo@example.com"
$env:DEMO_ORGANIZER_PASSWORD="use-a-long-password"
pnpm seed:organizer
```

The script is idempotent: it creates the confirmed user if needed and promotes only that exact email. New accounts otherwise default to attendee.

Apply the SQL migrations in `supabase/migrations` to a Supabase project. The browser only receives the publishable key; RLS and the authenticated API boundary protect data access.

## Honest tradeoffs

- QR tokens expire after 10 minutes and are single-use. Offline mode is intentionally bounded by that validity window; it is not an unlimited offline admission system. Expired or rejected queue records remain visible as reconciliation warnings instead of disappearing silently.
- The AI endpoint is optional. Without a provider it uses deterministic answers from live database statistics. When configured, the model receives only those statistics and is instructed not to invent numbers.
- Realtime Postgres Changes is appropriate for this desk-sized workload. At much larger fan-out, I would move to a server-side change stream and broadcast layer, then benchmark the authorization cost.
- The public demo has no seeded fake dashboard data. A signed-in organizer or attendee creates the real records used in the flow.

## Suggested demo flow

1. Run `pnpm seed:organizer` once to create the confirmed demo organizer, or use an existing organizer account.
2. Create an event at `/events/new`.
3. Create an attendee account, register, and open the pass.
4. Open `/scan/[eventId]` in the organizer session and scan the attendee pass, then scan it again to show the duplicate-safe response.
5. Open the event overview to see the live count, recent arrival, CSV export, and grounded insight. Try the event lifecycle controls and attendee cancellation before check-in.

The app is intentionally small enough to explain in an interview while still making the important correctness decisions in Postgres instead of hiding them in a component.

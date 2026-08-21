# MIC Event Check-in

An interview-ready event check-in system for the MIC Development Department recruitment task.

## Product direction

- Organizers create events, set capacity, scan attendee QR codes, and export attendance.
- Attendees register and receive a unique QR code with a clear check-in status.
- Database-level constraints protect capacity and duplicate check-ins across concurrent server processes.
- Offline scanner actions are queued locally and reconciled safely when connectivity returns.
- Organizer insights use current database statistics as server-side AI context and fall back to raw stats if AI is unavailable.

## Planned stack

- Next.js + TypeScript
- Supabase Postgres, Auth, and Realtime
- Vercel deployment
- Configurable OpenAI/Gemini-compatible server-side AI provider

## Status

Build in progress. Each meaningful milestone is committed separately so the implementation history stays easy to explain in an interview.

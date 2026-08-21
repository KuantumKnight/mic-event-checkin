# Deployment handoff

## Live URLs

- Production: https://mic-event-checkin.vercel.app
- GitHub: https://github.com/KuantumKnight/mic-event-checkin
- Supabase project ref: `neaolmfcfnyxehtnkded`

## Vercel environment variables

Configured for Development, Preview, and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Optional server-only AI configuration:

- `AI_PROVIDER`: `openai` or `gemini`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_BASE_URL` for OpenAI-compatible providers

Without an AI key, the insights endpoint still returns a deterministic answer from the database statistics instead of failing.

## First organizer setup

1. Create an account at `/login`.
2. In Supabase SQL Editor, copy the account UUID from Authentication > Users.
3. Run:

```sql
update public.profiles
set role = 'organizer'
where id = '<your-auth-user-uuid>';
```

This is intentionally a database-owned role change. The browser cannot promote itself, and organizer APIs also verify event ownership.

## Auth redirect

For email confirmation, add the production URL and `/auth/callback` to Supabase Auth URL Configuration. For a simple interview demo, email confirmation can be disabled temporarily in the Supabase Auth settings for the project.

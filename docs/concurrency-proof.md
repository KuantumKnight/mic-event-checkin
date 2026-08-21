# Concurrency proof

The proof script creates a fresh hosted event, fires 120 concurrent registration requests, and then fires 120 concurrent check-in requests for the same QR token.

```powershell
$env:BASE_URL = "https://mic-event-checkin.vercel.app"
$env:ORGANIZER_COOKIE = "<organizer auth cookie>"
$env:ATTENDEE_COOKIES = '["<attendee cookie 1>","<attendee cookie 2>","<attendee cookie 3>"]'
$env:CONCURRENCY = "120"
$env:CAPACITY = "50"
pnpm proof:concurrency
```

For the strongest capacity proof, provide 50 distinct attendee sessions in `ATTENDEE_COOKIES`. The expected result is no more than 50 successful registrations. The duplicate scan race must always print exactly one accepted scan and the remaining requests as explicit `409` duplicate responses.

The database mechanism being tested is documented in [`architecture.md`](./architecture.md): row locks serialize the capacity count and registration row locks plus a unique `checkins.registration_id` constraint make check-in idempotent across server processes.

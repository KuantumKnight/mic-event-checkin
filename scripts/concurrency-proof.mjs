const baseUrl = (process.env.BASE_URL || "https://mic-event-checkin.vercel.app").replace(/\/$/, "");
const organizerCookie = process.env.ORGANIZER_COOKIE;
const attendeeCookies = JSON.parse(process.env.ATTENDEE_COOKIES || "[]");
const total = Number(process.env.CONCURRENCY || 120);
const capacity = Number(process.env.CAPACITY || 50);

if (!organizerCookie || attendeeCookies.length === 0) {
  console.error("Missing ORGANIZER_COOKIE or ATTENDEE_COOKIES.");
  console.error("Use authenticated browser cookies for one organizer and enough attendee accounts to cover the capacity test.");
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const event = await request("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: organizerCookie },
  body: JSON.stringify({
    name: `Concurrency proof ${new Date().toISOString()}`,
    startsAt: new Date(Date.now() + 3600000).toISOString(),
    location: "Proof station",
    capacity,
  }),
});

if (event.status !== 201) {
  console.error("Could not create proof event:", event);
  process.exit(1);
}

const eventId = event.body.event.id;
console.log(`Created event ${eventId} with capacity ${capacity}`);

const registrations = await Promise.all(Array.from({ length: total }, (_, index) => request(`/api/events/${eventId}/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: attendeeCookies[index % attendeeCookies.length] },
  body: JSON.stringify({ displayName: `Proof attendee ${index}`, email: `proof-${index}-${Date.now()}@mic.local` }),
})));

const registrationSuccesses = registrations.filter((result) => result.status === 201);
const capacityRejects = registrations.filter((result) => result.status === 409 && /capacity/i.test(result.body.error || ""));
console.log(`Registration race: ${registrationSuccesses.length} succeeded, ${capacityRejects.length} capacity rejects, ${registrations.length - registrationSuccesses.length - capacityRejects.length} other rejects`);

if (registrationSuccesses.length > capacity) {
  console.error(`FAIL: ${registrationSuccesses.length} registrations exceeded capacity ${capacity}.`);
  process.exit(1);
}

const qrToken = registrationSuccesses[0]?.body?.registration?.qr_token;
if (!qrToken) {
  console.error("No successful registration returned a QR token; cannot run the duplicate scan race.");
  process.exit(1);
}

const checkins = await Promise.all(Array.from({ length: total }, (_, index) => request("/api/checkins", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: organizerCookie },
  body: JSON.stringify({ qrToken, clientEventId: crypto.randomUUID(), stationId: `proof-${index}` }),
})));

const accepted = checkins.filter((result) => result.status === 200);
const duplicates = checkins.filter((result) => result.status === 409);
console.log(`Check-in race: ${accepted.length} accepted, ${duplicates.length} duplicate rejects, ${checkins.length - accepted.length - duplicates.length} other responses`);

if (accepted.length !== 1) {
  console.error(`FAIL: expected exactly one accepted check-in, got ${accepted.length}.`);
  process.exit(1);
}

console.log("PASS: capacity never exceeded and duplicate QR scans were explicitly rejected.");

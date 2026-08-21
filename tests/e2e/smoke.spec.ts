import { expect, test } from "@playwright/test";

test("signed-out visitors land on the real auth screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByText("Simulate check-in")).toHaveCount(0);
});

test("login screen exposes both account paths", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
});

const goldenPathReady = Boolean(process.env.E2E_ORGANIZER_EMAIL && process.env.E2E_ORGANIZER_PASSWORD && process.env.E2E_ATTENDEE_EMAIL && process.env.E2E_ATTENDEE_PASSWORD);

test.describe("golden check-in path", () => {
  test.skip(!goldenPathReady, "Set E2E organizer and attendee credentials to run the hosted golden path.");

  test("organizer, attendee, correct event, wrong event, duplicate", async ({ browser }) => {
    const organizer = await browser.newPage();
    const attendee = await browser.newPage();
    const localDateTime = (offsetHours: number) => { const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000); const pad = (value: number) => String(value).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; };
    async function signIn(page: typeof organizer, email: string, password: string) { await page.goto("/login"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill(password); await page.getByRole("button", { name: "Enter workspace" }).click(); await page.waitForURL(/dashboard|events/); }
    async function createEvent(name: string) { await organizer.goto("/events/new"); await organizer.getByLabel("Event name").fill(name); await organizer.getByLabel("Starts at").fill(localDateTime(2)); await organizer.getByRole("button", { name: "Create event" }).click(); await organizer.waitForURL(/\/events\/[^/]+\/overview/); return organizer.url().match(/\/events\/([^/]+)\/overview/)?.[1] as string; }

    await signIn(organizer, process.env.E2E_ORGANIZER_EMAIL!, process.env.E2E_ORGANIZER_PASSWORD!);
    const eventId = await createEvent(`Golden path ${Date.now()}`);
    const otherEventId = await createEvent(`Wrong event ${Date.now()}`);
    await signIn(attendee, process.env.E2E_ATTENDEE_EMAIL!, process.env.E2E_ATTENDEE_PASSWORD!);
    await attendee.goto(`/events/${eventId}/register`);
    await attendee.getByLabel("Full name").fill("Golden Path Attendee");
    await attendee.getByRole("button", { name: "Register for event" }).click();
    await attendee.waitForURL(/\/passes\/[^/]+$/);
    const registrationId = attendee.url().match(/\/passes\/([^/]+)$/)?.[1] as string;
    const tokenBody = await attendee.evaluate(async (id) => (await fetch(`/api/registrations/${id}/token`, { method: "POST" })).json(), registrationId);
    const token = tokenBody.token.qr_token as string;
    const wrong = await organizer.evaluate(async (body) => { const response = await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; }, { eventId: otherEventId, qrToken: token, clientEventId: crypto.randomUUID(), stationId: "e2e" });
    expect(wrong.status).toBe(409);
    expect(wrong.body.error).toContain("another event");
    const accepted = await organizer.evaluate(async (body) => { const response = await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return response.status; }, { eventId, qrToken: token, clientEventId: crypto.randomUUID(), stationId: "e2e" });
    expect(accepted).toBe(200);
    const duplicate = await organizer.evaluate(async (body) => (await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status, { eventId, qrToken: token, clientEventId: crypto.randomUUID(), stationId: "e2e" });
    expect(duplicate).toBe(409);
    await attendee.goto(`/passes/${registrationId}`);
    await expect(attendee.getByText(/Checked in at/)).toBeVisible();
    await organizer.close(); await attendee.close();
  });
});

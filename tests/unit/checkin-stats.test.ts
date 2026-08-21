import assert from "node:assert/strict";
import test from "node:test";
import { findPeakBucket, summarizeAttendance } from "../../src/lib/checkin-stats";

test("attendance summary never reports negative capacity", () => {
  assert.deepEqual(summarizeAttendance(120, 86, 100), { registered: 120, checkedIn: 86, capacity: 100, spotsLeft: 0, noShows: 34, arrivalRate: 72 });
});

test("peak bucket groups check-ins into ten-minute windows", () => {
  assert.equal(findPeakBucket(["2026-08-21T10:01:00Z", "2026-08-21T10:08:00Z", "2026-08-21T10:19:00Z"]), "2026-08-21T10:00:00.000Z");
  assert.equal(findPeakBucket([]), null);
});

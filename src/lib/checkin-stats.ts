export function summarizeAttendance(registered: number, checkedIn: number, capacity: number) {
  return {
    registered,
    checkedIn,
    capacity,
    spotsLeft: Math.max(capacity - registered, 0),
    noShows: Math.max(registered - checkedIn, 0),
    arrivalRate: Math.round((checkedIn / Math.max(registered, 1)) * 100),
  };
}

export function findPeakBucket(values: string[], bucketMinutes = 10) {
  const bucketSize = bucketMinutes * 60 * 1000;
  const counts = new Map<number, number>();
  for (const value of values) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const bucket = Math.floor(timestamp / bucketSize);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const peak = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return peak === undefined ? null : new Date(peak * bucketSize).toISOString();
}

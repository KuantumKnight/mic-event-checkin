export type PendingCheckin = {
  eventId: string;
  clientEventId: string;
  qrToken: string;
  stationId: string;
  createdAt: string;
  state?: "pending" | "expired" | "failed";
  lastError?: string;
};

const DB_NAME = "mic-checkin-offline";
const STORE_NAME = "pending-checkins";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "clientEventId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueCheckin(item: PendingCheckin) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

export async function readQueuedCheckins(): Promise<PendingCheckin[]> {
  const db = await openDb();
  const items = await new Promise<PendingCheckin[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as PendingCheckin[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return items;
}

export async function removeQueuedCheckin(clientEventId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(clientEventId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

export async function syncQueuedCheckins() {
  const pending = await readQueuedCheckins();
  const results: Array<{ item: PendingCheckin; status: "accepted" | "already_checked_in" | "expired" | "failed" }> = [];
  for (const item of pending) {
    if (item.state && item.state !== "pending") continue;
    if (!item.eventId) {
      const failed: PendingCheckin = { ...item, eventId: "", state: "failed", lastError: "This scan was created by an older station version and cannot be reconciled." };
      await queueCheckin(failed);
      results.push({ item: failed, status: "failed" });
      continue;
    }
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409 && /another event/i.test(body.error || "")) {
        const failed: PendingCheckin = { ...item, state: "failed", lastError: "Pass belongs to another event and was not reconciled." };
        await queueCheckin(failed);
        results.push({ item: failed, status: "failed" });
        continue;
      }
      if (response.ok || response.status === 409) {
        await removeQueuedCheckin(item.clientEventId);
        results.push({ item, status: response.ok ? "accepted" : "already_checked_in" });
      } else if (response.status === 410 || response.status === 400) {
        const status = response.status === 410 ? "expired" : "failed";
        const nextState: PendingCheckin = { ...item, state: status, lastError: response.status === 410 ? "QR expired before this station reconnected." : "QR was rejected during reconciliation." };
        await queueCheckin(nextState);
        results.push({ item: nextState, status });
      }
    } catch {
      // Keep the item queued. A later online event will retry it.
    }
  }
  return results;
}

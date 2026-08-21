export type PendingCheckin = {
  clientEventId: string;
  qrToken: string;
  stationId: string;
  createdAt: string;
};

const DB_NAME = "mic-checkin-offline";
const STORE_NAME = "pending-checkins";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "clientEventId" });
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
  const results: Array<{ item: PendingCheckin; status: "accepted" | "already_checked_in" | "failed" }> = [];
  for (const item of pending) {
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok || response.status === 409 || response.status === 410 || response.status === 400) {
        await removeQueuedCheckin(item.clientEventId);
        results.push({ item, status: response.ok ? "accepted" : response.status === 409 ? "already_checked_in" : "failed" });
      }
    } catch {
      // Keep the item queued. A later online event will retry it.
    }
  }
  return results;
}

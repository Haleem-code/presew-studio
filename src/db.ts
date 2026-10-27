import type { StudioData } from "./domain";

const database = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("presew-studio", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("studio");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () =>
    reject(new Error("Your browser could not open local storage. Enable site storage and reload."));
});

export async function loadData(): Promise<StudioData | undefined> {
  const db = await database;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("studio", "readonly");
    const request = tx.objectStore("studio").get("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveData(data: StudioData): Promise<void> {
  const db = await database;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("studio", "readwrite");
    tx.objectStore("studio").put(data, "data");
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(
        new Error(
          "Could not save to this device. Your storage may be full. Remove an unused upload and try again.",
        ),
      );
    tx.onerror = () =>
      reject(new Error("Your browser could not save this change. Check available device storage."));
  });
}

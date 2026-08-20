export type InspectionPhotoDraft = {
  id: string;
  draftId: string;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  contentType: string;
  blob: Blob;
};

const DATABASE_NAME = "satgas-inspection-drafts";
const STORE_NAME = "photos";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Penyimpanan foto lokal tidak tersedia."));
  });
}

export async function saveInspectionPhotoDrafts(draftId: string, photos: InspectionPhotoDraft[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) { photos.forEach((photo) => store.put(photo)); return; } if ((cursor.value as InspectionPhotoDraft).draftId === draftId) cursor.delete(); cursor.continue(); };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Draf foto tidak dapat disimpan.")); };
  });
}

export async function loadInspectionPhotoDrafts(draftId: string): Promise<InspectionPhotoDraft[]> {
  if (typeof indexedDB === "undefined") return [];
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { database.close(); resolve((request.result as InspectionPhotoDraft[]).filter((photo) => photo.draftId === draftId)); };
    request.onerror = () => { database.close(); reject(request.error ?? new Error("Draf foto tidak dapat dibaca.")); };
  });
}

export async function deleteInspectionPhotoDrafts(draftId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const photos = await loadInspectionPhotoDrafts(draftId);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    photos.forEach((photo) => store.delete(photo.id));
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Draf foto tidak dapat dihapus.")); };
  });
}

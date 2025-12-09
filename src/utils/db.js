const DB_NAME = 'JarvisMediaDB';
const STORE_NAME = 'tracks';

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
};

export const saveTrack = async (track) => {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    // CONVERT BLOB TO ARRAYBUFFER (Mobile Safe)
    const arrayBuffer = await track.file.arrayBuffer();
    const safeTrack = {
        id: track.id,
        name: track.name,
        buffer: arrayBuffer, // Store raw data
        type: track.file.type
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(safeTrack);

    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
};

export const getTracks = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        // CONVERT BACK TO BLOB
        const tracks = request.result.map(t => {
            const blob = new Blob([t.buffer], { type: t.type });
            return { id: t.id, name: t.name, file: blob };
        });
        resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteTrack = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};
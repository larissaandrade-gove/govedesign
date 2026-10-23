// Entrega de arquivos entre apps do ecossistema na mesma origem (Print Studio →
// VectorCraft): um registro no IndexedDB, lido e apagado por quem recebe.
const DB = 'gove-handoff';
const STORE = 'files';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, run) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const out = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(out?.result);
        t.onerror = () => reject(t.error);
      }),
  );
}

/**
 * Guarda arquivos para o app `to` abrir.
 * @param {string} to
 * @param {{ from?: string, files: { name: string, bytes: Uint8Array }[] }} payload
 */
export function putHandoff(to, payload) {
  return tx('readwrite', (s) => s.put({ ...payload, at: Date.now() }, to));
}

/** Lê e apaga os arquivos deixados para `to` (valem por 1 hora). */
export async function takeHandoff(to = 'vectorcraft') {
  try {
    const item = await tx('readonly', (s) => s.get(to));
    if (!item) return null;
    await tx('readwrite', (s) => s.delete(to));
    return Date.now() - item.at < 3600e3 ? item : null;
  } catch {
    return null;
  }
}

window.StorageModule = (() => {
  const DB_NAME = 'ptits_diners_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_state';
  const LS_KEY = 'ptits_diners_state_v2';

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponible'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveState(state) {
    const serialized = JSON.stringify(state);
    try {
      localStorage.setItem(LS_KEY, serialized);
    } catch (_) {}

    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(state, 'main');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {}
  }

  async function loadState() {
    try {
      const db = await openDb();
      const fromIdb = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get('main');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (fromIdb) return fromIdb;
    } catch (_) {}

    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function encodeSyncPayload(state) {
    const compact = {
      v: 2,
      season: state.season,
      stock: state.stock,
      plan: state.plan,
      ratings: state.ratings,
      history: state.history.slice(0, 30),
      customRecipes: state.customRecipes || []
    };
    const json = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function decodeSyncPayload(encoded) {
    const json = decodeURIComponent(escape(atob(encoded.trim())));
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.stock)) {
      throw new Error('Format de synchronisation invalide.');
    }
    return parsed;
  }

  return { saveState, loadState, encodeSyncPayload, decodeSyncPayload };
})();

import { firebaseConfig, firebaseEnabled } from './firebase-config.js';

const LOCAL_STORAGE_KEY = 'rons-command-center-v4';
const LEGACY_KEYS = ['rons-todo-calendar-v3', 'rons-todo-calendar-v2', 'rons-todo-calendar-v1'];
export const COLLECTIONS = ['tasks','events','goals','habits','notes','shopping','workouts','projects','savings','activityLogs','dailyBlocks','dayPlans','accounts','accountHistory','usageLogs'];

let db = null;
let firestoreApi = null;
let firebaseApp = null;
let storageApi = null;
let storage = null;
const unsubscribers = [];
const changeListeners = new Set();

const emptyData = () => Object.fromEntries(COLLECTIONS.map(k => [k, []]));
const normalize = (data = {}) => {
  const out = { ...emptyData(), ...data };
  COLLECTIONS.forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  return out;
};

function localRead() {
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    const data = normalize(raw ? JSON.parse(raw) : {});
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Local read failed', error);
    return emptyData();
  }
}

function localWrite(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalize(data)));
  } catch (error) {
    console.error('Local write failed', error);
  }
}

function emitChange(detail = {}) {
  changeListeners.forEach(fn => {
    try { fn({ data: store.data, ...detail }); } catch (error) { console.error(error); }
  });
  window.dispatchEvent(new CustomEvent('command-center:data-changed', { detail }));
}

export const store = {
  mode: 'local',
  data: emptyData(),
  realtimeReady: false,

  async init() {
    if (!firebaseEnabled) {
      this.data = localRead();
      this.mode = 'local';
      emitChange({ source: 'local-init' });
      return this.data;
    }

    try {
      const appApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      firestoreApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
      firebaseApp = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp(firebaseConfig);
      db = firestoreApi.getFirestore(firebaseApp);
      this.mode = 'firebase';
      this.data = emptyData();
      await this.startRealtime();
      return this.data;
    } catch (error) {
      console.error('Firebase unavailable; using local storage.', error);
      this.mode = 'local';
      this.data = localRead();
      emitChange({ source: 'fallback-local' });
      return this.data;
    }
  },

  async startRealtime() {
    if (this.mode !== 'firebase' || !firestoreApi || !db) return;
    this.stopRealtime();
    const { collection, onSnapshot } = firestoreApi;
    const ready = new Set();
    const initialPromises = COLLECTIONS.map(name => new Promise(resolve => {
      const unsubscribe = onSnapshot(
        collection(db, name),
        snap => {
          this.data[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (!ready.has(name)) { ready.add(name); resolve(); }
          if (ready.size >= COLLECTIONS.length) this.realtimeReady = true;
          emitChange({ source: 'firestore', collection: name });
        },
        error => { console.error(`Realtime listener failed for ${name}`, error); resolve(); }
      );
      unsubscribers.push(unsubscribe);
    }));
    await Promise.all(initialPromises);
  },

  stopRealtime() {
    while (unsubscribers.length) {
      const fn = unsubscribers.pop();
      try { fn?.(); } catch {}
    }
    this.realtimeReady = false;
  },

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    changeListeners.add(fn);
    return () => changeListeners.delete(fn);
  },

  async save(type, item) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    if (!item?.id) throw new Error(`${type} item requires an id`);

    if (this.mode === 'firebase') {
      const { doc, setDoc } = firestoreApi;
      await setDoc(doc(db, type, String(item.id)), item, { merge: true });
    } else {
      localWrite(this.data);
      emitChange({ source: 'local-write', collection: type });
    }
    return item;
  },

  async upsert(type, item) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    const list = this.data[type] ||= [];
    const index = list.findIndex(x => x.id === item.id);
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.push(item);
    const saved = index >= 0 ? list[index] : item;
    await this.save(type, saved);
    if (this.mode === 'firebase') emitChange({ source: 'optimistic', collection: type });
    return saved;
  },

  async remove(type, id) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    const before = [...(this.data[type] || [])];
    this.data[type] = before.filter(x => x.id !== id);
    try {
      if (this.mode === 'firebase') {
        const { doc, deleteDoc } = firestoreApi;
        await deleteDoc(doc(db, type, String(id)));
        emitChange({ source: 'optimistic-delete', collection: type });
      } else {
        localWrite(this.data);
        emitChange({ source: 'local-delete', collection: type });
      }
    } catch (error) {
      this.data[type] = before;
      throw error;
    }
  },

  getAll(type) { return this.data[type] || []; },
  getById(type, id) { return this.data[type]?.find(x => x.id === id) || null; },
  getMode() { return this.mode; },

  async uploadAttachment(file, folder = 'attachments') {
    if (!file) return null;
    if (this.mode !== 'firebase' || !firebaseApp) throw new Error('Firebase Storage requires Firebase mode.');
    if (!storageApi) {
      storageApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js');
      storage = storageApi.getStorage(firebaseApp);
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${safe}`;
    const ref = storageApi.ref(storage, path);
    await storageApi.uploadBytes(ref, file, { contentType: file.type || 'application/octet-stream' });
    const url = await storageApi.getDownloadURL(ref);
    return { name: file.name, path, url, type: file.type, size: file.size, featured: false };
  }
};

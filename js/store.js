import { firebaseConfig, firebaseEnabled } from './firebase-config.js';

const LOCAL_STORAGE_KEY = 'rons-todo-calendar-v3';
const LEGACY_KEYS = ['rons-todo-calendar-v1', 'rons-todo-calendar-v2'];
export const COLLECTIONS = ['tasks','events','goals','habits','notes','shopping','workouts','projects'];
let db = null, firestoreApi = null, firebaseApp = null, storageApi = null, storage = null;

const emptyData = () => Object.fromEntries(COLLECTIONS.map(k => [k, []]));
function normalize(data = {}) {
  const out = { ...emptyData(), ...data };
  COLLECTIONS.forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  return out;
}
function localRead() {
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) { raw = localStorage.getItem(key); if (raw) break; }
    }
    const data = normalize(raw ? JSON.parse(raw) : {});
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (e) { console.error('Local read failed', e); return emptyData(); }
}
function localWrite(data) { try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalize(data))); } catch(e){ console.error('Local write failed', e); } }

export const store = {
  mode: 'local', data: emptyData(),
  async init() {
    if (!firebaseEnabled) { this.data = localRead(); return this.data; }
    try {
      const appApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      firestoreApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
      firebaseApp = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp(firebaseConfig);
      db = firestoreApi.getFirestore(firebaseApp); this.mode = 'firebase';
      await this.loadFirebase(); return this.data;
    } catch (e) {
      console.error('Firebase unavailable; using local storage.', e);
      this.mode = 'local'; this.data = localRead(); return this.data;
    }
  },
  async loadFirebase() {
    const { collection, getDocs } = firestoreApi;
    const next = emptyData();
    for (const name of COLLECTIONS) {
      try { const snap = await getDocs(collection(db, name)); next[name] = snap.docs.map(d => ({id:d.id, ...d.data()})); }
      catch(e){ console.error(`Unable to load ${name}`, e); next[name] = []; }
    }
    this.data = normalize(next); return this.data;
  },
  async save(type, item) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    if (!item?.id) throw new Error(`${type} item requires an id`);
    if (this.mode === 'firebase') {
      const { doc, setDoc } = firestoreApi;
      await setDoc(doc(db, type, String(item.id)), item, { merge:true });
    } else localWrite(this.data);
    return item;
  },
  async upsert(type, item) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    const list = this.data[type] ||= [];
    const i = list.findIndex(x => x.id === item.id);
    if (i >= 0) list[i] = {...list[i], ...item}; else list.push(item);
    const saved = i >= 0 ? list[i] : item; await this.save(type, saved); return saved;
  },
  async remove(type, id) {
    if (!COLLECTIONS.includes(type)) throw new Error(`Invalid collection: ${type}`);
    const before = [...(this.data[type] || [])]; this.data[type] = before.filter(x => x.id !== id);
    try {
      if (this.mode === 'firebase') { const {doc, deleteDoc}=firestoreApi; await deleteDoc(doc(db,type,String(id))); }
      else localWrite(this.data);
    } catch(e){ this.data[type] = before; throw e; }
  },
  getAll(type){ return this.data[type] || []; },
  getById(type,id){ return this.data[type]?.find(x=>x.id===id) || null; },
  getMode(){ return this.mode; },
  async uploadAttachment(file, folder='attachments') {
    if (!file) return null;
    if (this.mode !== 'firebase' || !firebaseApp) throw new Error('Firebase Storage requires Firebase mode.');
    if (!storageApi) {
      storageApi = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js');
      storage = storageApi.getStorage(firebaseApp);
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path = `${folder}/${Date.now()}-${safe}`;
    const ref = storageApi.ref(storage, path);
    await storageApi.uploadBytes(ref, file, {contentType:file.type || 'application/octet-stream'});
    const url = await storageApi.getDownloadURL(ref);
    return { name:file.name, path, url, type:file.type, size:file.size };
  }
};

import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";
import { seedData, todayISO } from "./data.js";

const LOCAL_STORAGE_KEY = "rons-todo-calendar-v1";

const COLLECTIONS = [
  "tasks",
  "tasks",
  "goals",
  "habits",
  "notes",
  "shopping"
];

let db = null;
let firestoreApi = null;

/* =========================================================
   LOCAL STORAGE
========================================================= */

function localRead() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (raw) {
      return JSON.parse(raw);
    }

    const data = seedData(todayISO());

    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(data)
    );

    return data;
  } catch (error) {
    console.error("Unable to read local storage:", error);

    return seedData(todayISO());
  }
}

function localWrite(data) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Unable to save local data:", error);
  }
}

/* =========================================================
   STORE
========================================================= */

export const store = {

  mode: "local",

data: {
  tasks: [],
  tasks: [],
  goals: [],
  habits: [],
  notes: [],
  shopping: []
},

  /* =======================================================
     INITIALIZE STORE
  ======================================================= */

  async init() {

    if (!firebaseEnabled) {
      console.info("Firebase disabled. Using local storage.");

      this.mode = "local";
      this.data = localRead();

      return this.data;
    }

    try {

      console.info("Connecting to Firebase...");

      const appApi = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
      );

      firestoreApi = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );

      const app = appApi.initializeApp(firebaseConfig);

      db = firestoreApi.getFirestore(app);

      this.mode = "firebase";

      await this.loadFirebase();

      console.info("Firebase connected successfully.");

      return this.data;

    } catch (error) {

      console.error(
        "Firebase connection failed. Switching to local storage.",
        error
      );

      this.mode = "local";

      this.data = localRead();

      return this.data;
    }
  },

  /* =======================================================
     LOAD FIRESTORE
  ======================================================= */

  async loadFirebase() {

    if (!db || !firestoreApi) {
      throw new Error("Firestore has not been initialized.");
    }

    const {
      collection,
      getDocs
    } = firestoreApi;

    const firebaseData = {};

    let documentCount = 0;

    for (const collectionName of COLLECTIONS) {

      try {

        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        firebaseData[collectionName] =
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
          }));

        documentCount += snapshot.size;

      } catch (error) {

        console.error(
          `Unable to load ${collectionName}:`,
          error
        );

        firebaseData[collectionName] = [];
      }
    }

    /*
      Only seed Firebase when ALL collections are empty.
    */

    if (documentCount === 0) {

      console.info(
        "Firestore is empty. Adding starter data..."
      );

      this.data = seedData(todayISO());

      await this.seedFirebase();

    } else {

      this.data = firebaseData;

    }

    return this.data;
  },

  /* =======================================================
     SEED FIRESTORE
  ======================================================= */

  async seedFirebase() {

    if (this.mode !== "firebase") {
      return;
    }

    for (const collectionName of COLLECTIONS) {

      const items =
        this.data[collectionName] || [];

      for (const item of items) {

        await this.save(
          collectionName,
          item
        );
      }
    }

    console.info(
      "Starter data added to Firestore."
    );
  },

  /* =======================================================
     SAVE DOCUMENT
  ======================================================= */

  async save(type, item) {

    if (!COLLECTIONS.includes(type)) {
      throw new Error(
        `Invalid collection: ${type}`
      );
    }

    if (!item?.id) {
      throw new Error(
        `Cannot save ${type}: item requires an id.`
      );
    }

    if (this.mode === "firebase") {

      try {

        const {
          doc,
          setDoc
        } = firestoreApi;

        const documentReference =
          doc(
            db,
            type,
            String(item.id)
          );

        await setDoc(
          documentReference,
          item,
          {
            merge: true
          }
        );

        console.debug(
          `Saved ${type}/${item.id}`
        );

      } catch (error) {

        console.error(
          `Unable to save ${type}/${item.id}:`,
          error
        );

        throw error;
      }

    } else {

      localWrite(this.data);

    }

    return item;
  },

  /* =======================================================
     UPSERT
  ======================================================= */

  async upsert(type, item) {

    if (!this.data[type]) {
      this.data[type] = [];
    }

    const index =
      this.data[type].findIndex(
        (existingItem) =>
          existingItem.id === item.id
      );

    if (index >= 0) {

      this.data[type][index] = {
        ...this.data[type][index],
        ...item
      };

    } else {

      this.data[type].push(item);

    }

    const savedItem =
      index >= 0
        ? this.data[type][index]
        : item;

    await this.save(
      type,
      savedItem
    );

    return savedItem;
  },

  /* =======================================================
     REMOVE DOCUMENT
  ======================================================= */

  async remove(type, id) {

    if (!COLLECTIONS.includes(type)) {
      throw new Error(
        `Invalid collection: ${type}`
      );
    }

    if (!this.data[type]) {
      return;
    }

    const originalItems =
      [...this.data[type]];

    this.data[type] =
      this.data[type].filter(
        (item) => item.id !== id
      );

    try {

      if (this.mode === "firebase") {

        const {
          doc,
          deleteDoc
        } = firestoreApi;

        await deleteDoc(
          doc(
            db,
            type,
            String(id)
          )
        );

      } else {

        localWrite(this.data);

      }

      console.debug(
        `Deleted ${type}/${id}`
      );

    } catch (error) {

      /*
        Restore local state if Firestore deletion fails.
      */

      this.data[type] = originalItems;

      console.error(
        `Unable to delete ${type}/${id}:`,
        error
      );

      throw error;
    }
  },

  /* =======================================================
     GET COLLECTION
  ======================================================= */

  getAll(type) {

    return this.data[type] || [];

  },

  /* =======================================================
     GET SINGLE ITEM
  ======================================================= */

  getById(type, id) {

    return (
      this.data[type]?.find(
        (item) => item.id === id
      ) || null
    );
  },

  /* =======================================================
     DATABASE STATUS
  ======================================================= */

  getMode() {

    return this.mode;

  }

};
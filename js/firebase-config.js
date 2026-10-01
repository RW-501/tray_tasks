// Paste your Firebase Web App config here. Leave apiKey blank to use V1 localStorage demo mode.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

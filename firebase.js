// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// 🔥 Firestore (DATABASE)
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};


// Initialize
const app = initializeApp(firebaseConfig);
console.log("✅ Firebase initialized", app);

// 🔥 Initialize Firestore
const db = getFirestore(app);
console.log("🔥 Firestore ready", db);

// Export
export { app, db };
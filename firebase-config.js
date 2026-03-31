// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase project credentials (FIXED)
const firebaseConfig = {
  apiKey: "AIzaSyDfTh-4-RYAnNKHiazNNhH985pDBBDk48",
  authDomain: "ducksitet-55d89.firebaseapp.com",
  projectId: "ducksitet-55d89",
  storageBucket: "ducksitet-55d89.appspot.com", // ✅ FIXED HERE
  messagingSenderId: "1046771611799",
  appId: "1:1046771611799:web:9988a2d30c0d5d5cf8d1d2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
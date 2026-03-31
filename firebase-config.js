// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAesYrgoGw83eUbQLUrqAlsYLgr16FjUd8",
  authDomain: "ducksitet-a5501.firebaseapp.com",
  projectId: "ducksitet-a5501",
  storageBucket: "ducksitet-a5501.appspot.com",
  messagingSenderId: "132133020741",
  appId: "1:132133020741:web:40cc05208515d479df6f2c",
  measurementId: "G-5MC1HJMWYZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
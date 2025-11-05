import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 1. Import getFirestore
import { getFirestore } from "firebase/firestore";

// The configuration now securely reads from your .env file
// MAKE SURE you have a .env file in your project root
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
fcmSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID, // Corrected property name
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- MODIFIED ORDER ---
// Initialize and export db (Firestore) first
export const db = getFirestore(app);

// Initialize and export auth second
export const auth = getAuth(app);


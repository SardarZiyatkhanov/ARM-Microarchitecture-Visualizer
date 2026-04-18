import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if we have real configured keys (not placeholder 'your_api_key')
export const isFirebaseInitialized = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key';

let app: any;
let db: any;
let auth: any;

if (isFirebaseInitialized) {
    app = initializeApp(firebaseConfig);
    // Force long polling — fixes WebSocket blocks on university/corporate networks
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true
    });
    auth = getAuth(app);
} else {
    // Provide safe fallbacks so module export doesn't crash React!
    app = null;
    db = null;
    auth = null;
}

export { app, db, auth };
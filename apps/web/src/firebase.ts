import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ваша конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC9_1X0pWeuRxLZ6eC3zbQP__xK-xsyq90",
    authDomain: "playarm.firebaseapp.com",
    projectId: "playarm",
    storageBucket: "playarm.firebasestorage.app",
    messagingSenderId: "966877398444",
    appId: "1:966877398444:web:79ccffa900851b7143e609",
    measurementId: "G-PCVP1HVPEH"
};

// Инициализация самого приложения Firebase
const app = initializeApp(firebaseConfig);

// Инициализация базы данных с強制 Long Polling (исправляет блокировки WebSocket в универах/корпоративных сетях)
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

export const auth = getAuth(app);

export const isFirebaseInitialized = !!firebaseConfig.apiKey;
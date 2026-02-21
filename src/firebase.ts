import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ваша конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB11VKKNxt9nkCfjAhB46GIvoy9C_KQNFg",
    authDomain: "playarm-project.firebaseapp.com",
    projectId: "playarm-project",
    storageBucket: "playarm-project.firebasestorage.app",
    messagingSenderId: "894259892273",
    appId: "1:894259892273:web:50d91a1c7869f1cefa0510",
    measurementId: "G-2JG9NWEG9F"
};

// Инициализация самого приложения Firebase
const app = initializeApp(firebaseConfig);

// Инициализация и экспорт базы данных (Firestore) и системы авторизации (Auth)
export const db = getFirestore(app);
export const auth = getAuth(app);

// 👇 ВОТ ЭТА СТРОКА ИСПРАВИТ ОШИБКУ БЕЛОГО ЭКРАНА 👇
export const isFirebaseInitialized = !!firebaseConfig.apiKey;
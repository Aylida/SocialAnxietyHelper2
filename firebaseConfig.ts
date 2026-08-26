import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

// NOT: getAnalytics buraya bilerek eklenmedi — React Native/Expo Go içinde
// çalışmıyor (web-only bir özellik), hata verir.

const firebaseConfig = {
  apiKey: "AIzaSyAfNsQqQSKY0PHP4m0cReuqRk0BXZCegtQ",
  authDomain: "socialanxietyhelper.firebaseapp.com",
  projectId: "socialanxietyhelper",
  storageBucket: "socialanxietyhelper.firebasestorage.app",
  messagingSenderId: "863906191672",
  appId: "1:863906191672:web:7d6fcbc025e156a6a649cd",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// NOT: getReactNativePersistence bu Firebase SDK sürümünde export edilmiyor.
// Bu yüzden şimdilik varsayılan (bellek içi) kalıcılık kullanılıyor —
// yani uygulamayı tamamen kapatıp açtığında oturum hatırlanmayabilir.
// Giriş/Auth ekranını kurarken istersen bunu geliştiririz.
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

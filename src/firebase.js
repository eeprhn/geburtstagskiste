import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyBjm8sXVSh-TvhcAud-yhEszrwH32onHrA",
  authDomain: "geburtstagskiste.firebaseapp.com",
  databaseURL: "https://geburtstagskiste-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "geburtstagskiste",
  storageBucket: "geburtstagskiste.firebasestorage.app",
  messagingSenderId: "127213765212",
  appId: "1:127213765212:web:5251bb5ba73bca02159c99"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
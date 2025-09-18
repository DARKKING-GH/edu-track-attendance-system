// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics } from "firebase/analytics"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAoOtc4N0iJ4gdZdpObXjB7YhV02Ale74",
  authDomain: "smart-attend-2d532.firebaseapp.com",
  projectId: "smart-attend-2d532",
  storageBucket: "smart-attend-2d532.firebasestorage.app",
  messagingSenderId: "415016158042",
  appId: "1:415016158042:web:7b9b5bb746c6a79db76963",
  measurementId: "G-1Q8EHE8SKP",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics (only in browser)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null

export default app

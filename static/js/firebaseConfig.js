// Import Firebase
import firebase from "firebase/app"
import "firebase/auth"

// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Auth functions
function signInWithEmail(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password)
}

function signUpWithEmail(email, password) {
  return firebase.auth().createUserWithEmailAndPassword(email, password)
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider()
  provider.addScope("email")
  provider.addScope("profile")
  return firebase.auth().signInWithPopup(provider)
}

function signOut() {
  return firebase.auth().signOut()
}

// Helper function to get ID token
function getIdToken() {
  return firebase.auth().currentUser?.getIdToken()
}

// Auth state observer
firebase.auth().onAuthStateChanged((user) => {
  // Handle auth state changes if needed
  if (user && (window.location.pathname === "/login" || window.location.pathname === "/signup")) {
    // User is signed in but on auth pages, let the form handlers manage the redirect
    return
  }

  if (!user && window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
    // User is not signed in and not on auth pages, redirect to login
    // Only redirect if we're not already on a public page
    const publicPages = ["/login", "/signup", "/"]
    if (!publicPages.includes(window.location.pathname)) {
      window.location.href = "/login"
    }
  }
})

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase"

export interface UserProfile {
  uid: string
  email: string
  name: string
  role: "student" | "lecturer" | "admin"
  approved: boolean
  createdAt: Date
}

export const signUp = async (email: string, password: string, name: string, role: "student" | "lecturer" | "admin") => {
  try {
    console.log("[v0] Starting signup process for:", email, role)

    const userCredential = (await Promise.race([
      createUserWithEmailAndPassword(auth, email, password),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Authentication timeout")), 15000)),
    ])) as any

    const user = userCredential.user
    console.log("[v0] User account created:", user.uid)

    // Create user profile in Firestore with retry mechanism
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      name,
      role,
      approved: role === "student" || role === "admin", // Students and admins are auto-approved
      createdAt: new Date(),
    }

    let profileSaved = false
    let retryCount = 0
    const maxRetries = 3

    while (!profileSaved && retryCount < maxRetries) {
      try {
        console.log(`[v0] Attempting to save profile (attempt ${retryCount + 1})...`)
        await Promise.race([
          setDoc(doc(db, "users", user.uid), userProfile),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Database write timeout")), 8000)),
        ])
        profileSaved = true
        console.log("[v0] User profile saved successfully")
      } catch (firestoreError) {
        retryCount++
        console.error(`[v0] Firestore write attempt ${retryCount} failed:`, firestoreError)
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retry
        }
      }
    }

    if (!profileSaved) {
      console.error("[v0] Failed to save profile after all retries")
      // Don't throw error - user account is created, profile can be created on login
    }

    return { user, profile: userProfile }
  } catch (error: any) {
    console.error("[v0] Signup error:", error)

    if (error.code === "auth/email-already-in-use") {
      throw new Error("An account with this email already exists. Please sign in instead.")
    }
    if (error.message === "Authentication timeout") {
      throw new Error("Account creation is taking too long. Please check your internet connection and try again.")
    }

    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    console.log("[v0] Starting signin process for:", email)

    const userCredential = (await Promise.race([
      signInWithEmailAndPassword(auth, email, password),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Authentication timeout")), 15000)),
    ])) as any

    const user = userCredential.user
    console.log("[v0] User authenticated:", user.uid)

    let profile: UserProfile

    try {
      console.log("[v0] Fetching user profile from database...")
      const userDoc = (await Promise.race([
        getDoc(doc(db, "users", user.uid)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)),
      ])) as any

      if (!userDoc.exists()) {
        console.log("[v0] Profile not found in database, creating new profile...")

        // Try to determine role from email domain or default to student
        let detectedRole: "student" | "lecturer" | "admin" = "student"
        if (user.email?.includes("@admin.") || user.email?.includes("admin@")) {
          detectedRole = "admin"
        } else if (
          user.email?.includes("@lecturer.") ||
          user.email?.includes("lecturer@") ||
          user.email?.includes("@staff.")
        ) {
          detectedRole = "lecturer"
        }

        profile = {
          uid: user.uid,
          email: user.email!,
          name: user.displayName || user.email!.split("@")[0],
          role: detectedRole,
          approved: detectedRole === "student" || detectedRole === "admin",
          createdAt: new Date(),
        }

        // Try to save the profile
        try {
          await Promise.race([
            setDoc(doc(db, "users", user.uid), profile),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Profile save timeout")), 8000)),
          ])
          console.log("[v0] New profile created and saved successfully")
        } catch (saveError) {
          console.log("[v0] Could not save new profile to database, using in-memory profile")
        }
      } else {
        profile = userDoc.data() as UserProfile
        console.log("[v0] Profile loaded successfully:", profile.role, "approved:", profile.approved)
      }
    } catch (profileError) {
      console.log("[v0] Profile fetch failed, creating fallback profile:", profileError)

      // Create a more intelligent fallback based on email
      let fallbackRole: "student" | "lecturer" | "admin" = "student"
      if (user.email?.includes("@admin.") || user.email?.includes("admin@")) {
        fallbackRole = "admin"
      } else if (
        user.email?.includes("@lecturer.") ||
        user.email?.includes("lecturer@") ||
        user.email?.includes("@staff.")
      ) {
        fallbackRole = "lecturer"
      }

      profile = {
        uid: user.uid,
        email: user.email!,
        name: user.displayName || user.email!.split("@")[0],
        role: fallbackRole,
        approved: fallbackRole === "student" || fallbackRole === "admin",
        createdAt: new Date(),
      }
      console.log("[v0] Using fallback profile for:", profile.role)
    }

    if (!profile.approved && profile.role === "lecturer") {
      throw new Error("Your lecturer account is pending admin approval. Please contact an administrator.")
    }

    console.log("[v0] Signin successful for:", profile.role)
    return { user, profile }
  } catch (error: any) {
    console.error("[v0] Signin error:", error)

    if (error.message === "Authentication timeout") {
      throw new Error("Sign in is taking too long. Please check your internet connection and try again.")
    }

    throw error
  }
}

export const signOut = async () => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error("[v0] Signout error:", error)
    throw error
  }
}

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error("[v0] Get user profile error:", error)
    return null
  }
}

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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      name,
      role,
      approved: role === "student" || role === "admin", // Students and admins are auto-approved
      createdAt: new Date(),
    }

    let retries = 3
    while (retries > 0) {
      try {
        await setDoc(doc(db, "users", user.uid), userProfile)
        break
      } catch (error: any) {
        retries--
        if (retries === 0) throw error
        console.log(`[v0] Retrying Firestore write... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return { user, profile: userProfile }
  } catch (error) {
    console.error("[v0] Signup error:", error)
    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    let profile: UserProfile
    let retries = 3

    while (retries > 0) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists()) {
          throw new Error("User profile not found")
        }
        profile = userDoc.data() as UserProfile
        break
      } catch (error: any) {
        retries--
        if (retries === 0) throw error
        console.log(`[v0] Retrying Firestore connection... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    if (!profile!.approved && profile!.role === "lecturer") {
      throw new Error("Your account is pending admin approval")
    }

    return { user, profile: profile! }
  } catch (error) {
    console.error("[v0] Signin error:", error)
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

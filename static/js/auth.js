// Authentication functions and UI handlers

// Import Bootstrap and Firebase functions
import { bootstrap } from "bootstrap"
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "./firebaseAuth"

// Show alert message
function showAlert(message, type = "danger") {
  const alertContainer = document.getElementById("alert-container")
  const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === "success" ? "check-circle" : "exclamation-triangle"} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `
  alertContainer.innerHTML = alertHtml

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = alertContainer.querySelector(".alert")
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert)
      bsAlert.close()
    }
  }, 5000)
}

// Toggle password visibility
function setupPasswordToggle() {
  const toggleButtons = document.querySelectorAll("#togglePassword")
  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const passwordInput = this.parentElement.querySelector('input[type="password"], input[type="text"]')
      const icon = this.querySelector("i")

      if (passwordInput.type === "password") {
        passwordInput.type = "text"
        icon.classList.remove("fa-eye")
        icon.classList.add("fa-eye-slash")
      } else {
        passwordInput.type = "password"
        icon.classList.remove("fa-eye-slash")
        icon.classList.add("fa-eye")
      }
    })
  })
}

// Initialize login page
function initializeLogin() {
  setupPasswordToggle()

  const loginForm = document.getElementById("loginForm")
  const googleSignInBtn = document.getElementById("googleSignInBtn")

  // Email/Password login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const loginBtn = document.getElementById("loginBtn")
    const spinner = document.getElementById("loginSpinner")

    // Show loading state
    loginBtn.disabled = true
    spinner.classList.remove("d-none")

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmail(email, password)
      const idToken = await userCredential.user.getIdToken()

      // Send token to backend
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: idToken }),
      })

      const data = await response.json()

      if (data.success) {
        showAlert("Login successful! Redirecting...", "success")
        setTimeout(() => {
          window.location.href = "/"
        }, 1500)
      } else {
        showAlert(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      showAlert(getFirebaseErrorMessage(error.code))
    } finally {
      // Hide loading state
      loginBtn.disabled = false
      spinner.classList.add("d-none")
    }
  })

  // Google Sign In
  googleSignInBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithGoogle()
      const idToken = await result.user.getIdToken()

      // Send token to backend
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: idToken }),
      })

      const data = await response.json()

      if (data.success) {
        showAlert("Login successful! Redirecting...", "success")
        setTimeout(() => {
          window.location.href = "/"
        }, 1500)
      } else {
        showAlert(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Google sign in error:", error)
      showAlert(getFirebaseErrorMessage(error.code))
    }
  })
}

// Initialize signup page
function initializeSignup() {
  setupPasswordToggle()

  const signupForm = document.getElementById("signupForm")
  const googleSignUpBtn = document.getElementById("googleSignUpBtn")

  // Email/Password signup
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const firstName = document.getElementById("firstName").value
    const lastName = document.getElementById("lastName").value
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirmPassword").value
    const role = document.getElementById("role").value
    const signupBtn = document.getElementById("signupBtn")
    const spinner = document.getElementById("signupSpinner")

    // Validate passwords match
    if (password !== confirmPassword) {
      showAlert("Passwords do not match")
      return
    }

    // Show loading state
    signupBtn.disabled = true
    spinner.classList.remove("d-none")

    try {
      // Create user with Firebase
      const userCredential = await signUpWithEmail(email, password)
      const idToken = await userCredential.user.getIdToken()

      // Send user data to backend
      const response = await fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: idToken,
          name: `${firstName} ${lastName}`,
          role: role,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (role === "lecturer") {
          showAlert("Account created! Please wait for admin approval before accessing the system.", "success")
        } else {
          showAlert("Account created successfully! Redirecting...", "success")
        }

        setTimeout(() => {
          window.location.href = "/"
        }, 2000)
      } else {
        showAlert(data.error || "Signup failed")
      }
    } catch (error) {
      console.error("Signup error:", error)
      showAlert(getFirebaseErrorMessage(error.code))
    } finally {
      // Hide loading state
      signupBtn.disabled = false
      spinner.classList.add("d-none")
    }
  })

  // Google Sign Up
  googleSignUpBtn.addEventListener("click", async () => {
    // Show role selection modal first
    showRoleSelectionModal(async (selectedRole) => {
      try {
        const result = await signInWithGoogle()
        const idToken = await result.user.getIdToken()
        const displayName = result.user.displayName || "User"

        // Send user data to backend
        const response = await fetch("/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken: idToken,
            name: displayName,
            role: selectedRole,
          }),
        })

        const data = await response.json()

        if (data.success) {
          if (selectedRole === "lecturer") {
            showAlert("Account created! Please wait for admin approval before accessing the system.", "success")
          } else {
            showAlert("Account created successfully! Redirecting...", "success")
          }

          setTimeout(() => {
            window.location.href = "/"
          }, 2000)
        } else {
          showAlert(data.error || "Signup failed")
        }
      } catch (error) {
        console.error("Google sign up error:", error)
        showAlert(getFirebaseErrorMessage(error.code))
      }
    })
  })
}

// Show role selection modal for Google signup
function showRoleSelectionModal(callback) {
  const modalHtml = `
        <div class="modal fade" id="roleModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Select Your Role</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Please select your role to continue:</p>
                        <div class="d-grid gap-2">
                            <button type="button" class="btn btn-outline-primary" data-role="student">
                                <i class="fas fa-user-graduate me-2"></i>
                                I'm a Student
                            </button>
                            <button type="button" class="btn btn-outline-primary" data-role="lecturer">
                                <i class="fas fa-chalkboard-teacher me-2"></i>
                                I'm a Lecturer
                            </button>
                        </div>
                        <div class="mt-3">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Lecturers require admin approval before accessing the system
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

  document.body.insertAdjacentHTML("beforeend", modalHtml)
  const modal = new bootstrap.Modal(document.getElementById("roleModal"))

  // Handle role selection
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", function () {
      const role = this.getAttribute("data-role")
      modal.hide()
      callback(role)
    })
  })

  // Clean up modal when hidden
  document.getElementById("roleModal").addEventListener("hidden.bs.modal", function () {
    this.remove()
  })

  modal.show()
}

// Get user-friendly Firebase error messages
function getFirebaseErrorMessage(errorCode) {
  const errorMessages = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters long.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
  }

  return errorMessages[errorCode] || "An error occurred. Please try again."
}

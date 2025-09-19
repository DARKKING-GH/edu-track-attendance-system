"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { QrCode, Users, BookOpen, BarChart3, Shield, Scan, UserCheck, GraduationCap, Loader2 } from "lucide-react"
import { signIn, signUp } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function EduTrackHome() {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as "student" | "lecturer" | "admin",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("[v0] Login attempt:", loginForm.email)
      const { profile } = await signIn(loginForm.email, loginForm.password)

      setSuccess("Login successful! Redirecting...")

      // Redirect based on role
      setTimeout(() => {
        switch (profile.role) {
          case "admin":
            router.push("/admin")
            break
          case "lecturer":
            router.push("/lecturer")
            break
          case "student":
            router.push("/student")
            break
          default:
            router.push("/student")
        }
      }, 1000)
    } catch (error: any) {
      console.error("[v0] Login error:", error)

      setError(error.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Basic validation
    if (signupForm.password.length < 6) {
      setError("Password must be at least 6 characters long.")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Signup attempt:", signupForm.email, signupForm.role)

      await Promise.race([
        signUp(signupForm.email, signupForm.password, signupForm.name, signupForm.role),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Signup timeout")), 15000)),
      ])

      console.log("[v0] Account created, signing in user...")
      const { profile } = await signIn(signupForm.email, signupForm.password)

      if (signupForm.role === "lecturer" && !profile.approved) {
        setSuccess(
          "Account created successfully! Your lecturer account is pending admin approval. You'll be notified once approved.",
        )
        // Reset form but don't redirect for unapproved lecturers
        setSignupForm({ name: "", email: "", password: "", role: "student" })
      } else {
        setSuccess("Account created successfully! Redirecting to your dashboard...")

        setSignupForm({ name: "", email: "", password: "", role: "student" })

        setTimeout(() => {
          switch (profile.role) {
            case "admin":
              router.push("/admin")
              break
            case "lecturer":
              router.push("/lecturer")
              break
            case "student":
              router.push("/student")
              break
            default:
              router.push("/student")
          }
        }, 1500)
      }
    } catch (error: any) {
      console.error("[v0] Signup error:", error)
      let errorMessage = "Account creation failed. Please try again."

      if (error.message === "Signup timeout") {
        errorMessage = "Account creation is taking too long. Please check your internet connection and try again."
      } else if (error.message.includes("email-already-in-use")) {
        errorMessage = "An account with this email already exists. Please sign in instead."
      } else if (error.message.includes("weak-password")) {
        errorMessage = "Password is too weak. Please choose a stronger password."
      } else if (error.message.includes("invalid-email")) {
        errorMessage = "Please enter a valid email address."
      } else if (error.message.includes("timeout")) {
        errorMessage = "The process is taking longer than expected. Please try again or check your internet connection."
      } else if (error.message.includes("Database write timeout")) {
        errorMessage = "Account created but setup is incomplete. Please try signing in."
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/30 to-background">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <QrCode className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">EduTrack</h1>
                <p className="text-sm text-muted-foreground font-medium">Smart Attendance System</p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium">
              <Shield className="h-4 w-4" />
              Secure & Reliable
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-5xl font-bold tracking-tight text-foreground mb-6 text-balance">
                Modern Attendance Tracking for Educational Institutions
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed text-pretty">
                Streamline attendance management with QR code technology, real-time analytics, and role-based dashboards
                for students, lecturers, and administrators.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Scan className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-semibold">QR Code Scanning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Quick and contactless attendance marking using smartphone cameras with instant verification
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <BarChart3 className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle className="text-xl font-semibold">Real-time Analytics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Comprehensive attendance reports and performance insights with interactive dashboards
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-semibold">Role-based Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Customized dashboards for students, lecturers, and administrators with secure permissions
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <BookOpen className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle className="text-xl font-semibold">Course Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Organize classes, track enrollment, and manage academic sessions with automated workflows
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md shadow-xl border-border/50">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl font-bold">Welcome to EduTrack</CardTitle>
                <CardDescription className="text-base text-muted-foreground leading-relaxed">
                  Sign in to your account or create a new one to get started with smart attendance tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
                    {success}
                  </div>
                )}

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="login" className="text-base font-medium">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="text-base font-medium">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="Enter your email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                          required
                          disabled={loading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="mr-2 h-4 w-4" />
                        )}
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={signupForm.name}
                          onChange={(e) => setSignupForm((prev) => ({ ...prev, name: e.target.value }))}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm((prev) => ({ ...prev, email: e.target.value }))}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a password (min. 6 characters)"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                          required
                          disabled={loading}
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                          id="role"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={signupForm.role}
                          onChange={(e) =>
                            setSignupForm((prev) => ({
                              ...prev,
                              role: e.target.value as "student" | "lecturer" | "admin",
                            }))
                          }
                          disabled={loading}
                        >
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <GraduationCap className="mr-2 h-4 w-4" />
                        )}
                        {loading ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <p className="font-semibold mb-3 text-foreground">Account Types:</p>
                      <div className="space-y-2 text-left">
                        <p className="flex items-start gap-2">
                          <span className="font-medium text-primary">Student:</span>
                          <span>Scan QR codes to mark attendance and view records</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="font-medium text-accent">Lecturer:</span>
                          <span>Generate QR codes and manage courses (requires admin approval)</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="font-medium text-primary">Admin:</span>
                          <span>Full system management and user approval</span>
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

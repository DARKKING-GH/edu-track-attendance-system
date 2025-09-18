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
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      console.log("[v0] Login attempt:", loginForm.email)
      const { profile } = await signIn(loginForm.email, loginForm.password)

      // Redirect based on role
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

    try {
      console.log("[v0] Signup attempt:", signupForm.email, signupForm.role)
      await signUp(signupForm.email, signupForm.password, signupForm.name, signupForm.role)

      if (signupForm.role === "lecturer") {
        alert("Account created successfully! Your account is pending admin approval.")
      } else {
        alert("Account created successfully! You can now sign in.")
      }

      // Reset form
      setSignupForm({ name: "", email: "", password: "", role: "student" })
    } catch (error: any) {
      console.error("[v0] Signup error:", error)
      setError(error.message || "Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">EduTrack</h1>
                <p className="text-sm text-muted-foreground">Smart Attendance System</p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              <Shield className="mr-1 h-3 w-3" />
              Secure & Reliable
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Features */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                Modern Attendance Tracking for Educational Institutions
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Streamline attendance management with QR code technology, real-time analytics, and role-based dashboards
                for students, lecturers, and administrators.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Scan className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">QR Code Scanning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Quick and contactless attendance marking using smartphone cameras
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Real-time Analytics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive attendance reports and performance insights
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Role-based Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customized dashboards for students, lecturers, and administrators
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Course Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Organize classes, track enrollment, and manage academic sessions
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Auth Forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome to EduTrack</CardTitle>
                <CardDescription>Sign in to your account or create a new one to get started</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
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

                    <div className="text-center text-sm text-muted-foreground">
                      <p>Demo accounts:</p>
                      <p>Student: student@edu.com</p>
                      <p>Lecturer: lecturer@edu.com</p>
                      <p>Admin: admin@edu.com</p>
                    </div>
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
                          placeholder="Create a password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
                          required
                          disabled={loading}
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

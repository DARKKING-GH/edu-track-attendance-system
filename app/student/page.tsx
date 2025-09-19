"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { QrCode, Calendar, CheckCircle, XCircle, Home, User, BarChart3, LogOut, Loader2, Upload } from "lucide-react"
import { getCurrentUser, getUserProfile, signOut, type UserProfile } from "@/lib/auth"
import { collection, query, where, getDocs, addDoc, orderBy, limit, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"
import { QRScannerComponent } from "@/components/qr-scanner"

interface Course {
  id: string
  name: string
  code: string
  lecturerId: string
  createdAt: Date
}

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseName: string
  courseCode: string
  date: Date
  status: "present" | "absent"
  markedAt: Date
  sessionInfo: string
  qrData: string
}

export default function StudentDashboard() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceStats, setAttendanceStats] = useState({
    totalClasses: 0,
    attended: 0,
    percentage: 0,
  })
  const [showProfileUpload, setShowProfileUpload] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push("/")
          return
        }

        let profile = await getUserProfile(user.uid)

        // If profile fetch fails (offline/timeout), create a fallback profile
        if (!profile) {
          console.log("[v0] Creating fallback profile for offline mode")

          // Determine role from email pattern
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
        }

        if (profile.role !== "student") {
          router.push("/")
          return
        }

        setUserProfile(profile)

        try {
          await loadCourses()
          await loadAttendanceRecords(user.uid)
        } catch (dbError) {
          console.log("[v0] Database operations failed, running in offline mode")
          // Continue with empty data - user can still use basic features
        }
      } catch (error) {
        console.error("[v0] Error loading user data:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const loadCourses = async () => {
    try {
      const coursesQuery = query(collection(db, "courses"))
      const coursesSnapshot = await getDocs(coursesQuery)
      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Course[]
      setCourses(coursesData)
    } catch (error) {
      console.error("[v0] Error loading courses:", error)
    }
  }

  const loadAttendanceRecords = async (studentId: string) => {
    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        orderBy("date", "desc"),
        limit(20),
      )
      const attendanceSnapshot = await getDocs(attendanceQuery)
      const attendanceData = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        markedAt: doc.data().markedAt?.toDate() || new Date(),
      })) as AttendanceRecord[]

      setAttendanceRecords(attendanceData)

      const totalClasses = attendanceData.length
      const attended = attendanceData.filter((record) => record.status === "present").length
      const percentage = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0

      setAttendanceStats({
        totalClasses,
        attended,
        percentage,
      })
    } catch (error) {
      console.error("[v0] Error loading attendance records:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("[v0] Error signing out:", error)
    }
  }

  const handleProfilePictureUpload = async (url: string, filename: string) => {
    try {
      if (!userProfile) return

      const userRef = doc(db, "users", userProfile.uid)
      await updateDoc(userRef, {
        profilePicture: url,
        profilePictureFilename: filename,
        updatedAt: new Date(),
      })

      setUserProfile({
        ...userProfile,
        profilePicture: url,
      })

      setShowProfileUpload(false)
      alert("Profile picture updated successfully!")
    } catch (error) {
      console.error("[v0] Error updating profile picture:", error)
      alert("Failed to update profile picture. Please try again.")
    }
  }

  const processQRCode = async (qrData: string) => {
    try {
      console.log("[v0] Processing QR code:", qrData)

      if (!userProfile) {
        alert("User profile not loaded. Please refresh the page.")
        return
      }

      const parts = qrData.split("-")
      if (parts.length < 2) {
        alert("Invalid QR code format. Please scan a valid attendance QR code.")
        return
      }

      const courseId = parts[0]
      const sessionInfo = parts.slice(1).join("-")

      const course = courses.find((c) => c.id === courseId)
      if (!course) {
        alert("Invalid QR code: Course not found. Please contact your lecturer.")
        return
      }

      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const existingAttendance = attendanceRecords.find(
        (record) => record.courseId === courseId && record.date >= startOfDay && record.date <= endOfDay,
      )

      if (existingAttendance) {
        alert(`Attendance already marked for ${course.name} today!`)
        return
      }

      const attendanceRecord = {
        studentId: userProfile.uid,
        studentName: userProfile.name,
        studentEmail: userProfile.email,
        courseId: courseId,
        courseName: course.name,
        courseCode: course.code,
        date: new Date(),
        status: "present" as const,
        markedAt: new Date(),
        sessionInfo: sessionInfo,
        qrData: qrData,
      }

      console.log("[v0] Creating attendance record:", attendanceRecord)
      await addDoc(collection(db, "attendance"), attendanceRecord)

      await loadAttendanceRecords(userProfile.uid)

      alert(`✅ Attendance marked successfully for ${course.name}!`)
    } catch (error) {
      console.error("[v0] Error processing QR code:", error)
      alert("Failed to mark attendance. Please try again or contact support.")
    }
  }

  const handleScanError = (error: string) => {
    console.error("[v0] QR Scanner error:", error)
    if (error.includes("camera") || error.includes("permission")) {
      return
    }
    alert(`Scanner error: ${error}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Student Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {userProfile.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/")}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <QRScannerComponent onScan={processQRCode} onError={handleScanError} />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{attendanceStats.percentage}%</div>
                    <p className="text-sm text-muted-foreground">
                      {attendanceStats.attended} of {attendanceStats.totalClasses} classes
                    </p>
                  </div>
                  <Progress value={attendanceStats.percentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Present: {attendanceStats.attended}</span>
                    <span className="text-red-600">
                      Absent: {attendanceStats.totalClasses - attendanceStats.attended}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="courses" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="courses">Available Courses</TabsTrigger>
                <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="space-y-4">
                <div className="grid gap-4">
                  {courses.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">No courses available yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Courses will appear here once lecturers create them.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    courses.map((course) => {
                      const courseAttendance = attendanceRecords.filter((record) => record.courseId === course.id)
                      const courseAttended = courseAttendance.filter((record) => record.status === "present").length
                      const courseTotal = courseAttendance.length
                      const coursePercentage = courseTotal > 0 ? Math.round((courseAttended / courseTotal) * 100) : 0

                      return (
                        <Card key={course.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{course.name}</CardTitle>
                                <CardDescription>{course.code}</CardDescription>
                              </div>
                              <Badge variant={coursePercentage >= 80 ? "default" : "destructive"}>
                                {coursePercentage}%
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                Classes attended: {courseAttended}/{courseTotal}
                              </div>
                              <Progress value={coursePercentage} className="w-24 h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                    <CardDescription>Your attendance history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attendanceRecords.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No attendance records yet.</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Start scanning QR codes to mark your attendance.
                          </p>
                        </div>
                      ) : (
                        attendanceRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              {record.status === "present" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <p className="font-medium">{record.courseName}</p>
                                <p className="text-sm text-muted-foreground">{record.courseCode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={record.status === "present" ? "default" : "destructive"}>
                                {record.status}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">{record.date.toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Student Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage
                            src={userProfile?.profilePicture || "/placeholder.svg"}
                            alt={userProfile?.name || "Profile"}
                          />
                          <AvatarFallback className="text-lg">
                            {userProfile?.name?.charAt(0).toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-transparent"
                          onClick={() => setShowProfileUpload(!showProfileUpload)}
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{userProfile?.name}</h3>
                        <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                        <Badge variant={userProfile?.approved ? "default" : "secondary"} className="mt-2">
                          {userProfile?.approved ? "Active Student" : "Pending Approval"}
                        </Badge>
                      </div>
                    </div>

                    {showProfileUpload && (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <h4 className="font-medium mb-3">Update Profile Picture</h4>
                        <FileUpload
                          type="profile"
                          accept="image/*"
                          maxSize={2}
                          onUpload={handleProfilePictureUpload}
                          className="max-w-sm"
                        />
                        <Button variant="ghost" size="sm" onClick={() => setShowProfileUpload(false)} className="mt-2">
                          Cancel
                        </Button>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <p className="text-sm text-muted-foreground">{userProfile.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Student ID</label>
                        <p className="text-sm text-muted-foreground">{userProfile.uid.slice(-8).toUpperCase()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Role</label>
                        <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Account Status</label>
                        <Badge variant={userProfile.approved ? "default" : "secondary"}>
                          {userProfile.approved ? "Active" : "Pending Approval"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Overall Attendance</label>
                        <p className="text-sm text-muted-foreground">{attendanceStats.percentage}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Users, BookOpen, Clock, Home, Plus, Download, Upload, Loader2, LogOut } from "lucide-react"
import { getCurrentUser, getUserProfile, signOut, type UserProfile } from "@/lib/auth"
import { collection, query, where, getDocs, addDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"

interface Course {
  id: string
  name: string
  code: string
  description: string
  lecturerId: string
  createdAt: Date
  materials?: CourseMaterial[]
}

interface CourseMaterial {
  id: string
  courseId: string
  name: string
  url: string
  type: string
  uploadedAt: Date
}

interface AttendanceRecord {
  id: string
  studentId: string
  courseId: string
  courseName: string
  courseCode: string
  date: Date
  status: "present" | "absent"
  markedAt: Date
}

export default function LecturerDashboard() {
  const [activeQR, setActiveQR] = useState<string | null>(null)
  const [sessionDuration, setSessionDuration] = useState(15)
  const [newCourse, setNewCourse] = useState({ name: "", code: "", description: "" })
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [liveAttendance, setLiveAttendance] = useState<AttendanceRecord[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [showMaterialUpload, setShowMaterialUpload] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push("/")
          return
        }

        const profile = await getUserProfile(user.uid)
        if (!profile || profile.role !== "lecturer") {
          router.push("/")
          return
        }

        setUserProfile(profile)
        await loadCourses(user.uid)
      } catch (error) {
        console.error("[v0] Error loading user data:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const loadCourses = async (lecturerId: string) => {
    try {
      const coursesQuery = query(
        collection(db, "courses"),
        where("lecturerId", "==", lecturerId),
        orderBy("createdAt", "desc"),
      )
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

  const loadLiveAttendance = async (courseId: string) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("courseId", "==", courseId),
        where("date", ">=", today),
        orderBy("markedAt", "desc"),
      )
      const attendanceSnapshot = await getDocs(attendanceQuery)
      const attendanceData = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        markedAt: doc.data().markedAt?.toDate() || new Date(),
      })) as AttendanceRecord[]

      setLiveAttendance(attendanceData)
    } catch (error) {
      console.error("[v0] Error loading live attendance:", error)
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

  const generateQR = async (courseCode: string) => {
    const course = courses.find((c) => c.code === courseCode)
    if (!course) return

    const sessionId = `${course.id}-session-${Date.now()}`
    setActiveQR(sessionId)
    setSelectedCourse(course.id)

    // Load live attendance for this course
    await loadLiveAttendance(course.id)

    // Auto-expire QR code after session duration
    setTimeout(
      () => {
        setActiveQR(null)
        setSelectedCourse("")
        setLiveAttendance([])
      },
      sessionDuration * 60 * 1000,
    )
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile) return

    try {
      const courseData = {
        ...newCourse,
        lecturerId: userProfile.uid,
        createdAt: new Date(),
        materials: [],
      }

      await addDoc(collection(db, "courses"), courseData)
      await loadCourses(userProfile.uid)

      alert("Course created successfully!")
      setNewCourse({ name: "", code: "", description: "" })
    } catch (error) {
      console.error("[v0] Error creating course:", error)
      alert("Failed to create course. Please try again.")
    }
  }

  const handleMaterialUpload = async (url: string, filename: string, courseId: string) => {
    try {
      const materialData = {
        courseId,
        name: filename,
        url,
        type: filename.split(".").pop() || "unknown",
        uploadedAt: new Date(),
        uploadedBy: userProfile?.uid,
      }

      await addDoc(collection(db, "course_materials"), materialData)

      alert("Course material uploaded successfully!")
      setShowMaterialUpload(null)
    } catch (error) {
      console.error("[v0] Error uploading material:", error)
      alert("Failed to upload material. Please try again.")
    }
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Lecturer Dashboard</h1>
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
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="qr-generator">QR Generator</TabsTrigger>
            <TabsTrigger value="attendance">Live Attendance</TabsTrigger>
            <TabsTrigger value="create">Create Course</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No courses created yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">Create your first course to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                courses.map((course) => (
                  <Card key={course.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <CardDescription>{course.code}</CardDescription>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => setShowMaterialUpload(showMaterialUpload === course.id ? null : course.id)}
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            Materials
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => generateQR(course.code)}>
                            <QrCode className="mr-1 h-3 w-3" />
                            QR
                          </Button>
                        </div>

                        {showMaterialUpload === course.id && (
                          <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                            <h4 className="font-medium mb-3 text-sm">Upload Course Material</h4>
                            <FileUpload
                              type="course-material"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                              maxSize={10}
                              onUpload={(url, filename) => handleMaterialUpload(url, filename, course.id)}
                              className="max-w-full"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="qr-generator" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Generate QR Code</CardTitle>
                  <CardDescription>Create a time-limited QR code for attendance marking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-select">Select Course</Label>
                    <select
                      id="course-select"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.code}>
                          {course.name} ({course.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Session Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Number(e.target.value))}
                      min="5"
                      max="180"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const course = courses.find((c) => c.code === selectedCourse)
                      if (course) generateQR(course.code)
                    }}
                    className="w-full"
                    disabled={!!activeQR || !selectedCourse}
                  >
                    {activeQR ? "Session Active" : "Generate QR Code"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active QR Code</CardTitle>
                  <CardDescription>Students can scan this code to mark attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    {activeQR ? (
                      <div className="text-center">
                        <QrCode className="h-32 w-32 mx-auto mb-4 text-primary" />
                        <p className="text-sm font-medium">Session: {activeQR.split("-")[1]}</p>
                        <p className="text-xs text-muted-foreground">Expires in {sessionDuration} minutes</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <QrCode className="h-32 w-32 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Generate a QR code to start attendance session</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Attendance Tracking</CardTitle>
                    <CardDescription>Real-time attendance for active sessions</CardDescription>
                  </div>
                  {activeQR && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeQR && selectedCourse ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {courses.find((c) => c.id === selectedCourse)?.name} - Current Session
                      </h3>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{liveAttendance.length} present</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {liveAttendance.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No students have marked attendance yet.</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Students will appear here as they scan the QR code.
                          </p>
                        </div>
                      ) : (
                        liveAttendance.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium">Student {record.studentId.slice(-8)}</p>
                              <p className="text-sm text-muted-foreground">{record.studentId}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="default">Present</Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {record.markedAt.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Button variant="outline" className="w-full bg-transparent">
                      <Download className="mr-2 h-4 w-4" />
                      Export Attendance
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No active attendance session</p>
                    <p className="text-sm text-muted-foreground">Generate a QR code to start tracking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Course
                </CardTitle>
                <CardDescription>Add a new course to your teaching portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-name">Course Name</Label>
                    <Input
                      id="course-name"
                      placeholder="e.g., Introduction to Programming"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-code">Course Code</Label>
                    <Input
                      id="course-code"
                      placeholder="e.g., CS101"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse((prev) => ({ ...prev, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-description">Description</Label>
                    <textarea
                      id="course-description"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Brief description of the course"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

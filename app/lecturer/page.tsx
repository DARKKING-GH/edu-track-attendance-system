"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Users, BookOpen, Clock, Home, Plus, Eye, Download } from "lucide-react"

export default function LecturerDashboard() {
  const [activeQR, setActiveQR] = useState<string | null>(null)
  const [sessionDuration, setSessionDuration] = useState(15)
  const [newCourse, setNewCourse] = useState({ name: "", code: "", description: "" })

  const [courses] = useState([
    {
      id: 1,
      name: "Computer Science 101",
      code: "CS101",
      students: 45,
      sessions: 12,
      avgAttendance: 85,
    },
    {
      id: 2,
      name: "Data Structures",
      code: "CS201",
      students: 38,
      sessions: 10,
      avgAttendance: 78,
    },
    {
      id: 3,
      name: "Algorithms",
      code: "CS301",
      students: 32,
      sessions: 8,
      avgAttendance: 92,
    },
  ])

  const [liveAttendance] = useState([
    { studentId: "STU001", name: "John Doe", time: "2:01 PM", status: "present" },
    { studentId: "STU002", name: "Jane Smith", time: "2:02 PM", status: "present" },
    { studentId: "STU003", name: "Mike Johnson", time: "2:03 PM", status: "present" },
  ])

  const generateQR = (courseCode: string) => {
    const sessionId = `${courseCode}-${Date.now()}`
    setActiveQR(sessionId)

    // Auto-expire QR code after session duration
    setTimeout(
      () => {
        setActiveQR(null)
      },
      sessionDuration * 60 * 1000,
    )
  }

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Creating course:", newCourse)
    alert("Course created successfully!")
    setNewCourse({ name: "", code: "", description: "" })
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
                <p className="text-sm text-muted-foreground">Welcome back, Dr. Smith</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
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
              {courses.map((course) => (
                <Card key={course.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        <CardDescription>{course.code}</CardDescription>
                      </div>
                      <Badge variant={course.avgAttendance >= 80 ? "default" : "secondary"}>
                        {course.avgAttendance}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Students:</span>
                        <span className="font-medium">{course.students}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sessions:</span>
                        <span className="font-medium">{course.sessions}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => generateQR(course.code)}>
                          <QrCode className="mr-1 h-3 w-3" />
                          QR
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                    >
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
                  <Button onClick={() => generateQR("CS101")} className="w-full" disabled={!!activeQR}>
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
                        <p className="text-sm font-medium">Session: {activeQR}</p>
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
                  <Badge variant="outline" className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {activeQR ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">CS101 - Current Session</h3>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{liveAttendance.length} present</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {liveAttendance.map((student, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.studentId}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">Present</Badge>
                            <p className="text-sm text-muted-foreground mt-1">{student.time}</p>
                          </div>
                        </div>
                      ))}
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

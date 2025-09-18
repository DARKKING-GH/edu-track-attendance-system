"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Camera, Calendar, CheckCircle, XCircle, Home, User, BarChart3 } from "lucide-react"

export default function StudentDashboard() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [attendanceData] = useState({
    totalClasses: 45,
    attended: 38,
    percentage: 84,
  })

  const [courses] = useState([
    { id: 1, name: "Computer Science 101", code: "CS101", attendance: 90, nextClass: "Today 2:00 PM" },
    { id: 2, name: "Mathematics", code: "MATH201", attendance: 78, nextClass: "Tomorrow 10:00 AM" },
    { id: 3, name: "Physics", code: "PHY101", attendance: 85, nextClass: "Wed 1:00 PM" },
  ])

  const [recentAttendance] = useState([
    { date: "2024-01-15", course: "CS101", status: "present", time: "2:00 PM" },
    { date: "2024-01-14", course: "MATH201", status: "present", time: "10:00 AM" },
    { date: "2024-01-13", course: "PHY101", status: "absent", time: "1:00 PM" },
    { date: "2024-01-12", course: "CS101", status: "present", time: "2:00 PM" },
  ])

  const startScanning = () => {
    setIsScanning(true)
    // Mock QR scanning - in real app would use camera
    setTimeout(() => {
      setScanResult("CS101-20240115-1400")
      setIsScanning(false)
      // Mock attendance marking
      setTimeout(() => {
        alert("Attendance marked successfully for CS101!")
        setScanResult(null)
      }, 1000)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Student Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, John Doe</p>
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - QR Scanner */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>Scan QR codes to mark your attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  {isScanning ? (
                    <div className="text-center">
                      <div className="animate-pulse">
                        <QrCode className="h-16 w-16 mx-auto mb-2 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">Scanning...</p>
                    </div>
                  ) : scanResult ? (
                    <div className="text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-2 text-green-500" />
                      <p className="text-sm font-medium">QR Code Detected</p>
                      <p className="text-xs text-muted-foreground">{scanResult}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Ready to scan</p>
                    </div>
                  )}
                </div>
                <Button onClick={startScanning} disabled={isScanning} className="w-full">
                  {isScanning ? "Scanning..." : "Start Scanning"}
                </Button>
              </CardContent>
            </Card>

            {/* Attendance Overview */}
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
                    <div className="text-3xl font-bold text-primary">{attendanceData.percentage}%</div>
                    <p className="text-sm text-muted-foreground">
                      {attendanceData.attended} of {attendanceData.totalClasses} classes
                    </p>
                  </div>
                  <Progress value={attendanceData.percentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Present: {attendanceData.attended}</span>
                    <span className="text-red-600">
                      Absent: {attendanceData.totalClasses - attendanceData.attended}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="courses" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="courses">My Courses</TabsTrigger>
                <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="space-y-4">
                <div className="grid gap-4">
                  {courses.map((course) => (
                    <Card key={course.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{course.name}</CardTitle>
                            <CardDescription>{course.code}</CardDescription>
                          </div>
                          <Badge variant={course.attendance >= 80 ? "default" : "destructive"}>
                            {course.attendance}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Next class: {course.nextClass}
                          </div>
                          <Progress value={course.attendance} className="w-24 h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                    <CardDescription>Your attendance history for the past week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentAttendance.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {record.status === "present" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{record.course}</p>
                              <p className="text-sm text-muted-foreground">{record.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={record.status === "present" ? "default" : "destructive"}>
                              {record.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">{record.time}</p>
                          </div>
                        </div>
                      ))}
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
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <p className="text-sm text-muted-foreground">John Doe</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Student ID</label>
                        <p className="text-sm text-muted-foreground">STU2024001</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-sm text-muted-foreground">john.doe@student.edu</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Department</label>
                        <p className="text-sm text-muted-foreground">Computer Science</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Year</label>
                        <p className="text-sm text-muted-foreground">2nd Year</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Overall Attendance</label>
                        <p className="text-sm text-muted-foreground">{attendanceData.percentage}%</p>
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

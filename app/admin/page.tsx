"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, BookOpen, BarChart3, UserCheck, UserX, Home, Search, Download, Plus } from "lucide-react"

export default function AdminDashboard() {
  const [pendingApprovals] = useState([
    { id: 1, name: "Dr. Johnson", email: "johnson@edu.com", role: "lecturer", department: "Mathematics" },
    { id: 2, name: "Prof. Williams", email: "williams@edu.com", role: "lecturer", department: "Physics" },
  ])

  const [systemStats] = useState({
    totalUsers: 1247,
    totalCourses: 89,
    totalSessions: 2156,
    avgAttendance: 82,
  })

  const [users] = useState([
    { id: 1, name: "John Doe", email: "john@student.edu", role: "student", status: "active", lastLogin: "2024-01-15" },
    { id: 2, name: "Dr. Smith", email: "smith@edu.com", role: "lecturer", status: "active", lastLogin: "2024-01-15" },
    {
      id: 3,
      name: "Jane Wilson",
      email: "jane@student.edu",
      role: "student",
      status: "inactive",
      lastLogin: "2024-01-10",
    },
  ])

  const [courses] = useState([
    { id: 1, name: "Computer Science 101", code: "CS101", lecturer: "Dr. Smith", students: 45, sessions: 12 },
    { id: 2, name: "Mathematics", code: "MATH201", lecturer: "Dr. Johnson", students: 38, sessions: 10 },
    { id: 3, name: "Physics", code: "PHY101", lecturer: "Prof. Williams", students: 32, sessions: 8 },
  ])

  const handleApproval = (userId: number, approved: boolean) => {
    console.log("[v0] User approval:", { userId, approved })
    alert(`User ${approved ? "approved" : "rejected"} successfully!`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">System Administration Panel</p>
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
        {/* System Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">+3 new this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">+45 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.avgAttendance}%</div>
              <p className="text-xs text-muted-foreground">+2% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="courses">Course Management</TabsTrigger>
            <TabsTrigger value="reports">System Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Lecturer Approvals</CardTitle>
                <CardDescription>Review and approve new lecturer registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length > 0 ? (
                  <div className="space-y-4">
                    {pendingApprovals.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-sm text-muted-foreground">Department: {user.department}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproval(user.id, true)}>
                            <UserCheck className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleApproval(user.id, false)}>
                            <UserX className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending approvals</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all system users</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users..." className="pl-8 w-64" />
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Last login: {user.lastLogin}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Management</CardTitle>
                    <CardDescription>Oversee all courses in the system</CardDescription>
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Course
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {course.code} • {course.lecturer}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {course.students} students • {course.sessions} sessions
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Reports</CardTitle>
                  <CardDescription>Generate comprehensive attendance reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option>Overall Attendance</option>
                      <option>Course-wise Attendance</option>
                      <option>Student Performance</option>
                      <option>Lecturer Statistics</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Input type="date" />
                      <Input type="date" />
                    </div>
                  </div>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Analytics</CardTitle>
                  <CardDescription>View system usage and performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Daily Active Users</span>
                      <span className="text-sm font-medium">847</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">QR Scans Today</span>
                      <span className="text-sm font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">System Uptime</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Storage Used</span>
                      <span className="text-sm font-medium">2.4 GB</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Detailed Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

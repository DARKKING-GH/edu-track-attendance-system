"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Users,
  BookOpen,
  BarChart3,
  UserCheck,
  UserX,
  Home,
  Search,
  Download,
  Loader2,
  LogOut,
} from "lucide-react"
import { getCurrentUser, getUserProfile, signOut, type UserProfile } from "@/lib/auth"
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface PendingUser {
  id: string
  name: string
  email: string
  role: string
  department?: string
  createdAt: Date
}

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin: string
  approved: boolean
}

interface CourseData {
  id: string
  name: string
  code: string
  lecturer: string
  students: number
  sessions: number
  createdAt: Date
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<PendingUser[]>([])
  const [systemStats] = useState({
    totalUsers: 1247,
    totalCourses: 89,
    totalSessions: 2156,
    avgAttendance: 82,
  })
  const [users, setUsers] = useState<SystemUser[]>([])
  const [courses, setCourses] = useState<CourseData[]>([])
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
        if (!profile || profile.role !== "admin") {
          router.push("/")
          return
        }

        setUserProfile(profile)
        await loadPendingApprovals()
        await loadSystemUsers()
        await loadCourses()
      } catch (error) {
        console.error("[v0] Error loading admin data:", error)
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const loadPendingApprovals = async () => {
    try {
      const pendingQuery = query(
        collection(db, "users"),
        where("role", "==", "lecturer"),
        where("approved", "==", false),
        orderBy("createdAt", "desc"),
      )
      const pendingSnapshot = await getDocs(pendingQuery)
      const pendingData = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as PendingUser[]
      setPendingApprovals(pendingData)
    } catch (error) {
      console.error("[v0] Error loading pending approvals:", error)
    }
  }

  const loadSystemUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
      const usersSnapshot = await getDocs(usersQuery)
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        role: doc.data().role,
        status: doc.data().approved ? "active" : "pending",
        lastLogin: doc.data().lastLogin || "Never",
        approved: doc.data().approved,
      })) as SystemUser[]
      setUsers(usersData)
    } catch (error) {
      console.error("[v0] Error loading system users:", error)
    }
  }

  const loadCourses = async () => {
    try {
      const coursesQuery = query(collection(db, "courses"), orderBy("createdAt", "desc"))
      const coursesSnapshot = await getDocs(coursesQuery)
      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        code: doc.data().code,
        lecturer: doc.data().lecturerName || "Unknown",
        students: doc.data().enrollmentCount || 0,
        sessions: doc.data().sessionCount || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as CourseData[]
      setCourses(coursesData)
    } catch (error) {
      console.error("[v0] Error loading courses:", error)
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

  const handleApproval = async (userId: string, approved: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        approved: approved,
        approvedAt: new Date(),
      })

      // Refresh data
      await loadPendingApprovals()
      await loadSystemUsers()

      alert(`User ${approved ? "approved" : "rejected"} successfully!`)
    } catch (error) {
      console.error("[v0] Error updating user approval:", error)
      alert("Failed to update user approval. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
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
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
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
        {/* System Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Active system users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
              <p className="text-xs text-muted-foreground">Active courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-muted-foreground">Uptime</p>
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
                          <p className="text-sm text-muted-foreground">
                            Applied: {user.createdAt.toLocaleDateString()}
                          </p>
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
                      <span className="text-sm font-medium">{users.filter((u) => u.status === "active").length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Courses</span>
                      <span className="text-sm font-medium">{courses.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">System Uptime</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending Approvals</span>
                      <span className="text-sm font-medium">{pendingApprovals.length}</span>
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

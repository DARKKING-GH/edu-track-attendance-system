import { Chart } from "@/components/ui/chart"
// Admin dashboard functionality
let usersTable = null
const bootstrap = window.bootstrap
const $ = window.jQuery // Declare the $ variable

function initializeAdminDashboard() {
  console.log("Admin dashboard initialized")

  // Set up event listeners
  setupEventListeners()

  // Load initial data
  loadDashboardData()
}

function setupEventListeners() {
  // User creation
  document.getElementById("createUserBtn").addEventListener("click", createUser)

  // Refresh buttons
  document.getElementById("refreshUserTable")?.addEventListener("click", refreshUserTable)
  document.getElementById("refreshCourseTable")?.addEventListener("click", refreshCourseTable)
}

function initializeDataTables() {
  // Initialize users table with DataTables
  usersTable = $("#usersTable").DataTable({
    ajax: {
      url: "/api/admin/users",
      dataSrc: "users",
    },
    columns: [
      {
        data: "name",
        render: (data, type, row) => `
                        <strong>${data}</strong>
                        <br>
                        <small class="text-muted">${row.uid}</small>
                    `,
      },
      { data: "email" },
      {
        data: "role",
        render: (data) => {
          const colors = {
            admin: "danger",
            lecturer: "warning",
            student: "info",
          }
          return `<span class="badge bg-${colors[data] || "secondary"}">${data.charAt(0).toUpperCase() + data.slice(1)}</span>`
        },
      },
      {
        data: "approved",
        render: (data, type, row) => {
          if (row.role === "student") {
            return '<span class="badge bg-success">Active</span>'
          }
          return data
            ? '<span class="badge bg-success">Approved</span>'
            : '<span class="badge bg-warning">Pending</span>'
        },
      },
      {
        data: "created_at",
        render: (data) => (data ? new Date(data).toLocaleDateString() : "N/A"),
      },
      {
        data: "last_login",
        render: (data) => (data ? new Date(data).toLocaleDateString() : "Never"),
      },
      {
        data: null,
        orderable: false,
        render: (data, type, row) => `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewUserDetails('${row.uid}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="editUser('${row.uid}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteUser('${row.uid}', '${row.name}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `,
      },
    ],
    responsive: true,
    pageLength: 25,
    order: [[4, "desc"]], // Sort by created date
  })
}

function initializeCharts() {
  // System activity chart
  initializeActivityChart()

  // Attendance analytics chart
  initializeAttendanceAnalyticsChart()

  // User distribution chart
  initializeUserDistributionChart()
}

function initializeActivityChart() {
  const ctx = document.getElementById("activityChart")
  if (!ctx) return

  // Sample data - in real app, this would come from the backend
  const activityData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Logins",
        data: [45, 52, 38, 65, 59, 23, 18],
        borderColor: "rgb(13, 110, 253)",
        backgroundColor: "rgba(13, 110, 253, 0.1)",
        tension: 0.4,
      },
      {
        label: "Attendance Scans",
        data: [28, 35, 42, 48, 41, 15, 8],
        borderColor: "rgb(25, 135, 84)",
        backgroundColor: "rgba(25, 135, 84, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  }

  new Chart(ctx, {
    type: "line",
    data: activityData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  })
}

function initializeAttendanceAnalyticsChart() {
  const ctx = document.getElementById("attendanceAnalyticsChart")
  if (!ctx) return

  // Sample data
  const attendanceData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
    datasets: [
      {
        label: "Average Attendance Rate (%)",
        data: [85, 88, 82, 91, 87, 89],
        borderColor: "rgb(13, 110, 253)",
        backgroundColor: "rgba(13, 110, 253, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  }

  new Chart(ctx, {
    type: "line",
    data: attendanceData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + "%",
          },
        },
      },
    },
  })
}

function initializeUserDistributionChart() {
  const ctx = document.getElementById("userDistributionChart")
  if (!ctx) return

  // Get data from template variables
  const totalStudents = Number.parseInt(document.querySelector("[data-students]")?.dataset.students || "0")
  const totalLecturers = Number.parseInt(document.querySelector("[data-lecturers]")?.dataset.lecturers || "0")
  const totalAdmins = 1 // Assuming at least 1 admin

  const userDistributionData = {
    labels: ["Students", "Lecturers", "Admins"],
    datasets: [
      {
        data: [totalStudents, totalLecturers, totalAdmins],
        backgroundColor: ["#0dcaf0", "#ffc107", "#dc3545"],
        borderWidth: 0,
      },
    ],
  }

  new Chart(ctx, {
    type: "doughnut",
    data: userDistributionData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  })
}

async function approveUser(userId, userName) {
  if (!confirm(`Approve ${userName} as a lecturer?`)) return

  try {
    const response = await fetch(`/api/admin/approve-user/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()

    if (result.success) {
      showAlert(`${userName} has been approved successfully!`, "success")
      setTimeout(() => window.location.reload(), 1500)
    } else {
      showAlert(result.message || "Failed to approve user", "danger")
    }
  } catch (error) {
    console.error("Error approving user:", error)
    showAlert("Failed to approve user", "danger")
  }
}

async function rejectUser(userId, userName) {
  if (!confirm(`Reject ${userName}'s application? This will delete their account.`)) return

  try {
    const response = await fetch(`/api/admin/reject-user/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()

    if (result.success) {
      showAlert(`${userName}'s application has been rejected`, "info")
      setTimeout(() => window.location.reload(), 1500)
    } else {
      showAlert(result.message || "Failed to reject user", "danger")
    }
  } catch (error) {
    console.error("Error rejecting user:", error)
    showAlert("Failed to reject user", "danger")
  }
}

async function createUser() {
  const name = document.getElementById("userName").value
  const email = document.getElementById("userEmail").value
  const role = document.getElementById("userRole").value
  const password = document.getElementById("userPassword").value
  const createBtn = document.getElementById("createUserBtn")

  if (!name || !email || !role || !password) {
    showAlert("Please fill in all required fields", "warning")
    return
  }

  // Show loading state
  createBtn.disabled = true
  createBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...'

  try {
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        email: email,
        role: role,
        password: password,
      }),
    })

    const result = await response.json()

    if (result.success) {
      showAlert("User created successfully!", "success")
      // Close modal and refresh
      const modal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
      modal.hide()
      document.getElementById("createUserForm").reset()
      refreshUserTable()
    } else {
      showAlert(result.message || "Failed to create user", "danger")
    }
  } catch (error) {
    console.error("Error creating user:", error)
    showAlert("Failed to create user", "danger")
  } finally {
    // Reset button
    createBtn.disabled = false
    createBtn.innerHTML = '<i class="fas fa-save me-2"></i>Create User'
  }
}

async function viewUserDetails(userId) {
  try {
    const response = await fetch(`/api/admin/user-details/${userId}`)
    const result = await response.json()

    if (result.success) {
      const user = result.user
      const content = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="fw-bold">Basic Information</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Name:</strong></td><td>${user.name}</td></tr>
                            <tr><td><strong>Email:</strong></td><td>${user.email}</td></tr>
                            <tr><td><strong>Role:</strong></td><td><span class="badge bg-primary">${user.role}</span></td></tr>
                            <tr><td><strong>Status:</strong></td><td>${user.approved ? '<span class="badge bg-success">Approved</span>' : '<span class="badge bg-warning">Pending</span>'}</td></tr>
                            <tr><td><strong>Joined:</strong></td><td>${new Date(user.created_at).toLocaleDateString()}</td></tr>
                            <tr><td><strong>Last Login:</strong></td><td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold">Activity Summary</h6>
                        <div id="userActivityStats">
                            <!-- Activity stats will be loaded here -->
                        </div>
                    </div>
                </div>
            `

      document.getElementById("userDetailsContent").innerHTML = content
      const modal = new bootstrap.Modal(document.getElementById("userDetailsModal"))
      modal.show()
    } else {
      showAlert("Failed to load user details", "danger")
    }
  } catch (error) {
    console.error("Error loading user details:", error)
    showAlert("Failed to load user details", "danger")
  }
}

async function deleteUser(userId, userName) {
  if (!confirm(`Delete user ${userName}? This action cannot be undone.`)) return

  try {
    const response = await fetch(`/api/admin/delete-user/${userId}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      showAlert(`${userName} has been deleted`, "info")
      refreshUserTable()
    } else {
      showAlert(result.message || "Failed to delete user", "danger")
    }
  } catch (error) {
    console.error("Error deleting user:", error)
    showAlert("Failed to delete user", "danger")
  }
}

function viewCourseDetails(courseId) {
  // Load course details modal
  console.log("View course details:", courseId)
}

function viewCourseReports(courseId) {
  // Load course reports
  console.log("View course reports:", courseId)
}

async function deleteCourse(courseId, courseName) {
  if (!confirm(`Delete course "${courseName}"? This will also delete all related attendance records.`)) return

  try {
    const response = await fetch(`/api/admin/delete-course/${courseId}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (result.success) {
      showAlert(`Course "${courseName}" has been deleted`, "info")
      setTimeout(() => window.location.reload(), 1500)
    } else {
      showAlert(result.message || "Failed to delete course", "danger")
    }
  } catch (error) {
    console.error("Error deleting course:", error)
    showAlert("Failed to delete course", "danger")
  }
}

function refreshUserTable() {
  if (usersTable) {
    usersTable.ajax.reload()
  }
}

function refreshCourseTable() {
  window.location.reload()
}

function refreshDashboard() {
  window.location.reload()
}

function loadDashboardData() {
  // Load additional dashboard data
  console.log("Loading dashboard data")
}

function exportSystemReport() {
  // Export system report
  window.open("/api/admin/export-report", "_blank")
}

// Utility function to show alerts
function showAlert(message, type = "info") {
  const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <i class="fas fa-${type === "success" ? "check" : type === "warning" ? "exclamation-triangle" : "info"}-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `

  document.body.insertAdjacentHTML("beforeend", alertHtml)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    const alerts = document.querySelectorAll(".alert")
    alerts.forEach((alert) => {
      if (alert.textContent.includes(message)) {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert)
        bsAlert.close()
      }
    })
  }, 5000)
}

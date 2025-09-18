// Lecturer dashboard functionality
let currentSession = null
let liveAttendanceInterval = null
const bootstrap = window.bootstrap // Declare the bootstrap variable

function initializeLecturerDashboard() {
  console.log("Lecturer dashboard initialized")

  // Set up event listeners
  setupEventListeners()

  // Update stats
  updateDashboardStats()

  // Load recent activity
  loadRecentActivity()
}

function setupEventListeners() {
  // QR Generation
  document.getElementById("generateQrBtn").addEventListener("click", generateQRCode)

  // Course creation
  document.getElementById("createCourseBtn").addEventListener("click", createCourse)

  // Student enrollment
  document.getElementById("enrollStudentBtn").addEventListener("click", enrollStudent)
}

async function generateQRCode() {
  const courseSelect = document.getElementById("courseSelect")
  const durationSelect = document.getElementById("sessionDuration")
  const generateBtn = document.getElementById("generateQrBtn")

  const courseId = courseSelect.value
  const duration = Number.parseInt(durationSelect.value)

  if (!courseId) {
    showAlert("Please select a course", "warning")
    return
  }

  // Show loading state
  generateBtn.disabled = true
  generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...'

  try {
    const response = await fetch("/api/generate-qr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_id: courseId,
        duration: duration,
      }),
    })

    const result = await response.json()

    if (result.success) {
      displayQRCode(result, courseSelect.options[courseSelect.selectedIndex].text)
      startLiveAttendanceTracking(result.session_id)
      showAlert("QR Code generated successfully!", "success")
    } else {
      showAlert(result.message || "Failed to generate QR code", "danger")
    }
  } catch (error) {
    console.error("Error generating QR code:", error)
    showAlert("Failed to generate QR code", "danger")
  } finally {
    // Reset button
    generateBtn.disabled = false
    generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate QR Code'
  }
}

function displayQRCode(qrData, courseName) {
  const container = document.getElementById("qrCodeContainer")
  const qrImage = document.getElementById("qrCodeImage")
  const sessionInfo = document.getElementById("sessionInfo")

  // Display QR code image
  qrImage.innerHTML = `<img src="${qrData.qr_code}" alt="Attendance QR Code" class="img-fluid" style="max-width: 250px;">`

  // Display session info
  const expiresAt = new Date(qrData.expires_at)
  sessionInfo.innerHTML = `
        <strong>Course:</strong> ${courseName}<br>
        <strong>Session ID:</strong> ${qrData.session_id}<br>
        <strong>Expires:</strong> ${expiresAt.toLocaleString()}
    `

  // Store current session data
  currentSession = {
    ...qrData,
    courseName: courseName,
  }

  // Show container
  container.style.display = "block"

  // Update active sessions count
  document.getElementById("activeSessions").textContent = "1"
}

function startLiveAttendanceTracking(sessionId) {
  // Clear any existing interval
  if (liveAttendanceInterval) {
    clearInterval(liveAttendanceInterval)
  }

  // Update live attendance every 5 seconds
  liveAttendanceInterval = setInterval(() => {
    updateLiveAttendance(sessionId)
  }, 5000)

  // Initial update
  updateLiveAttendance(sessionId)
}

async function updateLiveAttendance(sessionId) {
  try {
    const response = await fetch(`/api/live-attendance/${sessionId}`)
    const data = await response.json()

    if (data.success) {
      displayLiveAttendance(data.attendance)
      document.getElementById("liveCount").textContent = `${data.attendance.length} students`
    }
  } catch (error) {
    console.error("Error updating live attendance:", error)
  }
}

function displayLiveAttendance(attendanceList) {
  const container = document.getElementById("liveAttendanceContainer")

  if (attendanceList.length === 0) {
    container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <p class="text-muted">Waiting for students to scan...</p>
            </div>
        `
    return
  }

  const attendanceHtml = attendanceList
    .map(
      (record) => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <strong>${record.student_name}</strong>
                <br>
                <small class="text-muted">${new Date(record.timestamp).toLocaleTimeString()}</small>
            </div>
            <span class="badge bg-success">
                <i class="fas fa-check me-1"></i>
                Present
            </span>
        </div>
    `,
    )
    .join("")

  container.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold">Students Present:</h6>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${attendanceHtml}
        </div>
    `
}

function stopSession() {
  if (currentSession) {
    // Clear live tracking
    if (liveAttendanceInterval) {
      clearInterval(liveAttendanceInterval)
      liveAttendanceInterval = null
    }

    // Hide QR container
    document.getElementById("qrCodeContainer").style.display = "none"

    // Reset live attendance
    document.getElementById("liveAttendanceContainer").innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                <p class="text-muted">Generate a QR code to start tracking attendance</p>
            </div>
        `

    // Update stats
    document.getElementById("activeSessions").textContent = "0"
    document.getElementById("liveCount").textContent = "0 students"

    currentSession = null
    showAlert("Session stopped successfully", "info")
  }
}

async function createCourse() {
  const name = document.getElementById("courseName").value
  const code = document.getElementById("courseCode").value
  const description = document.getElementById("courseDescription").value
  const createBtn = document.getElementById("createCourseBtn")

  if (!name || !code) {
    showAlert("Please fill in all required fields", "warning")
    return
  }

  // Show loading state
  createBtn.disabled = true
  createBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...'

  try {
    const response = await fetch("/api/create-course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name,
        code: code,
        description: description,
      }),
    })

    const result = await response.json()

    if (result.success) {
      showAlert("Course created successfully!", "success")
      // Close modal and refresh page
      const modal = bootstrap.Modal.getInstance(document.getElementById("createCourseModal"))
      modal.hide()
      setTimeout(() => window.location.reload(), 1500)
    } else {
      showAlert(result.message || "Failed to create course", "danger")
    }
  } catch (error) {
    console.error("Error creating course:", error)
    showAlert("Failed to create course", "danger")
  } finally {
    // Reset button
    createBtn.disabled = false
    createBtn.innerHTML = '<i class="fas fa-save me-2"></i>Create Course'
  }
}

async function enrollStudent() {
  const email = document.getElementById("studentEmail").value
  const enrollBtn = document.getElementById("enrollStudentBtn")

  if (!email) {
    showAlert("Please enter student email", "warning")
    return
  }

  // Get selected course ID (you'll need to implement course selection in the modal)
  const courseId = getCurrentCourseId() // Implement this function

  if (!courseId) {
    showAlert("Please select a course", "warning")
    return
  }

  // Show loading state
  enrollBtn.disabled = true
  enrollBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'

  try {
    const response = await fetch("/api/enroll-student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_id: courseId,
        student_email: email,
      }),
    })

    const result = await response.json()

    if (result.success) {
      showAlert("Student enrolled successfully!", "success")
      document.getElementById("studentEmail").value = ""
      // Refresh enrolled students list
      loadEnrolledStudents(courseId)
    } else {
      showAlert(result.message || "Failed to enroll student", "danger")
    }
  } catch (error) {
    console.error("Error enrolling student:", error)
    showAlert("Failed to enroll student", "danger")
  } finally {
    // Reset button
    enrollBtn.disabled = false
    enrollBtn.innerHTML = '<i class="fas fa-user-plus"></i>'
  }
}

function quickGenerateQR(courseId, courseName) {
  // Set course selection and generate QR with default duration
  document.getElementById("courseSelect").value = courseId
  document.getElementById("sessionDuration").value = "30"
  generateQRCode()
}

function viewCourseDetails(courseId) {
  // Implement course details view
  console.log("View course details:", courseId)
}

function manageCourse(courseId) {
  // Open course management modal
  const modal = new bootstrap.Modal(document.getElementById("manageCourseModal"))
  modal.show()
  loadCourseManagementData(courseId)
}

function viewReports(courseId) {
  // Implement reports view
  console.log("View reports for course:", courseId)
}

async function loadCourseManagementData(courseId) {
  // Load course statistics and enrolled students
  // This would typically fetch data from the backend
  console.log("Loading course management data for:", courseId)
}

async function loadEnrolledStudents(courseId) {
  // Load and display enrolled students
  console.log("Loading enrolled students for:", courseId)
}

function getCurrentCourseId() {
  // Get the currently selected course ID for management
  // This should be set when opening the management modal
  return null // Implement this
}

function updateDashboardStats() {
  // Update various dashboard statistics
  // This would typically fetch real-time data from the backend
  console.log("Updating dashboard stats")
}

function loadRecentActivity() {
  // Load and display recent activity
  const container = document.getElementById("recentActivity")
  // This would typically fetch data from the backend
  container.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-clock fa-3x text-muted mb-3"></i>
            <p class="text-muted">No recent activity</p>
        </div>
    `
}

function refreshDashboard() {
  window.location.reload()
}

function downloadQR() {
  if (currentSession && currentSession.qr_code) {
    const link = document.createElement("a")
    link.download = `attendance-qr-${currentSession.session_id}.png`
    link.href = currentSession.qr_code
    link.click()
  }
}

function printQR() {
  if (currentSession) {
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
            <html>
                <head>
                    <title>Attendance QR Code</title>
                    <style>
                        body { text-align: center; font-family: Arial, sans-serif; }
                        .qr-container { margin: 50px auto; }
                        .course-info { margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        <h2>Attendance QR Code</h2>
                        <div class="course-info">
                            <h3>${currentSession.courseName}</h3>
                            <p>Session ID: ${currentSession.session_id}</p>
                            <p>Expires: ${new Date(currentSession.expires_at).toLocaleString()}</p>
                        </div>
                        <img src="${currentSession.qr_code}" alt="QR Code" style="max-width: 300px;">
                        <p style="margin-top: 20px; font-size: 12px;">
                            Students should scan this QR code to mark their attendance
                        </p>
                    </div>
                </body>
            </html>
        `)
    printWindow.document.close()
    printWindow.print()
  }
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

import { Chart } from "@/components/ui/chart"
// Student dashboard functionality and charts

function initializeStudentDashboard() {
  // Initialize any dashboard-specific functionality
  console.log("Student dashboard initialized")

  // Set up export functionality
  setupExportFunctionality()

  // Update attendance rate periodically
  updateAttendanceStats()
}

function initializeCharts() {
  // Initialize attendance trend chart
  initializeAttendanceChart()

  // Initialize course distribution chart
  initializeCourseChart()
}

function initializeAttendanceChart() {
  const ctx = document.getElementById("attendanceChart")
  if (!ctx) return

  // Sample data - in real app, this would come from the backend
  const attendanceData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
    datasets: [
      {
        label: "Attendance Rate (%)",
        data: [85, 92, 78, 96, 89, 94],
        borderColor: "rgb(13, 110, 253)",
        backgroundColor: "rgba(13, 110, 253, 0.1)",
        tension: 0.4,
        fill: true,
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

function initializeCourseChart() {
  const ctx = document.getElementById("courseChart")
  if (!ctx) return

  // Sample data - in real app, this would come from the backend
  const courseData = {
    labels: ["Mathematics", "Physics", "Chemistry", "Biology"],
    datasets: [
      {
        data: [25, 30, 20, 25],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
        borderWidth: 0,
      },
    ],
  }

  new Chart(ctx, {
    type: "doughnut",
    data: courseData,
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

function setupExportFunctionality() {
  // This would typically export attendance data as CSV or PDF
  window.exportAttendance = () => {
    // Sample implementation
    const attendanceData = [
      ["Course", "Date", "Time", "Status"],
      ["Mathematics", "2024-01-15", "09:00", "Present"],
      ["Physics", "2024-01-14", "11:00", "Present"],
      // Add more data as needed
    ]

    const csvContent = attendanceData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "attendance_report.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
}

function updateAttendanceStats() {
  // Update attendance statistics
  // This would typically fetch real-time data from the backend
  const attendanceRate = document.getElementById("attendanceRate")
  if (attendanceRate) {
    // Sample calculation - replace with real data
    const rate = Math.floor(Math.random() * 20) + 80 // Random rate between 80-100%
    attendanceRate.textContent = rate + "%"
  }
}

// Utility functions
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        <i class="fas fa-${type === "success" ? "check" : "info"}-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      const bsAlert = window.bootstrap.Alert.getOrCreateInstance(notification)
      bsAlert.close()
    }
  }, 5000)
}

// Refresh dashboard data
function refreshDashboard() {
  window.location.reload()
}

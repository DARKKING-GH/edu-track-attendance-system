import { Chart } from "@/components/ui/chart"
// Student analytics functionality
let currentAnalytics = null

function initializeStudentAnalytics() {
  console.log("Student analytics initialized")

  // Set up event listeners
  document.getElementById("timeRangeSelect").addEventListener("change", loadAnalytics)

  // Load initial analytics
  loadAnalytics()
}

async function loadAnalytics() {
  const days = document.getElementById("timeRangeSelect").value
  const studentId = getCurrentStudentId() // You'll need to implement this

  try {
    const response = await fetch(`/api/analytics/student/${studentId}?days=${days}`)
    const result = await response.json()

    if (result.success) {
      currentAnalytics = result.analytics
      updateAnalyticsDisplay(result.analytics)
      updateCharts(result.analytics)
    } else {
      showAlert("Failed to load analytics", "danger")
    }
  } catch (error) {
    console.error("Error loading analytics:", error)
    showAlert("Failed to load analytics", "danger")
  }
}

function updateAnalyticsDisplay(analytics) {
  // Update stat cards
  document.getElementById("totalAttendance").textContent = analytics.total_attendance || 0
  document.getElementById("attendanceRate").textContent = `${analytics.attendance_rate || 0}%`
  document.getElementById("trendIndicator").textContent =
    (analytics.trend || "stable").charAt(0).toUpperCase() + (analytics.trend || "stable").slice(1)

  // Update course count
  const courseCount = analytics.course_breakdown ? analytics.course_breakdown.length : 0
  document.getElementById("coursesEnrolled").textContent = courseCount

  // Update course performance
  updateCoursePerformance(analytics.course_breakdown || [])
}

function updateCharts(analytics) {
  // Update weekly trend chart
  updateWeeklyTrendChart(analytics.weekly_data || [])

  // Update course distribution chart
  updateCourseDistributionChart(analytics.course_breakdown || [])
}

function updateWeeklyTrendChart(weeklyData) {
  const ctx = document.getElementById("weeklyTrendChart")
  if (!ctx) return

  // Destroy existing chart if it exists
  if (window.weeklyChart) {
    window.weeklyChart.destroy()
  }

  const labels = weeklyData.map((item) => {
    const date = new Date(item.week)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })

  const data = weeklyData.map((item) => item.count)

  window.weeklyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Attendance Count",
          data: data,
          borderColor: "rgb(13, 110, 253)",
          backgroundColor: "rgba(13, 110, 253, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
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
        },
      },
    },
  })
}

function updateCourseDistributionChart(courseBreakdown) {
  const ctx = document.getElementById("courseDistributionChart")
  if (!ctx) return

  // Destroy existing chart if it exists
  if (window.courseChart) {
    window.courseChart.destroy()
  }

  if (courseBreakdown.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height)
    return
  }

  const labels = courseBreakdown.map((course) => course.course_name)
  const data = courseBreakdown.map((course) => course.count)
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

  window.courseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
        },
      ],
    },
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

function updateCoursePerformance(courseBreakdown) {
  const container = document.getElementById("coursePerformanceContainer")

  if (courseBreakdown.length === 0) {
    container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                <p class="text-muted">No course data available</p>
            </div>
        `
    return
  }

  const performanceHtml = courseBreakdown
    .map(
      (course) => `
        <div class="row align-items-center mb-3 p-3 border rounded">
            <div class="col-md-6">
                <h5 class="mb-1">${course.course_name}</h5>
                <small class="text-muted">Course ID: ${course.course_id}</small>
            </div>
            <div class="col-md-3 text-center">
                <h4 class="text-primary mb-0">${course.count}</h4>
                <small class="text-muted">Sessions Attended</small>
            </div>
            <div class="col-md-3">
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${Math.min((course.count / 10) * 100, 100)}%"></div>
                </div>
                <small class="text-muted">Performance</small>
            </div>
        </div>
    `,
    )
    .join("")

  container.innerHTML = performanceHtml
}

function getCurrentStudentId() {
  // This should return the current student's ID
  // You might get this from a global variable, session data, or DOM element
  return "current_student_id" // Replace with actual implementation
}

async function downloadReport() {
  const studentId = getCurrentStudentId()
  const format = "csv" // or 'json'

  try {
    const response = await fetch(`/api/reports/student/${studentId}?format=${format}`)

    if (response.ok) {
      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `student_report.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      showAlert("Report downloaded successfully!", "success")
    } else {
      showAlert("Failed to download report", "danger")
    }
  } catch (error) {
    console.error("Error downloading report:", error)
    showAlert("Failed to download report", "danger")
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

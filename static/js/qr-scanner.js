// QR Scanner functionality using html5-qrcode library
// Import Html5Qrcode library
const Html5Qrcode = window.Html5Qrcode

// Import bootstrap library
const bootstrap = window.bootstrap

class QRScanner {
  constructor() {
    this.html5QrCode = null
    this.isScanning = false
    this.cameras = []
    this.selectedCameraId = null
    this.scannerConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    }
  }

  async initialize() {
    try {
      // Get available cameras
      this.cameras = await Html5Qrcode.getCameras()
      this.populateCameraSelect()

      // Initialize scanner
      this.html5QrCode = new Html5Qrcode("qr-reader")

      // Set up event listeners
      this.setupEventListeners()

      console.log("QR Scanner initialized successfully")
    } catch (error) {
      console.error("Failed to initialize QR scanner:", error)
      this.showError("Failed to initialize camera. Please check permissions.")
    }
  }

  populateCameraSelect() {
    const cameraSelect = document.getElementById("cameraSelect")
    cameraSelect.innerHTML = ""

    if (this.cameras.length === 0) {
      cameraSelect.innerHTML = '<option value="">No cameras found</option>'
      return
    }

    this.cameras.forEach((camera, index) => {
      const option = document.createElement("option")
      option.value = camera.id
      option.textContent = camera.label || `Camera ${index + 1}`
      cameraSelect.appendChild(option)
    })

    // Select back camera by default (usually better for QR scanning)
    const backCamera = this.cameras.find(
      (camera) => camera.label.toLowerCase().includes("back") || camera.label.toLowerCase().includes("rear"),
    )

    if (backCamera) {
      cameraSelect.value = backCamera.id
      this.selectedCameraId = backCamera.id
    } else {
      this.selectedCameraId = this.cameras[0].id
      cameraSelect.value = this.selectedCameraId
    }
  }

  setupEventListeners() {
    const startBtn = document.getElementById("startScanBtn")
    const stopBtn = document.getElementById("stopScanBtn")
    const cameraSelect = document.getElementById("cameraSelect")
    const refreshBtn = document.getElementById("refreshScanner")
    const manualSubmit = document.getElementById("submitManualQr")

    startBtn.addEventListener("click", () => this.startScanning())
    stopBtn.addEventListener("click", () => this.stopScanning())
    refreshBtn.addEventListener("click", () => this.refreshScanner())
    manualSubmit.addEventListener("click", () => this.submitManualQR())

    cameraSelect.addEventListener("change", (e) => {
      this.selectedCameraId = e.target.value
      if (this.isScanning) {
        this.stopScanning()
        setTimeout(() => this.startScanning(), 500)
      }
    })
  }

  async startScanning() {
    if (this.isScanning) return

    try {
      this.updateScannerStatus("Starting camera...", "info")

      await this.html5QrCode.start(
        this.selectedCameraId || { facingMode: "environment" },
        this.scannerConfig,
        (decodedText, decodedResult) => {
          this.onScanSuccess(decodedText, decodedResult)
        },
        (errorMessage) => {
          // Handle scan errors silently (too many false positives)
        },
      )

      this.isScanning = true
      this.updateUI(true)
      this.updateScannerStatus("Scanner active - Point camera at QR code", "success")
    } catch (error) {
      console.error("Failed to start scanning:", error)
      this.showError("Failed to start camera. Please check permissions and try again.")
    }
  }

  async stopScanning() {
    if (!this.isScanning) return

    try {
      await this.html5QrCode.stop()
      this.isScanning = false
      this.updateUI(false)
      this.updateScannerStatus("Scanner stopped", "secondary")
    } catch (error) {
      console.error("Failed to stop scanning:", error)
    }
  }

  async refreshScanner() {
    if (this.isScanning) {
      await this.stopScanning()
    }

    // Re-initialize cameras
    try {
      this.cameras = await Html5Qrcode.getCameras()
      this.populateCameraSelect()
      this.updateScannerStatus("Scanner refreshed", "info")
    } catch (error) {
      console.error("Failed to refresh scanner:", error)
      this.showError("Failed to refresh camera list.")
    }
  }

  onScanSuccess(decodedText, decodedResult) {
    console.log("QR Code scanned:", decodedText)

    // Stop scanning temporarily to prevent multiple scans
    this.stopScanning()

    // Process the QR code
    this.processQRCode(decodedText)
  }

  async processQRCode(qrData) {
    try {
      this.updateScannerStatus("Processing QR code...", "info")

      const response = await fetch("/api/mark-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_data: qrData }),
      })

      const result = await response.json()

      if (result.success) {
        this.showSuccess(result.message)
        this.updateScannerStatus("Attendance recorded successfully!", "success")

        // Refresh attendance data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        this.showError(result.message)
        this.updateScannerStatus("Ready to scan", "info")
      }
    } catch (error) {
      console.error("Failed to process QR code:", error)
      this.showError("Failed to process QR code. Please try again.")
      this.updateScannerStatus("Ready to scan", "info")
    }
  }

  submitManualQR() {
    const manualInput = document.getElementById("manualQrInput")
    const qrData = manualInput.value.trim()

    if (!qrData) {
      this.showError("Please enter QR code data")
      return
    }

    this.processQRCode(qrData)
    manualInput.value = ""
  }

  updateUI(isScanning) {
    const startBtn = document.getElementById("startScanBtn")
    const stopBtn = document.getElementById("stopScanBtn")
    const qrReader = document.getElementById("qr-reader")
    const cameraSelection = document.getElementById("cameraSelection")

    if (isScanning) {
      startBtn.style.display = "none"
      stopBtn.style.display = "inline-block"
      qrReader.style.display = "block"
      cameraSelection.style.display = "block"
    } else {
      startBtn.style.display = "inline-block"
      stopBtn.style.display = "none"
      qrReader.style.display = "none"
      cameraSelection.style.display = "none"
    }
  }

  updateScannerStatus(message, type = "info") {
    const statusElement = document.getElementById("scannerStatus")
    const iconMap = {
      success: "check-circle",
      info: "info-circle",
      warning: "exclamation-triangle",
      danger: "exclamation-circle",
      secondary: "minus-circle",
    }

    statusElement.className = `alert alert-${type}`
    statusElement.innerHTML = `<i class="fas fa-${iconMap[type]} me-2"></i>${message}`
  }

  showSuccess(message) {
    const modal = new bootstrap.Modal(document.getElementById("successModal"))
    document.getElementById("successMessage").textContent = message
    modal.show()
  }

  showError(message) {
    // Create error alert
    const alertHtml = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `

    // Insert at top of scanner container
    const scannerContainer = document.querySelector(".qr-scanner-container")
    scannerContainer.insertAdjacentHTML("afterbegin", alertHtml)

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      const alert = scannerContainer.querySelector(".alert-danger")
      if (alert) {
        const bsAlert = new bootstrap.Alert(alert)
        bsAlert.close()
      }
    }, 5000)
  }
}

// Global scanner instance
let qrScanner = null

// Initialize scanner when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  qrScanner = new QRScanner()
  qrScanner.initialize()
})

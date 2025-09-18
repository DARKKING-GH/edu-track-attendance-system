"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, QrCode, CheckCircle, XCircle, AlertCircle, Square } from "lucide-react"

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QRScannerComponent({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setHasPermission(true)
      setError(null)
      setIsScanning(true)

      // Simulate QR scanning for demo purposes
      // In a real app, you'd use a QR detection library here
      setTimeout(() => {
        if (isScanning) {
          // Generate a demo QR code result
          const demoQRData = `course-123-session-${Date.now()}`
          console.log("[v0] Demo QR Code detected:", demoQRData)
          setScanResult(demoQRData)
          setIsScanning(false)
          onScan(demoQRData)
          stopCamera()
        }
      }, 3000)
    } catch (err) {
      console.error("[v0] Camera access error:", err)
      setHasPermission(false)
      setError("Camera access denied. Please allow camera access and try again.")
      if (onError) {
        onError("Camera access denied")
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const handleStartScanning = async () => {
    setError(null)
    setScanResult(null)
    await startCamera()
  }

  const handleStopScanning = () => {
    stopCamera()
    setScanResult(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>Scan QR codes to mark your attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
          {isScanning ? (
            <div className="relative w-full h-full">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Square className="h-32 w-32 text-white/80 animate-pulse" strokeWidth={2} />
                  <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-white text-sm bg-black/50 rounded px-2 py-1">Point camera at QR code</p>
              </div>
            </div>
          ) : scanResult ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-4">
                <CheckCircle className="h-16 w-16 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">QR Code Detected</p>
                <p className="text-xs text-muted-foreground break-all mt-2">{scanResult}</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-4">
                <XCircle className="h-16 w-16 mx-auto mb-2 text-red-500" />
                <p className="text-sm font-medium">Scanner Error</p>
                <p className="text-xs text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          ) : hasPermission === false ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-4">
                <AlertCircle className="h-16 w-16 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm font-medium">Camera Access Required</p>
                <p className="text-xs text-muted-foreground mt-2">Please allow camera access to scan QR codes</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Ready to scan</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={handleStartScanning} className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={handleStopScanning} variant="outline" className="flex-1 bg-transparent">
              Stop Scanning
            </Button>
          )}

          {scanResult && (
            <Button
              onClick={() => {
                setScanResult(null)
                setError(null)
              }}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {hasPermission === false && (
          <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
            <p className="font-medium">Camera Permission Required</p>
            <p>To scan QR codes, please:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click the camera icon in your browser's address bar</li>
              <li>Select "Allow" for camera access</li>
              <li>Try scanning again</li>
            </ol>
          </div>
        )}

        {isScanning && (
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="font-medium">Demo Mode Active</p>
            <p>This will automatically detect a demo QR code after 3 seconds for testing purposes.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

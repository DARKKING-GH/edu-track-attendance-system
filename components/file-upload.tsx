"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, ImageIcon } from "lucide-react"

interface FileUploadProps {
  onUpload: (url: string, filename: string) => void
  type: "profile" | "course-material" | "report"
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function FileUpload({ onUpload, type, accept = "*/*", maxSize = 5, className = "" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      onUpload(result.url, result.filename)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  return (
    <Card
      className={`${className} ${dragOver ? "border-blue-500 bg-blue-50" : ""}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-4">
            {type === "profile" ? (
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            ) : (
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
            )}
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Drag and drop your file here, or click to select</p>
            <p className="text-xs text-gray-500">Max size: {maxSize}MB</p>
          </div>
          <Input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            id={`file-upload-${type}`}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(`file-upload-${type}`)?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Select File"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

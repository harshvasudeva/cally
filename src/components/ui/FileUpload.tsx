"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from "react"
import { Upload, X, File } from "lucide-react"

interface FileUploadProps {
  accept?: string
  maxSize?: number // bytes
  onUpload?: (file: File) => void
  label?: string
  description?: string
  className?: string
}

export default function FileUpload({
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB default
  onUpload,
  label = "Upload a file",
  description = "Drag and drop or click to browse",
  className = "",
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setError("")
    if (maxSize && f.size > maxSize) {
      setError(`File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`)
      return
    }
    setFile(f)
    onUpload?.(f)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const clear = () => {
    setFile(null)
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={className}>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 p-8
            border-2 border-dashed rounded-[var(--radius-lg)] cursor-pointer
            transition-colors duration-[var(--transition-fast)]
            ${dragging
              ? "border-primary bg-primary-light"
              : "border-border hover:border-border-hover hover:bg-surface-hover"
            }
          `}
        >
          <Upload size={20} className="text-text-tertiary" />
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-text-tertiary">{description}</p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-[var(--radius-lg)]">
          <File size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{file.name}</p>
            <p className="text-xs text-text-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={clear}
            className="shrink-0 p-1 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

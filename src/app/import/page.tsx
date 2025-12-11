"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Upload, FileText, Check, AlertCircle } from "lucide-react"

export default function ImportPage() {
    const { data: session, status } = useSession()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string; events?: Array<{ title: string }> } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setResult(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/calendar", {
                method: "POST",
                body: formData
            })

            const data = await res.json()

            if (res.ok) {
                setResult({
                    success: true,
                    message: data.message,
                    events: data.events
                })
                setFile(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
            } else {
                setResult({
                    success: false,
                    message: data.error || "Failed to import calendar"
                })
            }
        } catch (error) {
            setResult({
                success: false,
                message: "Failed to import calendar"
            })
        } finally {
            setUploading(false)
        }
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        )
    }

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Import Calendar</h1>
                        <p className="text-slate-400 mt-1">
                            Import events from Google Calendar, Outlook, or any ICS file
                        </p>
                    </div>

                    {/* Upload Area */}
                    <div className="card">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200
                ${file
                                    ? "border-indigo-500 bg-indigo-500/10"
                                    : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/50"
                                }
              `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".ics,.ical"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {file ? (
                                <>
                                    <FileText size={48} className="mx-auto text-indigo-400 mb-4" />
                                    <p className="text-lg font-medium text-white">{file.name}</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Upload size={48} className="mx-auto text-slate-500 mb-4" />
                                    <p className="text-lg font-medium text-white">
                                        Drop your ICS file here
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        or click to browse
                                    </p>
                                </>
                            )}
                        </div>

                        {file && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="btn btn-primary w-full mt-4"
                            >
                                {uploading ? (
                                    <span className="loading-spinner mx-auto" />
                                ) : (
                                    <>
                                        <Upload size={18} className="mr-2" />
                                        Import Events
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`mt-6 p-4 rounded-lg ${result.success
                                ? "bg-emerald-500/20 border border-emerald-500/30"
                                : "bg-red-500/20 border border-red-500/30"
                            }`}>
                            <div className="flex items-start gap-3">
                                {result.success ? (
                                    <Check className="text-emerald-400 mt-0.5" />
                                ) : (
                                    <AlertCircle className="text-red-400 mt-0.5" />
                                )}
                                <div>
                                    <p className={result.success ? "text-emerald-400" : "text-red-400"}>
                                        {result.message}
                                    </p>
                                    {result.events && result.events.length > 0 && (
                                        <ul className="mt-2 text-sm text-slate-400">
                                            {result.events.slice(0, 5).map((event, i) => (
                                                <li key={i}>• {event.title}</li>
                                            ))}
                                            {result.events.length > 5 && (
                                                <li>...and {result.events.length - 5} more</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="mt-8 space-y-4">
                        <h2 className="text-lg font-semibold text-white">How to export from:</h2>

                        <div className="card">
                            <h3 className="font-medium text-white mb-2">📅 Google Calendar</h3>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal ml-4">
                                <li>Go to Google Calendar settings</li>
                                <li>Select the calendar you want to export</li>
                                <li>Click &quot;Export calendar&quot;</li>
                                <li>Upload the downloaded .ics file here</li>
                            </ol>
                        </div>

                        <div className="card">
                            <h3 className="font-medium text-white mb-2">📧 Outlook</h3>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal ml-4">
                                <li>Open Outlook Calendar</li>
                                <li>File → Save Calendar</li>
                                <li>Choose date range and save as ICS</li>
                                <li>Upload the saved file here</li>
                            </ol>
                        </div>

                        <div className="card">
                            <h3 className="font-medium text-white mb-2">🍎 Apple Calendar</h3>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal ml-4">
                                <li>Open Calendar app</li>
                                <li>File → Export → Export...</li>
                                <li>Save as ICS file</li>
                                <li>Upload the file here</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

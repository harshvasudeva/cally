import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <p className="text-8xl font-bold text-indigo-500/30 mb-4">404</p>
                <h2 className="text-2xl font-bold text-white mb-2">Page not found</h2>
                <p className="text-slate-400 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
                        <Home size={16} />
                        Dashboard
                    </Link>
                    <Link href="/calendar" className="btn btn-outline flex items-center gap-2">
                        <ArrowLeft size={16} />
                        Calendar
                    </Link>
                </div>
            </div>
        </div>
    )
}

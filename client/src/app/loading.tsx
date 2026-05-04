export default function Loading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="loading-spinner loading-spinner-lg" />
                <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
            </div>
        </div>
    )
}

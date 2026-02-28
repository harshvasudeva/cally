"use client"

interface SkeletonLineProps {
    width?: string
    height?: string
}

export function SkeletonLine({
    width = "100%",
    height = "1rem",
}: SkeletonLineProps) {
    return (
        <div
            className="animate-pulse rounded bg-slate-700/50"
            style={{ width, height }}
        />
    )
}

export function SkeletonCard() {
    return (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 space-y-4">
            {/* Header area */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full animate-pulse bg-slate-700/50" />
                <div className="flex-1 space-y-2">
                    <div className="animate-pulse rounded bg-slate-700/50 h-4 w-3/5" />
                    <div className="animate-pulse rounded bg-slate-700/50 h-3 w-2/5" />
                </div>
            </div>

            {/* Body lines */}
            <div className="space-y-3">
                <div className="animate-pulse rounded bg-slate-700/50 h-3 w-full" />
                <div className="animate-pulse rounded bg-slate-700/50 h-3 w-4/5" />
                <div className="animate-pulse rounded bg-slate-700/50 h-3 w-3/5" />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
                <div className="animate-pulse rounded bg-slate-700/50 h-8 w-20" />
                <div className="animate-pulse rounded bg-slate-700/50 h-8 w-20" />
            </div>
        </div>
    )
}

interface SkeletonTableProps {
    rows?: number
    columns?: number
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
    return (
        <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
            {/* Table header */}
            <div
                className="grid gap-4 px-6 py-4 border-b border-slate-700 bg-slate-800/80"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`header-${i}`}
                        className="animate-pulse rounded bg-slate-700/50 h-4"
                    />
                ))}
            </div>

            {/* Table rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={`row-${rowIdx}`}
                    className="grid gap-4 px-6 py-4 border-b border-slate-700/50 last:border-b-0"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <div
                            key={`cell-${rowIdx}-${colIdx}`}
                            className="animate-pulse rounded bg-slate-700/50 h-4"
                            style={{
                                width: `${60 + Math.round(Math.sin(rowIdx + colIdx) * 20)}%`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

export function SkeletonCalendar() {
    const daysInGrid = 35 // 5 weeks x 7 days

    return (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 space-y-4">
            {/* Calendar header - month nav */}
            <div className="flex items-center justify-between">
                <div className="animate-pulse rounded bg-slate-700/50 h-6 w-8" />
                <div className="animate-pulse rounded bg-slate-700/50 h-6 w-36" />
                <div className="animate-pulse rounded bg-slate-700/50 h-6 w-8" />
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((_, i) => (
                    <div
                        key={`dow-${i}`}
                        className="animate-pulse rounded bg-slate-700/50 h-4 mx-auto w-6"
                    />
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: daysInGrid }).map((_, i) => (
                    <div
                        key={`day-${i}`}
                        className="animate-pulse rounded-lg bg-slate-700/50 aspect-square"
                    />
                ))}
            </div>
        </div>
    )
}

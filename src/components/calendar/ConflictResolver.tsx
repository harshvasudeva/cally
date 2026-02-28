
"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Calendar, ArrowRight } from "lucide-react";

export default function ConflictResolver() {
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        checkConflicts();
    }, []);

    async function checkConflicts() {
        const res = await fetch("/api/user/conflicts");
        if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
                setConflicts(data);
                setIsOpen(true);
            }
        }
    }

    if (!isOpen) return null;

    const currentConflict = conflicts[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <div className="flex items-center gap-3 text-amber-500 mb-6">
                    <AlertTriangle size={32} />
                    <h2 className="text-xl font-bold text-white">Scheduling Conflict Detected</h2>
                </div>

                <p className="text-slate-300 mb-6">
                    We found overlapping events in your calendar. Please choose how to resolve this conflict.
                </p>

                <div className="space-y-4 mb-8">
                    {/* Item 1 */}
                    <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-white">{currentConflict.item1.title}</h3>
                                <p className="text-sm text-slate-400">
                                    {new Date(currentConflict.item1.start).toLocaleString()}
                                </p>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded">
                                {currentConflict.item1.type}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center text-slate-500">
                        <ArrowRight className="rotate-90" />
                    </div>

                    {/* Item 2 */}
                    <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-white">{currentConflict.item2.title}</h3>
                                <p className="text-sm text-slate-400">
                                    {new Date(currentConflict.item2.start).toLocaleString()}
                                </p>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded">
                                {currentConflict.item2.type}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                        Reschedule "{currentConflict.item2.title}"
                    </button>
                    <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
                        Ignore All
                    </button>
                </div>
            </div>
        </div>
    );
}

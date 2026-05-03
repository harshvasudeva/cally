"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Plug, Trash2, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";

interface Account {
  id: string;
  provider: string;
  email: string;
  displayName: string | null;
  syncStatus: string;
  syncError: string | null;
  lastSyncAt: string | null;
  calendars: { id: string; summary: string; isPrimary: boolean; selected: boolean; _count: { events: number } }[];
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Calendar",
  microsoft: "Outlook / Microsoft 365",
  apple_caldav: "Apple iCloud",
  generic_caldav: "Generic CalDAV",
};

export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google") setBanner({ type: "ok", text: "Google Calendar connected." });
    if (params.get("error")) setBanner({ type: "error", text: `Connect failed: ${params.get("error")}` });
  }, []);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Disconnect this calendar account?")) return;
    await fetch(`/api/integrations?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" data-testid="integrations-page">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Plug className="text-indigo-400" size={28} />
              <h1 className="text-3xl font-bold">Integrations</h1>
            </div>
            <p className="text-slate-400">Connect your external calendars so Cally avoids double-bookings.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white" data-testid="back-to-dashboard">
            ← Back
          </Link>
        </header>

        {banner && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-center gap-2 ${
              banner.type === "ok"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
            data-testid="integrations-banner"
          >
            {banner.type === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {banner.text}
          </div>
        )}

        {/* Available providers */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Available providers</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-800/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Calendar className="text-indigo-400" size={20} />
                <div>
                  <div className="font-medium">Google Calendar</div>
                  <div className="text-xs text-slate-400">Two-way sync — busy times block your booking page.</div>
                </div>
              </div>
              <a
                href="/api/integrations/google/connect"
                className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm flex items-center gap-2"
                data-testid="connect-google-btn"
              >
                Connect <ExternalLink size={14} />
              </a>
            </div>

            {(["microsoft", "apple_caldav", "generic_caldav"] as const).map((p) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-lg bg-slate-800/30 px-4 py-3 opacity-60"
                data-testid={`provider-row-${p}`}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-slate-500" />
                  <div>
                    <div className="font-medium">{PROVIDER_LABELS[p]}</div>
                    <div className="text-xs text-slate-500">Coming in Phase 1</div>
                  </div>
                </div>
                <button disabled className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-500 text-sm cursor-not-allowed">
                  Soon
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Connected accounts */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Connected accounts</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-500 text-sm">No accounts connected yet.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-800/60 px-4 py-3" data-testid={`connected-${a.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{PROVIDER_LABELS[a.provider] ?? a.provider}</div>
                      <div className="text-xs text-slate-400">{a.email}</div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(a.id)}
                      className="text-slate-400 hover:text-red-400"
                      data-testid={`disconnect-${a.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.calendars.length} calendar(s) · last synced {a.lastSyncAt ? new Date(a.lastSyncAt).toLocaleString() : "never"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { apiFetch } from "@/lib/api-client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check, X, Trash2, Loader2, ExternalLink } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  description: string;
  modelInputType: "preset" | "freeform";
  models: string[];
  capabilities: string[];
  requiresBaseUrl: boolean;
  signupUrl: string;
}

interface Credential {
  id: string;
  providerId: string;
  defaultModel: string;
  label: string | null;
  baseUrl: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestedOk: boolean | null;
  keyPreview: string;
}

export default function AISettingsPage() {
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const res = await apiFetch("/api/v1/ai/credentials");
    if (res.ok) {
      const data = await res.json();
      setProviders(data.providers);
      setCredentials(data.credentials);
    }
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const p = providers[selectedProvider];
    if (p && p.models[0]) setModel(p.models[0]);
  }, [selectedProvider, providers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const res = await apiFetch("/api/v1/ai/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: selectedProvider,
        apiKey,
        defaultModel: model,
        baseUrl: baseUrl || undefined,
        test: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      setSuccess("Provider connected and tested successfully.");
      setApiKey("");
      load();
    }
    setSubmitting(false);
  };

  const provider = providers[selectedProvider];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" data-testid="ai-settings-page">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="text-indigo-400" size={28} />
              <h1 className="text-3xl font-bold">AI Providers</h1>
            </div>
            <p className="text-slate-400">
              Bring your own key. Cally never charges you for AI — every request goes straight to your provider.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white" data-testid="back-to-dashboard">
            ← Back
          </Link>
        </header>

        {/* Connected list */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Connected providers</h2>
          {credentials.length === 0 ? (
            <p className="text-slate-500 text-sm">No providers connected yet. Add your first one below.</p>
          ) : (
            <ul className="space-y-2">
              {credentials.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/60 px-4 py-3"
                  data-testid={`credential-${c.providerId}`}
                >
                  <div>
                    <div className="font-medium">{providers[c.providerId]?.name ?? c.providerId}</div>
                    <div className="text-xs text-slate-400">
                      Default model: <code>{c.defaultModel}</code> · Key {c.keyPreview}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.lastTestedOk ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <Check size={14} /> verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-xs">
                        <X size={14} /> untested
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/v1/ai/credentials?id=${c.id}`, { method: "DELETE" });
                        load();
                      }}
                      className="text-slate-400 hover:text-red-400"
                      data-testid={`delete-credential-${c.providerId}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add new provider */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Add a provider</h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Provider grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(providers).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${
                    selectedProvider === p.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/10 bg-slate-800/40 hover:border-white/20"
                  }`}
                  data-testid={`provider-${p.id}`}
                >
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400 truncate">{p.description}</div>
                </button>
              ))}
            </div>

            {provider && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    API key
                    <a
                      href={provider.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      get one <ExternalLink size={11} className="ml-0.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Paste your ${provider.name} API key`}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                    data-testid="api-key-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Default model</label>
                  {provider.modelInputType === "preset" ? (
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      data-testid="model-select"
                    >
                      {provider.models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      list={`models-${provider.id}`}
                      placeholder="model name (e.g. llama3.3)"
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      data-testid="model-input"
                    />
                  )}
                  <datalist id={`models-${provider.id}`}>
                    {provider.models.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {provider.requiresBaseUrl && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Base URL</label>
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434/v1"
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      data-testid="base-url-input"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2" data-testid="error-message">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2" data-testid="success-message">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="save-credential-btn"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
              Test &amp; save
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

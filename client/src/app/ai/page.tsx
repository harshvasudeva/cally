"use client";

import { apiFetch, apiUrl } from "@/lib/api-client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sparkles, Send, Loader2, AlertCircle } from "lucide-react";

interface Credential {
  id: string;
  providerId: string;
  defaultModel: string;
  label: string | null;
  lastTestedOk: boolean | null;
}

export default function AIChatPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    api: apiUrl("/api/v1/ai/chat"),
    body: { credentialId },
  } as never);

  useEffect(() => {
    apiFetch("/api/v1/ai/credentials")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.credentials?.length > 0) {
          setCredentials(data.credentials);
          setCredentialId(data.credentials[0].id);
        }
        setLoadingCreds(false);
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100" data-testid="ai-chat-page">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Sparkles className="text-indigo-400" size={22} />
          <div>
            <h1 className="text-lg font-bold">Cally AI</h1>
            <p className="text-xs text-slate-400">
              {credentials.length > 0
                ? `Using ${credentials[0].providerId} · ${credentials[0].defaultModel}`
                : "No provider connected"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {credentials.length > 1 && (
            <select
              value={credentialId ?? ""}
              onChange={(e) => setCredentialId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              data-testid="credential-select"
            >
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.providerId} · {c.defaultModel}
                </option>
              ))}
            </select>
          )}
          <Link href="/settings/ai" className="text-sm text-slate-400 hover:text-white" data-testid="manage-ai-link">
            Settings
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white" data-testid="back-to-dashboard">
            ← Back
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {!loadingCreds && credentials.length === 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-6 flex gap-3" data-testid="no-credential-banner">
              <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-amber-300 mb-1">Connect an AI provider</h3>
                <p className="text-sm text-amber-200/80 mb-3">
                  Cally never charges you for AI — bring your own API key from OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter or a local Ollama instance.
                </p>
                <Link
                  href="/settings/ai"
                  className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 hover:text-amber-100"
                  data-testid="goto-settings-ai"
                >
                  Go to AI settings →
                </Link>
              </div>
            </div>
          )}

          {messages.length === 0 && credentials.length > 0 && (
            <div className="text-center py-16">
              <Sparkles className="mx-auto text-indigo-400 mb-3" size={32} />
              <h2 className="text-xl font-semibold mb-2">How can I help with your schedule?</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Try: <em>&ldquo;Find me a 30-minute slot next Tuesday afternoon&rdquo;</em> or{" "}
                <em>&ldquo;Draft a polite reply rescheduling Friday&apos;s call&rdquo;</em>
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${m.role}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800 border border-white/10 text-slate-100"
                }`}
              >
                {m.parts.map((part, idx) =>
                  part.type === "text" ? (
                    <div key={idx} className="whitespace-pre-wrap text-sm leading-relaxed">
                      {part.text}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          ))}

          {status === "streaming" && (
            <div className="flex justify-start" data-testid="streaming-indicator">
              <div className="bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="animate-spin" size={14} /> thinking…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm" data-testid="error-banner">
              {error.message ?? "Something went wrong"}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 bg-slate-900/50 backdrop-blur px-6 py-4"
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={credentials.length > 0 ? "Ask Cally anything…" : "Connect a provider to start chatting"}
            disabled={credentials.length === 0 || status === "streaming"}
            className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || credentials.length === 0 || status === "streaming"}
            className="px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition disabled:opacity-50"
            data-testid="send-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

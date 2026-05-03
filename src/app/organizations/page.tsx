"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Users, Loader2, Mail, Crown } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: string;
  isOwner: boolean;
  role: string;
  memberCount: number;
  teamCount: number;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");

  const load = async () => {
    const res = await fetch("/api/organizations");
    if (res.ok) {
      const data = await res.json();
      setOrgs(data.organizations);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const loadInvitations = async (orgId: string) => {
    const res = await fetch(`/api/organizations/${orgId}/invitations`);
    if (res.ok) {
      const data = await res.json();
      setInvitations(data.invitations);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed");
    }
    setCreating(false);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setError("");
    setInviteUrl("");
    const res = await fetch(`/api/organizations/${activeOrgId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setInviteEmail("");
      setInviteUrl(data.acceptUrl);
      loadInvitations(activeOrgId);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" data-testid="organizations-page">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="text-indigo-400" size={28} />
              <h1 className="text-3xl font-bold">Organizations</h1>
            </div>
            <p className="text-slate-400">Manage teams, invite collaborators, and set up round-robin scheduling.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white" data-testid="back-to-dashboard">
            ← Back
          </Link>
        </header>

        {/* Existing orgs */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Your organizations</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-slate-500 text-sm">No organizations yet. Create one below.</p>
          ) : (
            <ul className="space-y-2">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className={`rounded-lg px-4 py-3 cursor-pointer transition ${
                    activeOrgId === o.id ? "bg-indigo-500/10 border border-indigo-500/40" : "bg-slate-800/60 hover:bg-slate-800"
                  }`}
                  onClick={() => {
                    setActiveOrgId(o.id);
                    loadInvitations(o.id);
                  }}
                  data-testid={`org-${o.slug}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold">
                        {o.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {o.name}
                          {o.isOwner && <Crown size={12} className="text-amber-400" />}
                        </div>
                        <div className="text-xs text-slate-400">
                          /{o.slug} · {o.memberCount} member{o.memberCount === 1 ? "" : "s"} · {o.teamCount} team{o.teamCount === 1 ? "" : "s"} · {o.plan}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 capitalize">{o.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create new org */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold mb-4">Create organization</h2>
          <form onSubmit={create} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              required
              className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              data-testid="org-name-input"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition disabled:opacity-50 flex items-center gap-2"
              data-testid="create-org-btn"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create
            </button>
          </form>
        </section>

        {/* Invitations + team controls (per active org) */}
        {activeOrgId && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-6" data-testid="org-detail">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail size={18} className="text-indigo-400" /> Invite a member
              </h2>
              <form onSubmit={invite} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  required
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500"
                  data-testid="invite-email-input"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
                  data-testid="invite-role-select"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
                  data-testid="send-invite-btn"
                >
                  Invite
                </button>
              </form>
              {inviteUrl && (
                <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs">
                  <span className="text-green-400">Share this link:</span>{" "}
                  <code className="text-green-300 break-all">{inviteUrl}</code>
                </div>
              )}
              {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Users size={14} /> Pending invitations
              </h3>
              {invitations.length === 0 ? (
                <p className="text-slate-500 text-xs">None.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="rounded bg-slate-800/60 px-3 py-2 flex justify-between">
                      <span>
                        {inv.email}{" "}
                        <span className="text-xs text-slate-500">({inv.role})</span>
                      </span>
                      <span className="text-xs text-slate-400">{inv.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

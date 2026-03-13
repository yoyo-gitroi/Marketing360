"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function TeamSettingsPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTeamMembers() {
    setLoading(true);
    try {
      // Use /api/me to get org (bypasses RLS for super admin)
      const meRes = await fetch("/api/me");
      if (!meRes.ok) return;
      const me = await meRes.json();

      if (!me.org?.id) return;
      setOrgId(me.org.id);

      // Fetch all members with profile info
      const { data: teamMembers } = await supabase
        .from("org_members")
        .select("id, user_id, role, profiles(full_name, email)")
        .eq("org_id", me.org.id)
        .order("role", { ascending: true });

      setMembers((teamMembers as unknown as TeamMember[]) ?? []);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !orgId) return;

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), org_id: orgId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to send invite");
      }

      setInviteMessage({ type: "success", text: `Invite sent to ${inviteEmail}` });
      setInviteEmail("");
    } catch (err: any) {
      setInviteMessage({ type: "error", text: err.message ?? "Something went wrong" });
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View team members and invite new collaborators.
        </p>
      </div>

      {/* Invite Form */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm mb-8">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Invite a Team Member</h2>
        </div>
        <form onSubmit={handleInvite} className="px-6 py-5">
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteLoading ? "Sending..." : "Send Invite"}
            </button>
          </div>
          {inviteMessage && (
            <p
              className={`mt-3 text-sm ${
                inviteMessage.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {inviteMessage.text}
            </p>
          )}
        </form>
      </div>

      {/* Team Members List */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">
            Current Members{" "}
            <span className="text-sm font-normal text-gray-400">
              ({members.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No team members found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.profiles?.full_name ?? "Unnamed User"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {member.profiles?.email ?? "—"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                    ROLE_STYLES[member.role] ?? ROLE_STYLES.member
                  }`}
                >
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

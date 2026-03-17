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

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function TeamSettingsPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      setCurrentUserRole(me.role);

      // Fetch all members with profile info
      const { data: teamMembers } = await supabase
        .from("org_members")
        .select("id, user_id, role, profiles(full_name, email)")
        .eq("org_id", me.org.id)
        .order("role", { ascending: true });

      setMembers((teamMembers as unknown as TeamMember[]) ?? []);

      // Fetch pending invites
      const { data: invites } = await supabase
        .from("pending_invites")
        .select("id, email, role, created_at")
        .eq("org_id", me.org.id)
        .order("created_at", { ascending: false });

      setPendingInvites((invites as PendingInvite[]) ?? []);
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
        body: JSON.stringify({
          email: inviteEmail.trim(),
          org_id: orgId,
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to send invite");
      }

      setInviteMessage({
        type: "success",
        text: `Invite sent to ${inviteEmail} as ${inviteRole}`,
      });
      setInviteEmail("");
      setInviteRole("member");
      // Refresh pending invites
      fetchTeamMembers();
    } catch (err: any) {
      setInviteMessage({
        type: "error",
        text: err.message ?? "Something went wrong",
      });
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setRemovingId(memberId);
    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("id", memberId);

      if (error) {
        alert("Failed to remove member: " + error.message);
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch (err) {
      alert("Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      const { error } = await supabase
        .from("pending_invites")
        .delete()
        .eq("id", inviteId);

      if (error) {
        alert("Failed to cancel invite: " + error.message);
      } else {
        setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch {
      alert("Failed to cancel invite");
    }
  }

  const canManage =
    currentUserRole === "owner" || currentUserRole === "admin";

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
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "member")
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
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

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm mb-8">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold">
              Pending Invites{" "}
              <span className="text-sm font-normal text-gray-400">
                ({pendingInvites.length})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {invite.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Invited{" "}
                    {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      ROLE_STYLES[invite.role] ?? ROLE_STYLES.member
                    }`}
                  >
                    {invite.role}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                    {member.profiles?.email ?? "\u2014"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      ROLE_STYLES[member.role] ?? ROLE_STYLES.member
                    }`}
                  >
                    {member.role}
                  </span>
                  {canManage && member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                    >
                      {removingId === member.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

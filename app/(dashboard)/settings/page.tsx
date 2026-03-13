"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [role, setRole] = useState<string>("member");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        setOrg(data.org);
        setOrgName(data.org?.name ?? "");
        setRole(data.role ?? "member");
        setIsSuperAdmin(data.isSuperAdmin ?? false);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [router]);

  async function handleSave() {
    if (!org || !orgName.trim()) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings/update-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id, name: orgName.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }

      setOrg({ ...org, name: orgName.trim() });
      setSaveMessage({ type: "success", text: "Organization name saved." });
    } catch (err: any) {
      setSaveMessage({ type: "error", text: err.message ?? "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-10 px-4">
        <p className="text-sm text-gray-400">Loading settings...</p>
      </div>
    );
  }

  const canEdit = role === "owner" || role === "admin" || isSuperAdmin;

  return (
    <div className="mx-auto max-w-3xl py-10 px-4">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        {isSuperAdmin && (
          <span className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800">
            Super Admin
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Manage your organization details and preferences.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">General</h2>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                setSaveMessage(null);
              }}
              disabled={!canEdit}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            {!canEdit && (
              <p className="mt-1 text-xs text-gray-400">
                Only admins and owners can edit the organization name.
              </p>
            )}
          </div>

          {/* Slug (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Slug
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={org?.slug ?? ""}
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm cursor-not-allowed"
              />
              <span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                Read-only
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              The slug is used in URLs and cannot be changed.
            </p>
          </div>

          {/* Created Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created
            </label>
            <p className="text-sm text-gray-600">
              {org?.created_at
                ? new Date(org.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "\u2014"}
            </p>
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div>
              {saveMessage && (
                <p
                  className={`text-sm ${
                    saveMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {saveMessage.text}
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || orgName.trim() === org?.name}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation to sub-pages */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href="/settings/team"
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow transition"
        >
          <h3 className="font-semibold text-gray-900">Team Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Invite members, manage roles, and remove team members.
          </p>
        </a>

        {canEdit && (
          <a
            href="/settings/prompts"
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow transition"
          >
            <h3 className="font-semibold text-gray-900">Prompt Registry</h3>
            <p className="mt-1 text-sm text-gray-500">
              View and manage AI prompt templates and versioning.
            </p>
          </a>
        )}
      </div>
    </div>
  );
}

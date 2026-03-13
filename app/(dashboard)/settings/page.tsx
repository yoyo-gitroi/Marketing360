import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's organization membership and org details
  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations(id, name, slug, created_at)")
    .eq("user_id", user.id)
    .single();

  const org = (membership?.organizations as any) ?? null;
  const role = membership?.role ?? "member";

  return (
    <div className="mx-auto max-w-3xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-1">Organization Settings</h1>
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
              defaultValue={org?.name ?? ""}
              disabled={role === "member"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            {role === "member" && (
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
                : "—"}
            </p>
          </div>
        </div>

        {/* Footer */}
        {role !== "member" && (
          <div className="flex justify-end border-t border-gray-200 px-6 py-4">
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Save Changes
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

        {(role === "admin" || role === "owner") && (
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

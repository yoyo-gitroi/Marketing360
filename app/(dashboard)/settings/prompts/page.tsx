"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PromptVersion {
  id: string;
  version: number;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  max_tokens: number;
  temperature: number;
  created_at: string;
}

interface PromptEntry {
  id: string;
  prompt_key: string;
  active_version: number;
  model: string;
  updated_at: string;
  versions: PromptVersion[];
}

const MODEL_OPTIONS = [
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "claude-haiku-235-20250414",
  "gpt-4o",
  "gpt-4o-mini",
];

export default function PromptRegistryPage() {
  const supabase = createClient();

  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editState, setEditState] = useState<{
    system_prompt: string;
    user_prompt_template: string;
    model: string;
    max_tokens: number;
    temperature: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check role — only admin/owner can access
      const { data: membership } = await supabase
        .from("org_members")
        .select("role, org_id")
        .eq("user_id", user.id)
        .single();

      if (!membership || membership.role === "member") {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      // Fetch all prompts for this org
      const { data: promptRows } = await supabase
        .from("prompt_templates")
        .select("*")
        .eq("org_id", membership.org_id)
        .order("prompt_key", { ascending: true });

      if (!promptRows) {
        setPrompts([]);
        setLoading(false);
        return;
      }

      // Fetch all versions for these prompts
      const promptIds = promptRows.map((p: any) => p.id);
      const { data: versionRows } = await supabase
        .from("prompt_versions")
        .select("*")
        .in("prompt_id", promptIds)
        .order("version", { ascending: false });

      const versionsByPromptId: Record<string, PromptVersion[]> = {};
      (versionRows ?? []).forEach((v: any) => {
        if (!versionsByPromptId[v.prompt_id]) versionsByPromptId[v.prompt_id] = [];
        versionsByPromptId[v.prompt_id].push(v);
      });

      const entries: PromptEntry[] = promptRows.map((p: any) => ({
        id: p.id,
        prompt_key: p.prompt_key,
        active_version: p.active_version,
        model: p.model,
        updated_at: p.updated_at,
        versions: versionsByPromptId[p.id] ?? [],
      }));

      setPrompts(entries);
    } catch (err) {
      console.error("Failed to fetch prompts:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  function handleExpand(prompt: PromptEntry) {
    if (expandedKey === prompt.id) {
      setExpandedKey(null);
      setEditState(null);
      setSelectedVersionId(null);
      return;
    }
    setExpandedKey(prompt.id);
    setSaveMessage(null);

    // Load current active version into edit state
    const activeVer = prompt.versions.find(
      (v) => v.version === prompt.active_version
    );
    if (activeVer) {
      setEditState({
        system_prompt: activeVer.system_prompt,
        user_prompt_template: activeVer.user_prompt_template,
        model: activeVer.model,
        max_tokens: activeVer.max_tokens,
        temperature: activeVer.temperature,
      });
      setSelectedVersionId(activeVer.id);
    } else {
      setEditState({
        system_prompt: "",
        user_prompt_template: "",
        model: MODEL_OPTIONS[0],
        max_tokens: 4096,
        temperature: 0.7,
      });
      setSelectedVersionId(null);
    }
  }

  function handleLoadVersion(version: PromptVersion) {
    setSelectedVersionId(version.id);
    setEditState({
      system_prompt: version.system_prompt,
      user_prompt_template: version.user_prompt_template,
      model: version.model,
      max_tokens: version.max_tokens,
      temperature: version.temperature,
    });
    setSaveMessage(null);
  }

  async function handleSaveNewVersion(promptId: string) {
    if (!editState) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const prompt = prompts.find((p) => p.id === promptId);
      if (!prompt) throw new Error("Prompt not found");

      const newVersion = (prompt.versions[0]?.version ?? 0) + 1;

      // Insert new version
      const { error: insertError } = await supabase
        .from("prompt_versions")
        .insert({
          prompt_id: promptId,
          version: newVersion,
          system_prompt: editState.system_prompt,
          user_prompt_template: editState.user_prompt_template,
          model: editState.model,
          max_tokens: editState.max_tokens,
          temperature: editState.temperature,
        });

      if (insertError) throw insertError;

      // Update the prompt's active version
      const { error: updateError } = await supabase
        .from("prompt_templates")
        .update({
          active_version: newVersion,
          model: editState.model,
          updated_at: new Date().toISOString(),
        })
        .eq("id", promptId);

      if (updateError) throw updateError;

      setSaveMessage(`Saved as version ${newVersion}`);
      await fetchPrompts();
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-10 px-4">
        <p className="text-sm text-gray-400">Loading prompt registry...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-5xl py-10 px-4">
        <h1 className="text-2xl font-bold mb-2">Prompt Registry</h1>
        <p className="text-sm text-red-600">
          Access denied. Only admins and owners can manage prompt templates.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-1">Prompt Registry</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage AI prompt templates. Every edit creates a new version &mdash;
        nothing is overwritten.
      </p>

      {prompts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-400 shadow-sm">
          No prompts registered yet. Prompts are created automatically when
          features are first used.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">Prompt Key</div>
            <div className="col-span-2">Active Version</div>
            <div className="col-span-3">Model</div>
            <div className="col-span-3">Last Updated</div>
          </div>

          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              {/* Row */}
              <button
                onClick={() => handleExpand(prompt)}
                className="w-full grid grid-cols-12 gap-4 items-center px-4 py-3 text-left hover:bg-gray-50 transition rounded-lg"
              >
                <div className="col-span-4 text-sm font-medium text-gray-900 truncate">
                  {prompt.prompt_key}
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  v{prompt.active_version}
                </div>
                <div className="col-span-3 text-sm text-gray-600 truncate">
                  {prompt.model}
                </div>
                <div className="col-span-3 text-sm text-gray-500">
                  {new Date(prompt.updated_at).toLocaleDateString()}
                </div>
              </button>

              {/* Expanded Edit Panel */}
              {expandedKey === prompt.id && editState && (
                <div className="border-t border-gray-200 p-6">
                  <div className="flex gap-6">
                    {/* Edit Form */}
                    <div className="flex-1 space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          System Prompt
                        </label>
                        <textarea
                          rows={8}
                          value={editState.system_prompt}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              system_prompt: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User Prompt Template
                        </label>
                        <textarea
                          rows={8}
                          value={editState.user_prompt_template}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              user_prompt_template: e.target.value,
                            })
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model
                          </label>
                          <select
                            value={editState.model}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                model: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {MODEL_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Tokens
                          </label>
                          <input
                            type="number"
                            min={256}
                            max={200000}
                            value={editState.max_tokens}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                max_tokens: parseInt(e.target.value) || 4096,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Temperature:{" "}
                            <span className="font-normal text-gray-500">
                              {editState.temperature.toFixed(2)}
                            </span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={editState.temperature}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                temperature: parseFloat(e.target.value),
                              })
                            }
                            className="w-full mt-2"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Precise</span>
                            <span>Creative</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSaveNewVersion(prompt.id)}
                          disabled={saving}
                          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save as New Version"}
                        </button>
                        {saveMessage && (
                          <span
                            className={`text-sm ${
                              saveMessage.startsWith("Error")
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Version History Sidebar */}
                    <div className="w-56 shrink-0 border-l border-gray-200 pl-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Version History
                      </h3>
                      {prompt.versions.length === 0 ? (
                        <p className="text-xs text-gray-400">No versions yet</p>
                      ) : (
                        <ul className="space-y-2 max-h-80 overflow-y-auto">
                          {prompt.versions.map((ver) => (
                            <li key={ver.id}>
                              <button
                                onClick={() => handleLoadVersion(ver)}
                                className={`w-full text-left rounded px-3 py-2 text-xs transition ${
                                  selectedVersionId === ver.id
                                    ? "bg-blue-50 border border-blue-200 text-blue-700"
                                    : "hover:bg-gray-50 text-gray-600"
                                }`}
                              >
                                <div className="font-medium">
                                  v{ver.version}
                                  {ver.version === prompt.active_version && (
                                    <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 rounded px-1 py-0.5">
                                      active
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-400 mt-0.5">
                                  {new Date(ver.created_at).toLocaleDateString()}{" "}
                                  {new Date(ver.created_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

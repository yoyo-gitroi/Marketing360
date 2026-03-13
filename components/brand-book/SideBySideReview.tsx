'use client';

import { useState, useEffect } from 'react';
import { Check, RefreshCw, Pencil } from 'lucide-react';

interface SideBySideReviewProps {
  userInput: Record<string, unknown>;
  aiGenerated: Record<string, unknown>;
  onApprove: (finalContent: Record<string, unknown>) => void;
  onEdit: (editedContent: Record<string, unknown>) => void;
}

export default function SideBySideReview({
  userInput,
  aiGenerated,
  onApprove,
  onEdit,
}: SideBySideReviewProps) {
  const [editableAI, setEditableAI] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setEditableAI({ ...aiGenerated });
  }, [aiGenerated]);

  const aiKeys = Object.keys(aiGenerated);

  const handleFieldChange = (key: string, value: string) => {
    setEditableAI((prev) => ({ ...prev, [key]: value }));
  };

  const handleApprove = () => {
    onApprove(editableAI);
  };

  const handleRegenerate = () => {
    onEdit(editableAI);
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value ?? '');
  };

  if (aiKeys.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No AI-generated content yet. Click &quot;Generate with AI&quot; to create content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Review AI-Generated Content
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </button>
          <button
            onClick={handleApprove}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* User Input Column */}
        <div>
          <div className="bg-blue-50 rounded-t-lg px-4 py-2 border border-blue-200 border-b-0">
            <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Your Input
            </h4>
          </div>
          <div className="bg-white border border-blue-200 rounded-b-lg divide-y divide-gray-100">
            {aiKeys.map((key) => (
              <div key={key} className="px-4 py-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {formatKey(key)}
                </label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renderValue(userInput[key]) || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Generated Column (Editable) */}
        <div>
          <div className="bg-purple-50 rounded-t-lg px-4 py-2 border border-purple-200 border-b-0">
            <h4 className="text-sm font-medium text-purple-800 flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              AI Generated (Editable)
            </h4>
          </div>
          <div className="bg-white border border-purple-200 rounded-b-lg divide-y divide-gray-100">
            {aiKeys.map((key) => (
              <div key={key} className="px-4 py-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {formatKey(key)}
                </label>
                <textarea
                  value={renderValue(editableAI[key])}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  rows={Math.max(
                    2,
                    Math.ceil(renderValue(editableAI[key]).length / 60)
                  )}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

type AIStatus = 'pending' | 'generating' | 'generated' | 'approved' | 'error';

interface AIStatusBadgeProps {
  status: AIStatus;
}

const config: Record<
  AIStatus,
  { label: string; bgClass: string; textClass: string; pulse?: boolean }
> = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
  },
  generating: {
    label: 'Generating...',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    pulse: true,
  },
  generated: {
    label: 'Generated',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  approved: {
    label: 'Approved',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  error: {
    label: 'Error',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
};

export default function AIStatusBadge({ status }: AIStatusBadgeProps) {
  const { label, bgClass, textClass, pulse } = config[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5
        text-xs font-medium
        ${bgClass} ${textClass}
        ${pulse ? 'animate-pulse' : ''}
      `}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'pending'
            ? 'bg-gray-400'
            : status === 'generating'
              ? 'bg-yellow-500'
              : status === 'generated'
                ? 'bg-blue-500'
                : status === 'approved'
                  ? 'bg-green-500'
                  : 'bg-red-500'
        }`}
      />
      {label}
    </span>
  );
}

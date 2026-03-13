'use client';

import React from 'react';

export interface ProgressStep {
  number: number;
  label: string;
  key: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
  completedSteps?: number[];
}

export default function ProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  completedSteps = [],
}: ProgressIndicatorProps) {
  return (
    <nav aria-label="Campaign progress" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-1 min-w-max px-2 py-4">
        {steps.map((step, idx) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = completedSteps.includes(step.number);
          const isPast = step.number < currentStep;
          const isClickable = !!onStepClick;

          return (
            <li key={step.key} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`h-0.5 w-6 mx-1 ${
                    isPast || isCompleted ? 'bg-purple-500' : 'bg-gray-200'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center gap-1 min-w-[4.5rem] px-2 py-1 rounded-lg transition-colors
                  ${isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                  ${isCurrent ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50' : ''}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors
                    ${
                      isCurrent
                        ? 'bg-purple-600 text-white'
                        : isCompleted || isPast
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500'
                    }
                  `}
                >
                  {isCompleted || isPast ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>
                <span
                  className={`text-[10px] leading-tight text-center max-w-[5rem] ${
                    isCurrent ? 'font-semibold text-purple-700' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

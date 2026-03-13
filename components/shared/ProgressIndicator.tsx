'use client';

import React from 'react';

export interface ProgressStep {
  label: string;
  key: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepIndex: number, stepKey: string) => void;
}

export default function ProgressIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: ProgressIndicatorProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.key}
              className={`relative flex items-center ${isLast ? '' : 'flex-1'}`}
            >
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => onStepClick?.(index, step.key)}
                className="group flex flex-col items-center focus:outline-none"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Circle */}
                <span
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                    text-sm font-semibold transition-colors
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-purple-600 text-white'
                          : 'border-2 border-gray-300 bg-white text-gray-400'
                    }
                    group-hover:ring-2 group-hover:ring-offset-2
                    ${
                      isCompleted
                        ? 'group-hover:ring-green-400'
                        : isCurrent
                          ? 'group-hover:ring-purple-400'
                          : 'group-hover:ring-gray-300'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${
                      isCompleted
                        ? 'text-green-600'
                        : isCurrent
                          ? 'text-purple-600'
                          : 'text-gray-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div className="mx-2 mt-[-1rem] h-0.5 flex-1">
                  <div
                    className={`h-full ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

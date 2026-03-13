'use client';

import { useState } from 'react';
import { ClipboardCopy, Check, MessageSquare } from 'lucide-react';

const FOUNDER_QUESTIONS = [
  'What inspired you to start this brand? What was the personal or professional moment that sparked the idea?',
  'What problem are you solving that nobody else is solving the right way?',
  'If your brand were a person, how would you describe their personality?',
  'Who is your dream customer? Describe them in as much detail as possible.',
  'What do you want people to feel when they interact with your brand for the first time?',
  'What are the 3 words you never want associated with your brand?',
  'What brands (in any industry) do you admire and why?',
  'What is your unfair advantage -- the thing competitors cannot easily replicate?',
  'Where do you see the brand in 5 years? What does success look like?',
  'What is the one thing about your product/service that customers consistently praise?',
  'What is the biggest misconception people have about your brand or category?',
  'If you had to explain your brand to a 10-year-old, what would you say?',
  'What story from your journey would you share on a podcast to make listeners connect with your brand?',
  'What cultural or societal shift is your brand riding or creating?',
  'If budget were no constraint, what single marketing action would you take tomorrow?',
];

export default function FounderQuestionBank() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (question: string, index: number) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  };

  return (
    <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
      <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900">
            Founder Interview Questions
          </h3>
        </div>
        <p className="text-xs text-purple-600 mt-1">
          Click any question to copy it to your clipboard.
        </p>
      </div>

      <div className="divide-y divide-gray-100 max-h-[calc(100vh-200px)] overflow-y-auto">
        {FOUNDER_QUESTIONS.map((question, idx) => (
          <button
            key={idx}
            onClick={() => copyToClipboard(question, idx)}
            className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mt-0.5">
                {idx + 1}
              </span>
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                {question}
              </p>
              <span className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {copiedIndex === idx ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <ClipboardCopy className="h-4 w-4 text-gray-400" />
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

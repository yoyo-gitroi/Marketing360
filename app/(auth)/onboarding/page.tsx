'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEPARTMENTS = [
  'Creative',
  'Strategy',
  'Account Management',
  'Media',
  'Production',
  'Management',
  'Other',
];

const PLATFORM_USAGE_OPTIONS = [
  'Brand Book Creation',
  'Campaign Planning',
  'Both',
  'Just Reviewing',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [platformUsage, setPlatformUsage] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setFullName(data.user.full_name || '');
        if (data.user.onboarding_completed) {
          router.push('/');
          return;
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  function togglePlatformUsage(option: string) {
    setPlatformUsage((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !jobTitle.trim() || !department || platformUsage.length === 0) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim(),
          department,
          platformUsage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
        return;
      }

      router.push('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome to Marketing 360
          </h1>
          <p className="mt-2 text-gray-600">
            Tell us a bit about yourself to get started.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6"
        >
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Your full name"
            />
          </div>

          {/* Role / Title */}
          <div>
            <label
              htmlFor="jobTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role / Title
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Creative Director"
            />
          </div>

          {/* Department */}
          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Department
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select a department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Usage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How will you use Marketing 360?
            </label>
            <div className="space-y-2">
              {PLATFORM_USAGE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={platformUsage.includes(option)}
                    onChange={() => togglePlatformUsage(option)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}

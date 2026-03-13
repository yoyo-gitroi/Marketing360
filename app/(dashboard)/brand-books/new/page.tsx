'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BRAND_BOOK_SECTIONS = [
  { step_number: 1, section_key: 'brand_overview', title: 'Brand Overview' },
  { step_number: 2, section_key: 'mission_vision', title: 'Mission & Vision' },
  { step_number: 3, section_key: 'target_audience', title: 'Target Audience' },
  { step_number: 4, section_key: 'brand_personality', title: 'Brand Personality' },
  { step_number: 5, section_key: 'visual_identity', title: 'Visual Identity' },
  { step_number: 6, section_key: 'tone_of_voice', title: 'Tone of Voice' },
  { step_number: 7, section_key: 'messaging_framework', title: 'Messaging Framework' },
  { step_number: 8, section_key: 'brand_guidelines', title: 'Brand Guidelines' },
];

export default function NewBrandBookPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get user's org_id
      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) {
        setError('No organization found. Please contact support.');
        setLoading(false);
        return;
      }

      // Create brand book
      const { data: brandBook, error: createError } = await supabase
        .from('brand_books')
        .insert({
          name,
          client_name: clientName || null,
          org_id: profile.org_id,
          created_by: user.id,
          status: 'draft',
          current_step: 1,
        })
        .select('id')
        .single();

      if (createError || !brandBook) {
        setError('Failed to create brand book: ' + (createError?.message ?? 'Unknown error'));
        setLoading(false);
        return;
      }

      // Create 8 brand book sections
      const sections = BRAND_BOOK_SECTIONS.map((section) => ({
        brand_book_id: brandBook.id,
        step_number: section.step_number,
        section_key: section.section_key,
        title: section.title,
        status: 'pending' as const,
        content: null,
      }));

      const { error: sectionsError } = await supabase
        .from('brand_book_sections')
        .insert(sections);

      if (sectionsError) {
        setError('Brand book created but failed to create sections: ' + sectionsError.message);
        setLoading(false);
        return;
      }

      router.push(`/brand-books/${brandBook.id}`);
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Brand Book</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Create a new brand identity document.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g., Acme Corp Brand Book 2026"
          />
        </div>

        <div>
          <label
            htmlFor="clientName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Client Name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g., Acme Corp"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Brand Book'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

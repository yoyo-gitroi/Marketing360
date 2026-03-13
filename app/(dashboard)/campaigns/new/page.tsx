'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface BrandBookOption {
  id: string;
  name: string;
}

const CAMPAIGN_STAGES = [
  { stage_number: 1, stage_key: 'campaign_brief', title: 'Campaign Brief' },
  { stage_number: 2, stage_key: 'audience_research', title: 'Audience Research' },
  { stage_number: 3, stage_key: 'competitive_analysis', title: 'Competitive Analysis' },
  { stage_number: 4, stage_key: 'key_messages', title: 'Key Messages' },
  { stage_number: 5, stage_key: 'content_strategy', title: 'Content Strategy' },
  { stage_number: 6, stage_key: 'channel_plan', title: 'Channel Plan' },
  { stage_number: 7, stage_key: 'creative_concepts', title: 'Creative Concepts' },
  { stage_number: 8, stage_key: 'ad_copy', title: 'Ad Copy' },
  { stage_number: 9, stage_key: 'social_media_plan', title: 'Social Media Plan' },
  { stage_number: 10, stage_key: 'email_sequences', title: 'Email Sequences' },
  { stage_number: 11, stage_key: 'measurement_kpis', title: 'Measurement & KPIs' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [brandBookId, setBrandBookId] = useState('');
  const [brandBookPdf, setBrandBookPdf] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<'existing' | 'pdf' | 'none'>('none');
  const [brandBooks, setBrandBooks] = useState<BrandBookOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBrandBooks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) return;

      const { data } = await supabase
        .from('brand_books')
        .select('id, name')
        .eq('org_id', profile.org_id)
        .order('name');

      setBrandBooks(data ?? []);
    }

    fetchBrandBooks();
  }, [supabase]);

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

      // Handle PDF upload if provided
      let uploadedPdfPath: string | null = null;
      if (sourceType === 'pdf' && brandBookPdf) {
        const fileName = `${profile.org_id}/${Date.now()}-${brandBookPdf.name}`;
        const { error: uploadError } = await supabase.storage
          .from('brand-book-pdfs')
          .upload(fileName, brandBookPdf);

        if (uploadError) {
          setError('Failed to upload PDF: ' + uploadError.message);
          setLoading(false);
          return;
        }
        uploadedPdfPath = fileName;
      }

      // Create campaign
      const { data: campaign, error: createError } = await supabase
        .from('campaigns')
        .insert({
          name,
          client_name: clientName || null,
          org_id: profile.org_id,
          created_by: user.id,
          status: 'draft',
          brand_book_id: sourceType === 'existing' && brandBookId ? brandBookId : null,
          brand_book_pdf_path: uploadedPdfPath,
        })
        .select('id')
        .single();

      if (createError || !campaign) {
        setError('Failed to create campaign: ' + (createError?.message ?? 'Unknown error'));
        setLoading(false);
        return;
      }

      // Create 11 campaign stages
      const stages = CAMPAIGN_STAGES.map((stage) => ({
        campaign_id: campaign.id,
        stage_number: stage.stage_number,
        stage_key: stage.stage_key,
        title: stage.title,
        status: 'pending' as const,
        content: null,
      }));

      const { error: stagesError } = await supabase
        .from('campaign_stages')
        .insert(stages);

      if (stagesError) {
        setError('Campaign created but failed to create stages: ' + stagesError.message);
        setLoading(false);
        return;
      }

      router.push(`/campaigns/${campaign.id}`);
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Create a new marketing campaign.
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
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g., Q1 Product Launch"
          />
        </div>

        <div>
          <label
            htmlFor="clientName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Client Name
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

        {/* Brand book source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Book Source
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="none"
                checked={sourceType === 'none'}
                onChange={() => setSourceType('none')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">No brand book</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="existing"
                checked={sourceType === 'existing'}
                onChange={() => setSourceType('existing')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Link existing brand book
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="pdf"
                checked={sourceType === 'pdf'}
                onChange={() => setSourceType('pdf')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Upload brand book PDF</span>
            </label>
          </div>
        </div>

        {sourceType === 'existing' && (
          <div>
            <label
              htmlFor="brandBook"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Brand Book
            </label>
            <select
              id="brandBook"
              value={brandBookId}
              onChange={(e) => setBrandBookId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a brand book...</option>
              {brandBooks.map((bb) => (
                <option key={bb.id} value={bb.id}>
                  {bb.name}
                </option>
              ))}
            </select>
            {brandBooks.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No brand books available. Create one first.
              </p>
            )}
          </div>
        )}

        {sourceType === 'pdf' && (
          <div>
            <label
              htmlFor="pdfUpload"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Upload PDF
            </label>
            <input
              id="pdfUpload"
              type="file"
              accept=".pdf"
              onChange={(e) => setBrandBookPdf(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
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

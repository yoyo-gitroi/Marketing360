'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Campaign {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  updated_at: string | null;
  brand_book_id: string | null;
  brand_books?: { name: string } | null;
}

const STATUS_OPTIONS = ['all', 'draft', 'in_progress', 'active', 'paused', 'completed'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CampaignsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      setLoading(true);

      // Use /api/me to get org context (bypasses RLS for super admin)
      const meRes = await fetch('/api/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const me = await meRes.json();

      if (!me.org?.id) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('campaigns')
        .select('id, name, client_name, status, updated_at, brand_book_id, brand_books(name)')
        .eq('org_id', me.org.id)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      setCampaigns((data as Campaign[]) ?? []);
      setLoading(false);
    }

    fetchCampaigns();
  }, [statusFilter, supabase, router]);

  async function handleDelete(e: React.MouseEvent, c: Campaign) {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${c.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(c.id);
    try {
      const res = await fetch('/api/campaigns/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id }),
      });

      if (res.ok) {
        setCampaigns((prev) => prev.filter((camp) => camp.id !== c.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete campaign');
      }
    } catch {
      alert('Failed to delete campaign');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your marketing campaigns.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          New Campaign
        </Link>
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'all'
                ? 'All Statuses'
                : opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand Book
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.client_name ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.brand_books?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(c.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, c)}
                      disabled={deletingId === c.id}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingId === c.id ? (
                        'Deleting...'
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No campaigns found.</p>
          <Link
            href="/campaigns/new"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first campaign
          </Link>
        </div>
      )}
    </div>
  );
}

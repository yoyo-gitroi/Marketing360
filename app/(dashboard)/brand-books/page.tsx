'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface BrandBook {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  current_step: number | null;
  updated_at: string | null;
}

const STATUS_OPTIONS = ['all', 'draft', 'in_progress', 'review', 'completed'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
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

export default function BrandBooksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [brandBooks, setBrandBooks] = useState<BrandBook[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrandBooks() {
      setLoading(true);

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
        setLoading(false);
        return;
      }

      let query = supabase
        .from('brand_books')
        .select('id, name, client_name, status, current_step, updated_at')
        .eq('org_id', profile.org_id)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      setBrandBooks(data ?? []);
      setLoading(false);
    }

    fetchBrandBooks();
  }, [statusFilter, supabase, router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Books</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your brand identity documents.
          </p>
        </div>
        <Link
          href="/brand-books/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          New Brand Book
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
      ) : brandBooks.length > 0 ? (
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
                  Current Step
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brandBooks.map((bb) => (
                <tr
                  key={bb.id}
                  onClick={() => router.push(`/brand-books/${bb.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {bb.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {bb.client_name ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        STATUS_COLORS[bb.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {bb.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {bb.current_step != null ? `Step ${bb.current_step} / 8` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(bb.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No brand books found.</p>
          <Link
            href="/brand-books/new"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first brand book
          </Link>
        </div>
      )}
    </div>
  );
}

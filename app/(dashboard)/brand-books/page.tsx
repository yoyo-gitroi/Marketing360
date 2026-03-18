'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BrandBook {
  id: string;
  name: string;
  client_name: string | null;
  client_id: string | null;
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

interface ClientGroup {
  clientName: string;
  brandBooks: BrandBook[];
}

function groupByClient(brandBooks: BrandBook[]): ClientGroup[] {
  const groups: Record<string, BrandBook[]> = {};
  const ungrouped: BrandBook[] = [];

  for (const bb of brandBooks) {
    const key = bb.client_name || '';
    if (key) {
      if (!groups[key]) groups[key] = [];
      groups[key].push(bb);
    } else {
      ungrouped.push(bb);
    }
  }

  const result: ClientGroup[] = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clientName, bbs]) => ({ clientName, brandBooks: bbs }));

  if (ungrouped.length > 0) {
    result.push({ clientName: 'No Client', brandBooks: ungrouped });
  }

  return result;
}

export default function BrandBooksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [brandBooks, setBrandBooks] = useState<BrandBook[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchBrandBooks() {
      setLoading(true);

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
        .from('brand_books')
        .select('id, name, client_name, client_id, status, current_step, updated_at')
        .eq('org_id', me.org.id)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      const bbs = data ?? [];
      setBrandBooks(bbs);

      // Expand all groups by default
      const clientNames = new Set(bbs.map((bb: BrandBook) => bb.client_name || 'No Client'));
      setExpandedClients(clientNames);
      setLoading(false);
    }

    fetchBrandBooks();
  }, [statusFilter, supabase, router]);

  function toggleClient(clientName: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) {
        next.delete(clientName);
      } else {
        next.add(clientName);
      }
      return next;
    });
  }

  async function handleDelete(e: React.MouseEvent, bb: BrandBook) {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${bb.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(bb.id);
    try {
      const res = await fetch('/api/brand-books/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bb.id }),
      });

      if (res.ok) {
        setBrandBooks((prev) => prev.filter((b) => b.id !== bb.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete brand book');
      }
    } catch {
      alert('Failed to delete brand book');
    } finally {
      setDeletingId(null);
    }
  }

  const clientGroups = groupByClient(brandBooks);

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
        <div className="space-y-4">
          {clientGroups.map((group) => (
            <div key={group.clientName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Client Header */}
              <button
                onClick={() => toggleClient(group.clientName)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedClients.has(group.clientName) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">
                    {group.clientName}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    {group.brandBooks.length} brand book{group.brandBooks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {/* Brand Books Table */}
              {expandedClients.has(group.clientName) && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Step
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.brandBooks.map((bb) => (
                      <tr
                        key={bb.id}
                        onClick={() => router.push(`/brand-books/${bb.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">
                          {bb.name}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              STATUS_COLORS[bb.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {bb.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {bb.current_step != null ? `Step ${bb.current_step} / 8` : '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {formatDate(bb.updated_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={(e) => handleDelete(e, bb)}
                            disabled={deletingId === bb.id}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            {deletingId === bb.id ? (
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
              )}
            </div>
          ))}
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

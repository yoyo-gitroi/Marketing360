'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const meRes = await fetch('/api/me');
      if (!meRes.ok) return;
      const me = await meRes.json();

      if (!me.org?.id) return;

      const { data } = await supabase
        .from('clients')
        .select('id, name, industry, website, created_at')
        .eq('org_id', me.org.id)
        .order('created_at', { ascending: false });

      setClients(data ?? []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, clientId: string) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) return;

    setDeletingId(clientId);
    try {
      const res = await fetch('/api/clients/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId }),
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error ?? 'Failed to delete client');
        return;
      }

      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch {
      alert('Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your organization&apos;s clients.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Client
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500 mb-4">No clients yet.</p>
            <Link
              href="/clients/new"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first client
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {client.industry ?? '\u2014'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {client.website ? (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {client.website}
                      </a>
                    ) : (
                      '\u2014'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => handleDelete(e, client.id)}
                      disabled={deletingId === client.id}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === client.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, BookOpen, Megaphone } from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  created_at: string;
}

interface BrandBook {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<ClientData | null>(null);
  const [brandBooks, setBrandBooks] = useState<BrandBook[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function fetchClientData() {
    setLoading(true);
    try {
      // Fetch client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, description, website, industry, created_at')
        .eq('id', clientId)
        .single();

      setClient(clientData as ClientData | null);

      if (!clientData) {
        setLoading(false);
        return;
      }

      // Fetch brand books for this client
      const { data: bbData } = await supabase
        .from('brand_books')
        .select('id, name, status, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      setBrandBooks((bbData as BrandBook[]) ?? []);

      // Fetch campaigns for this client
      const { data: campData } = await supabase
        .from('campaigns')
        .select('id, name, status, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      setCampaigns((campData as Campaign[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch client:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        Loading client...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500 mb-4">Client not found.</p>
        <Link href="/clients" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Back to Clients
        </Link>
      </div>
    );
  }

  const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Client Info */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{client.name}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {client.industry && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</p>
              <p className="text-sm text-gray-900 mt-1">{client.industry}</p>
            </div>
          )}
          {client.website && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</p>
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 mt-1 block"
              >
                {client.website}
              </a>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
            <p className="text-sm text-gray-900 mt-1">
              {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {client.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-gray-700">{client.description}</p>
          </div>
        )}
      </div>

      {/* Brand Books Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold">
              Brand Books{' '}
              <span className="text-sm font-normal text-gray-400">
                ({brandBooks.length})
              </span>
            </h2>
          </div>
          <Link
            href="/brand-books/new"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + New Brand Book
          </Link>
        </div>
        {brandBooks.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No brand books for this client yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {brandBooks.map((bb) => (
              <li key={bb.id}>
                <Link
                  href={`/brand-books/${bb.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bb.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(bb.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[bb.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {bb.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Campaigns Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold">
              Campaigns{' '}
              <span className="text-sm font-normal text-gray-400">
                ({campaigns.length})
              </span>
            </h2>
          </div>
          <Link
            href="/campaigns/new"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + New Campaign
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No campaigns for this client yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {campaigns.map((camp) => (
              <li key={camp.id}>
                <Link
                  href={`/campaigns/${camp.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{camp.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(camp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[camp.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {camp.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

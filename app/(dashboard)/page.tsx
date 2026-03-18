import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/db';
import { redirect } from 'next/navigation';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
  };

  const colorClass = colors[status] ?? 'bg-gray-100 text-gray-700';
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
    >
      {label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/login');
  }

  const db = getAdminClient();

  // Get user profile
  const { data: profile } = await db
    .from('users')
    .select('org_id, full_name')
    .eq('email', session.user.email)
    .single();
  const orgId = profile?.org_id ?? null;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  // Fetch counts and data in parallel
  const [brandBooksRes, campaignsRes, clientsRes, recentBrandBooksRes, recentCampaignsRes] = await Promise.all([
    orgId
      ? db.from('brand_books').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
      : Promise.resolve({ count: 0 }),
    orgId
      ? db.from('campaigns').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
      : Promise.resolve({ count: 0 }),
    orgId
      ? db.from('clients').select('id, name, industry, website', { count: 'exact' }).eq('org_id', orgId).order('created_at', { ascending: false })
      : Promise.resolve({ count: 0, data: [] }),
    orgId
      ? db.from('brand_books').select('id, name, client_name, status, updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    orgId
      ? db.from('campaigns').select('id, name, client_name, status, updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const brandBookCount = brandBooksRes.count ?? 0;
  const campaignCount = campaignsRes.count ?? 0;
  const clientCount = clientsRes.count ?? 0;
  const clients = ('data' in clientsRes ? clientsRes.data : []) ?? [];
  const brandBooks = ('data' in recentBrandBooksRes ? recentBrandBooksRes.data : []) ?? [];
  const campaigns = ('data' in recentCampaignsRes ? recentCampaignsRes.data : []) ?? [];

  return (
    <div>
      {/* Personalized Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hi {firstName}, let&apos;s create something amazing
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Link href="/brand-books" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Brand Books</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{brandBookCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/campaigns" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Campaigns</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{campaignCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/clients" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{clientCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Clients List */}
      {clients && clients.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Clients</h2>
            <Link
              href="/clients/new"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Add Client
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client: { id: string; name: string; industry: string | null; website: string | null }) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {client.industry ?? 'No industry'}
                      {client.website ? ` \u00B7 ${client.website.replace(/^https?:\/\//, '')}` : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/brand-books/new"
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white hover:from-blue-600 hover:to-blue-700 transition-colors"
        >
          <p className="font-semibold">New Brand Book</p>
          <p className="text-blue-100 text-sm mt-1">Create a brand identity document</p>
        </Link>
        <Link
          href="/campaigns/new"
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white hover:from-purple-600 hover:to-purple-700 transition-colors"
        >
          <p className="font-semibold">New Campaign</p>
          <p className="text-purple-100 text-sm mt-1">Plan a marketing campaign</p>
        </Link>
        <Link
          href="/clients/new"
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white hover:from-green-600 hover:to-green-700 transition-colors"
        >
          <p className="font-semibold">New Client</p>
          <p className="text-green-100 text-sm mt-1">Add a client to your workspace</p>
        </Link>
      </div>

      {/* Recent Brand Books */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Brand Books
          </h2>
          <Link
            href="/brand-books"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all
          </Link>
        </div>

        {brandBooks && brandBooks.length > 0 ? (
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
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brandBooks.map((bb: { id: string; name: string; client_name: string | null; status: string; updated_at: string | null }) => (
                  <tr
                    key={bb.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/brand-books/${bb.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {bb.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {bb.client_name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={bb.status ?? 'draft'} />
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
            <p className="text-gray-500 text-sm">No brand books yet.</p>
            <Link
              href="/brand-books/new"
              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first brand book
            </Link>
          </div>
        )}
      </section>

      {/* Recent Campaigns */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Campaigns
          </h2>
          <Link
            href="/campaigns"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all
          </Link>
        </div>

        {campaigns && campaigns.length > 0 ? (
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
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((c: { id: string; name: string; client_name: string | null; status: string; updated_at: string | null }) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.client_name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status ?? 'draft'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(c.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No campaigns yet.</p>
            <Link
              href="/campaigns/new"
              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first campaign
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

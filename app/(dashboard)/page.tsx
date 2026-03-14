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

  // Get user's org_id
  let orgId: string | null = null;
  const { data: profile } = await db
    .from('users')
    .select('org_id')
    .eq('email', session.user.email)
    .single();
  orgId = profile?.org_id ?? null;

  // Fetch recent brand books
  const { data: brandBooks } = orgId
    ? await db
        .from('brand_books')
        .select('id, name, client_name, status, updated_at, created_by')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(5)
    : { data: [] };

  // Fetch recent campaigns
  const { data: campaigns } = orgId
    ? await db
        .from('campaigns')
        .select('id, name, client_name, status, updated_at, created_by')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back. Here&apos;s what&apos;s been happening.
        </p>
      </div>

      {/* Recent Brand Books */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Brand Books
          </h2>
          <Link
            href="/brand-books/new"
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            New Brand Book
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
                {brandBooks.map((bb) => (
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

        {brandBooks && brandBooks.length > 0 && (
          <div className="mt-2 text-right">
            <Link
              href="/brand-books"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all brand books
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
            href="/campaigns/new"
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            New Campaign
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
                {campaigns.map((c) => (
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

        {campaigns && campaigns.length > 0 && (
          <div className="mt-2 text-right">
            <Link
              href="/campaigns"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all campaigns
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  Users,
  UserCircle,
  BookOpen,
  Megaphone,
} from 'lucide-react';

type Tab = 'users' | 'clients' | 'brand-books' | 'campaigns';

interface OrgData {
  org: { id: string; name: string; slug: string; created_at: string };
  users: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  }[];
  clients: { name: string; industry: string }[];
  brandBooks: {
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    current_step: number;
    created_at: string;
    updated_at: string;
  }[];
  campaigns: {
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    current_stage: number;
    created_at: string;
    updated_at: string;
  }[];
}

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

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-700',
  };
  const colorClass = colors[role] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClass}`}
    >
      {role}
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

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'clients', label: 'Clients', icon: UserCircle },
  { key: 'brand-books', label: 'Brand Books', icon: BookOpen },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
];

export default function AdminOrgDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrgData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('users');

  useEffect(() => {
    async function init() {
      try {
        // Verify super admin
        const meRes = await fetch('/api/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const me = await meRes.json();
        if (!me.isSuperAdmin) {
          router.push('/');
          return;
        }

        // Fetch org data
        const res = await fetch(`/api/admin/orgs/${orgId}`);
        if (!res.ok) throw new Error('Failed to load organization');
        const orgData = await res.json();
        setData(orgData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 text-sm">{error ?? 'Organization not found'}</p>
        <Link href="/admin" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium">
          Back to Admin Panel
        </Link>
      </div>
    );
  }

  const { org, users, clients, brandBooks, campaigns } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Panel
        </Link>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {org.slug} &middot; Created {formatDate(org.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Users', count: users.length, icon: Users },
          { label: 'Clients', count: clients.length, icon: UserCircle },
          { label: 'Brand Books', count: brandBooks.length, icon: BookOpen },
          { label: 'Campaigns', count: campaigns.length, icon: Megaphone },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <item.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'users' && (
        <UsersTable users={users} />
      )}
      {activeTab === 'clients' && (
        <ClientsTable clients={clients} />
      )}
      {activeTab === 'brand-books' && (
        <BrandBooksTable brandBooks={brandBooks} />
      )}
      {activeTab === 'campaigns' && (
        <CampaignsTable campaigns={campaigns} />
      )}
    </div>
  );
}

/* ---------- Sub-tables ---------- */

function UsersTable({
  users,
}: {
  users: OrgData['users'];
}) {
  if (users.length === 0) {
    return <EmptyState message="No users in this organization." />;
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
              <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientsTable({ clients }: { clients: OrgData['clients'] }) {
  if (clients.length === 0) {
    return <EmptyState message="No clients found for this organization." />;
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {clients.map((c, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{c.industry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrandBooksTable({
  brandBooks,
}: {
  brandBooks: OrgData['brandBooks'];
}) {
  if (brandBooks.length === 0) {
    return <EmptyState message="No brand books in this organization." />;
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {brandBooks.map((bb) => (
            <tr key={bb.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/brand-books/${bb.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {bb.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{bb.client_name ?? '-'}</td>
              <td className="px-4 py-3"><StatusBadge status={bb.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-700">{bb.current_step}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(bb.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsTable({
  campaigns,
}: {
  campaigns: OrgData['campaigns'];
}) {
  if (campaigns.length === 0) {
    return <EmptyState message="No campaigns in this organization." />;
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{c.client_name ?? '-'}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

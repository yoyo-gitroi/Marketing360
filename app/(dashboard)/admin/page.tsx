'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building2, Users, BookOpen, Megaphone, UserCircle } from 'lucide-react';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  memberCount: number;
  brandBookCount: number;
  campaignCount: number;
  clientCount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch all orgs with counts
        const res = await fetch('/api/admin/orgs');
        if (!res.ok) throw new Error('Failed to load organizations');
        const data = await res.json();
        setOrgs(data.orgs ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-500 mt-1">
          Overview of all organizations across the platform.
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Organizations</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{orgs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {orgs.reduce((sum, o) => sum + o.memberCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Brand Books</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {orgs.reduce((sum, o) => sum + o.brandBookCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Megaphone className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Campaigns</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {orgs.reduce((sum, o) => sum + o.campaignCount, 0)}
          </p>
        </div>
      </div>

      {/* Orgs table */}
      {orgs.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Users className="w-4 h-4 inline-block mr-1" />Members
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 inline-block mr-1" />Brand Books
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Megaphone className="w-4 h-4 inline-block mr-1" />Campaigns
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <UserCircle className="w-4 h-4 inline-block mr-1" />Clients
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/org/${org.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/org/${org.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {org.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {org.memberCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {org.brandBookCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {org.campaignCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center">
                    {org.clientCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">No organizations found.</p>
        </div>
      )}
    </div>
  );
}

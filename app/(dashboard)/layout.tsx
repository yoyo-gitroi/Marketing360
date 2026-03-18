'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Megaphone,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface UserContext {
  user: { id: string; email: string; full_name: string; onboarding_completed: boolean };
  org: { id: string; name: string; slug: string } | null;
  role: string;
  isSuperAdmin: boolean;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brand-books', label: 'Brand Books', icon: BookOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) { router.push('/login'); return; }
        const data: UserContext = await res.json();
        if (!data.user.onboarding_completed) { router.push('/onboarding'); return; }
        setCtx(data);
      } catch {
        router.push('/login');
      }
    }
    loadContext();
  }, [router]);

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const initials = ctx?.user.full_name
    ? ctx.user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Sidebar ── */}
      <aside
        className={`
          relative bg-white border-r border-gray-200 flex flex-col flex-shrink-0
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[60px]' : 'w-64'}
        `}
      >
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-500" />
            : <ChevronLeft className="w-3 h-3 text-gray-500" />
          }
        </button>

        {/* Branding */}
        <div className={`h-16 flex items-center border-b border-gray-200 overflow-hidden ${collapsed ? 'px-3 justify-center' : 'px-6'}`}>
          {collapsed ? (
            <span className="text-lg font-black text-indigo-600">M</span>
          ) : (
            <Link href="/" className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Marketing 360
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center rounded-md text-sm font-medium transition-colors
                  ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}
                  ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}

          {ctx?.isSuperAdmin && (
            <Link
              href="/admin"
              title={collapsed ? 'Admin Panel' : undefined}
              className={`
                flex items-center rounded-md text-sm font-medium transition-colors
                ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}
                ${isActive('/admin')
                  ? 'bg-red-50 text-red-700'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                }
              `}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Admin Panel</span>}
            </Link>
          )}
        </nav>

        {/* User footer */}
        <div className={`border-t border-gray-200 p-3 overflow-hidden`}>
          {!collapsed && ctx?.isSuperAdmin && (
            <div className="mb-2 flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
              <Shield className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span className="text-xs font-medium text-red-700 whitespace-nowrap">Super Admin</span>
            </div>
          )}

          {collapsed ? (
            /* Collapsed: just avatar + sign out stacked */
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {ctx?.user.full_name ?? 'Loading...'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {ctx?.user.email ?? ''}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

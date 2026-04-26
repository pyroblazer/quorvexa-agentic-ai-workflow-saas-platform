'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/workflows', label: 'Workflows' },
  { href: '/agents', label: 'AI Agents' },
  { href: '/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-live="polite" aria-busy="true">
        <div className="text-muted-foreground">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar navigation */}
      <nav
        className="w-64 bg-card border-r border-border flex flex-col"
        aria-label="Main navigation"
      >
        <div className="p-4 border-b border-border">
          <span className="text-lg font-bold text-primary">Quorvexa</span>
        </div>

        <ul className="flex-1 p-3 space-y-1" role="list">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => void logout()}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sign out of your account"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background" id="main-content">
        {children}
      </main>
    </div>
  );
}

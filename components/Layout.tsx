'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import { Home, Trophy, Wallet, Users, Shield, LogOut, LogIn, UserPlus, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import Mascot from './Mascot';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();
  const pathname              = usePathname();

  const publicRoutes  = useMemo(() => new Set(['/', '/login', '/register', '/careers']), []);
  const isPublicRoute = publicRoutes.has(pathname);

  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else if (!isPublicRoute) {
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, [isPublicRoute, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Mascot className="w-20 h-20" />
        <p className="text-sm font-black tracking-widest text-gray-400">BETS PRO</p>
        <div className="w-5 h-5 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPublicRoute) return null;

  const navItems: { name: string; path: string; icon: React.ElementType }[] = [
    { name: 'Home',     path: '/',          icon: Home     },
    { name: 'Sports',   path: '/sports',    icon: Trophy   },
    { name: 'Wallet',   path: '/wallet',    icon: Wallet   },
    { name: 'Refer',    path: '/referrals', icon: Users    },
    { name: 'Jobs',     path: '/careers',   icon: Briefcase },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/8 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Mascot className="w-8 h-8" />
            <span className="font-black tracking-wider text-sm text-white">BETS PRO</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="bg-surface border border-white/8 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-white font-black text-sm">{user?.balance?.toFixed(2) ?? '0.00'}</span>
                <span className="text-[11px] font-bold text-gray-500">USDT</span>
              </div>
              <Link
                href="/wallet"
                className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              >
                + Deposit
              </Link>
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-surface border border-white/8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"    className="bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:border-white/20 transition-colors">
                <LogIn size={13} /> Login
              </Link>
              <Link href="/register" className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 hover:bg-accent/90 transition-colors">
                <UserPlus size={13} /> Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/8 z-50">
        <div className="max-w-lg mx-auto px-1 py-1 flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon     = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all relative ${
                  isActive ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <Icon size={18} />
                <span className={`text-[9px] font-bold mt-1 ${isActive ? 'text-primary' : 'text-gray-600'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

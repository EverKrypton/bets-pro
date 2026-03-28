'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import { Home, Trophy, Wallet, Users, Shield, LogOut, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import Mascot from './Mascot';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();
  const pathname              = usePathname();

  const publicRoutes  = useMemo(() => new Set(['/', '/login', '/register']), []);
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
      } catch (error) {
        console.error('Init error:', error);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/40 border-t-primary animate-spin mb-4" />
          <Mascot className="w-20 h-20 mb-3" />
          <h1 className="text-3xl font-black tracking-widest mb-2 text-white">FOXY CASH</h1>
        </div>
      </div>
    );
  }

  if (!user && !isPublicRoute) return null;

  const navItems: { name: string; path: string; icon: React.ElementType }[] = [
    { name: 'Home',      path: '/',          icon: Home   },
    { name: 'Sports',    path: '/sports',    icon: Trophy },
    { name: 'Wallet',    path: '/wallet',    icon: Wallet },
    { name: 'Referrals', path: '/referrals', icon: Users  },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-20">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Mascot className="w-10 h-10" />
          <span className="font-black tracking-wider text-lg text-white">FOXY CASH</span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="bg-surface border border-white/5 px-4 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-white font-black">{user?.balance?.toFixed(2) ?? '0.00'}</span>
              <span className="text-xs font-bold text-accent">USDT</span>
            </div>
            <button onClick={handleLogout} className="bg-surface border border-white/10 text-gray-300 p-2 rounded-xl" aria-label="Logout">
              <LogOut size={16} />
            </button>
            <Link href="/wallet" className="bg-gradient-to-r from-accent to-accent text-white p-2 rounded-xl" aria-label="Wallet">
              <Wallet size={18} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login"    className="bg-surface border border-white/10 px-3 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2"><LogIn    size={14} /> Login</Link>
            <Link href="/register" className="bg-gradient-to-r from-primary to-accent text-background px-3 py-2 rounded-xl text-sm font-black inline-flex items-center gap-2"><UserPlus size={14} /> Register</Link>
          </div>
        )}
      </header>

      <main className="flex-1 p-4">{children}</main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/5 px-2 py-2 flex justify-around items-center z-50">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon     = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon size={20} className="mb-1" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

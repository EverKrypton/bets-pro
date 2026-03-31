'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import {
  Home, Trophy, Wallet, Users, Shield, LogOut, LogIn,
  UserPlus, Briefcase, Menu, X, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Mascot from './Mascot';

type Role = 'user' | 'mod' | 'recruiter' | 'admin';

function hasAdminAccess(role: Role | undefined): boolean {
  return role === 'admin' || role === 'mod' || role === 'recruiter';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sideNav, setSideNav] = useState(false);
  const router                = useRouter();
  const pathname              = usePathname();

  const publicRoutes  = useMemo(() => new Set(['/', '/login', '/register', '/careers']), []);
  const isPublicRoute = publicRoutes.has(pathname);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) { const d = await res.json(); setUser(d.user); }
        else if (!isPublicRoute) { router.replace('/login'); return; }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [isPublicRoute, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Mascot className="w-16 h-16" />
        <p className="text-xs font-black tracking-[0.3em] text-gray-500">BETS PRO</p>
        <div className="w-5 h-5 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user && !isPublicRoute) return null;

  const showAdmin = hasAdminAccess(user?.role);

  const navItems = [
    { name: 'Home',   path: '/',          icon: Home      },
    { name: 'Sports', path: '/sports',    icon: Trophy    },
    { name: 'Wallet', path: '/wallet',    icon: Wallet    },
    { name: 'Refer',  path: '/referrals', icon: Users     },
    { name: 'Jobs',   path: '/careers',   icon: Briefcase },
  ];

  const sideItems = [
    { label: 'Sports Betting', path: '/sports',    icon: Trophy    },
    { label: 'My Wallet',      path: '/wallet',    icon: Wallet    },
    { label: 'Referrals',      path: '/referrals', icon: Users     },
    { label: 'Careers',        path: '/careers',   icon: Briefcase },
    ...(showAdmin ? [{ label: 'Admin Panel', path: '/admin', icon: Shield }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-20">

      {/* Side nav overlay */}
      <AnimatePresence>
        {sideNav && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              onClick={() => setSideNav(false)}
            />
            <motion.div
              initial={{x:-300}} animate={{x:0}} exit={{x:-300}}
              transition={{type:'spring',damping:28,stiffness:300}}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#0d1117] border-r border-white/8 z-50 flex flex-col"
            >
              {/* Side header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <Mascot className="w-9 h-9" />
                  <div>
                    <p className="font-black text-sm tracking-wider">BETS PRO</p>
                    {user && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-gray-500 font-bold">{user.username || user.email}</p>
                        {user.role !== 'user' && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                            {user.role}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSideNav(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                  <X size={15}/>
                </button>
              </div>

              {/* Balance */}
              {user && (
                <div className="mx-4 mt-4 bg-surface border border-white/8 rounded-xl p-4">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Balance</p>
                  <p className="text-2xl font-black">{user.balance?.toFixed(2)} <span className="text-accent text-base">USDT</span></p>
                  <Link href="/wallet" onClick={() => setSideNav(false)}
                    className="mt-3 w-full bg-accent text-white py-2 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1 hover:bg-accent/90 transition-colors"
                  >+ Deposit</Link>
                </div>
              )}

              {/* Nav items */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {sideItems.map(item => {
                  const isActive = pathname === item.path;
                  return (
                    <button key={item.path} onClick={() => { router.push(item.path); setSideNav(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                        isActive ? 'bg-accent/15 text-accent border border-accent/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon size={17}/>
                      <span className="font-bold text-sm">{item.label}</span>
                      <ChevronRight size={14} className="ml-auto opacity-40"/>
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-4 py-4 border-t border-white/8">
                {user ? (
                  <button onClick={() => { handleLogout(); setSideNav(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    <LogOut size={16}/> <span className="font-bold text-sm">Sign Out</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/login" onClick={() => setSideNav(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-center text-xs font-black">Login</Link>
                    <Link href="/register" onClick={() => setSideNav(false)} className="flex-1 py-2.5 rounded-xl bg-accent text-white text-center text-xs font-black">Register</Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top header */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/8 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => setSideNav(true)} className="w-9 h-9 rounded-xl bg-surface border border-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
            <Menu size={16}/>
          </button>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Mascot className="w-7 h-7" />
            <span className="font-black text-sm tracking-wider">BETS PRO</span>
          </Link>
          <div className="flex-1" />
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/wallet" className="flex items-center gap-1.5 bg-surface border border-white/8 px-3 py-1.5 rounded-lg hover:border-accent/40 transition-colors">
                <Wallet size={13} className="text-accent"/>
                <span className="font-black text-sm">{user.balance?.toFixed(2)}</span>
                <span className="text-[10px] text-gray-500 font-bold">USDT</span>
              </Link>
              <Link href="/wallet" className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-accent/90 transition-colors">+</Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:border-white/20 transition-colors flex items-center gap-1">
                <LogIn size={12}/> Login
              </Link>
              <Link href="/register" className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-accent/90 transition-colors flex items-center gap-1">
                <UserPlus size={12}/> Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1117]/95 backdrop-blur-sm border-t border-white/8 z-40">
        <div className="max-w-lg mx-auto flex justify-around items-stretch">
          {navItems.map(item => {
            const isActive = pathname === item.path;
            return (
              <button key={item.name} onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center py-2 px-2 min-w-0 flex-1 relative transition-all ${
                  isActive ? 'text-accent' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {isActive && (
                  <motion.div layoutId="nav-active"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full"
                  />
                )}
                <item.icon size={18}/>
                <span className={`text-[9px] font-bold mt-0.5 ${isActive ? 'text-accent' : 'text-gray-600'}`}>{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

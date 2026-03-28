'use client';

import Layout                  from '@/components/Layout';
import { Trophy, ArrowRight, Zap } from 'lucide-react';
import Link                    from 'next/link';
import { useState, useEffect } from 'react';
import Mascot                  from '@/components/Mascot';

export default function Home() {
  const [liveBets, setLiveBets] = useState<any[]>([]);

  useEffect(() => {
    setLiveBets(
      [1, 2, 3, 4, 5].map((i) => ({
        id:     i,
        user:   `User${Math.floor(Math.random() * 9000) + 1000}`,
        amount: (Math.random() * 200 + 10).toFixed(2),
        team:   ['Real Madrid', 'Barcelona', 'Man City', 'PSG', 'Bayern'][i - 1],
        odds:   (Math.random() * 3 + 1.2).toFixed(2),
      })),
    );
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-background border border-white/5 p-6">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-accent/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-secondary/20 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <Mascot className="w-20 h-20 flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-2">
                Welcome to{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-secondary">
                  Bets Pro
                </span>
              </h1>
              <p className="text-gray-400 mb-5 text-sm font-medium">
                Crypto sportsbook with instant USDT payouts. Bet on real matches, win big.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/sports"
                  className="bg-gradient-to-r from-accent to-accent text-white font-black px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(225,44,76,0.3)]"
                >
                  Bet Now <ArrowRight size={16} />
                </Link>
                <Link
                  href="/wallet"
                  className="bg-surface border border-white/10 text-white font-black px-5 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm"
                >
                  Deposit
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Min Deposit', value: '10 USDT' },
            { label: 'Min Withdraw', value: '10 USDT' },
            { label: 'Referral Bonus', value: 'Up to 30%' },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-2xl border border-white/5 p-3 text-center">
              <p className="text-xs text-gray-400 font-bold mb-1">{s.label}</p>
              <p className="font-black text-sm text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Sportsbook banner */}
        <Link
          href="/sports"
          className="group relative overflow-hidden rounded-2xl bg-surface border border-white/5 p-5 flex items-center gap-4 hover:border-accent/50 transition-all block"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent flex items-center justify-center shadow-[0_0_20px_rgba(225,44,76,0.3)] -rotate-3 group-hover:-rotate-6 transition-transform relative z-10">
            <Trophy className="text-white" size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-lg tracking-wide">SPORTSBOOK</h3>
            <p className="text-xs text-gray-400 font-medium">Real matches · Live odds · Instant settlement</p>
          </div>
          <ArrowRight className="ml-auto text-gray-600 group-hover:text-accent transition-colors relative z-10" />
        </Link>

        {/* Live feed */}
        <div>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Zap className="text-primary" size={20} /> Recent Bets
          </h2>
          <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {liveBets.map((bet) => (
                <div key={bet.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center text-xs font-black text-accent">
                      {bet.id}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{bet.user}</p>
                      <p className="text-xs text-gray-400">{bet.team} @ {bet.odds}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">+{bet.amount} USDT</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Just now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

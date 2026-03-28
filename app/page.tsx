'use client';

import Layout                  from '@/components/Layout';
import { Trophy, ArrowRight, Zap, Users } from 'lucide-react';
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
        odds:   (Math.random() * 2 + 1.2).toFixed(2),
      })),
    );
  }, []);

  return (
    <Layout>
      <div className="space-y-5">

        {/* Hero */}
        <div className="bg-surface border border-white/8 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <Mascot className="w-16 h-16 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight leading-tight">
                The Biggest Football Sportsbook
              </h1>
              <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                Real matches. Real odds. Instant USDT payouts.
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  href="/sports"
                  className="flex-1 bg-accent text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-accent/90 active:scale-95 transition-all"
                >
                  Bet Now <ArrowRight size={15} />
                </Link>
                <Link
                  href="/wallet"
                  className="flex-1 bg-background border border-white/10 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center hover:border-white/20 active:scale-95 transition-all"
                >
                  Deposit
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Min Deposit',  value: '10 USDT'   },
            { label: 'Min Withdraw', value: '10 USDT'   },
            { label: 'Referral',     value: 'Up to 30%' },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-white/8 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
              <p className="font-black text-sm text-primary mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Sportsbook CTA */}
        <Link
          href="/sports"
          className="group bg-surface border border-white/8 rounded-2xl p-5 flex items-center gap-4 hover:border-accent/30 active:scale-[0.98] transition-all block"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
            <Trophy className="text-accent" size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-base">SPORTSBOOK</p>
            <p className="text-xs text-gray-500 mt-0.5">Real matches · Live odds · Double chance markets</p>
          </div>
          <ArrowRight className="ml-auto text-gray-600 group-hover:text-white shrink-0 transition-colors" size={18} />
        </Link>

        {/* Careers CTA */}
        <Link
          href="/careers"
          className="group bg-surface border border-white/8 rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 active:scale-[0.98] transition-all block"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Users className="text-primary" size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-base">WORK WITH US</p>
            <p className="text-xs text-gray-500 mt-0.5">Community manager · Up to $1,000/mo</p>
          </div>
          <ArrowRight className="ml-auto text-gray-600 group-hover:text-white shrink-0 transition-colors" size={18} />
        </Link>

        {/* Live bets feed */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Zap size={14} className="text-primary" /> Recent Bets
          </h2>
          <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
            {liveBets.map((bet) => (
              <div key={bet.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-black text-accent shrink-0">
                    {bet.id}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{bet.user}</p>
                    <p className="text-xs text-gray-500 truncate">{bet.team} @ {bet.odds}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-black text-primary">+{bet.amount}</p>
                  <p className="text-[10px] text-gray-600 uppercase font-bold">USDT</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}

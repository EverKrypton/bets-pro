'use client';

import Layout from '@/components/Layout';
import { Trophy, ArrowRight, Zap, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Mascot from '@/components/Mascot';

interface RecentBet {
  _id: string;
  details: { homeTeam?: string; awayTeam?: string; selection?: string; odd?: number; };
  amount: number;
  status: 'pending'|'won'|'lost'|'refunded';
}

const SEL_LABEL: Record<string,string> = {
  home:'Home', draw:'Draw', away:'Away', '1x':'1X', 'x2':'X2', '12':'12',
};
const STATUS_COLOR: Record<string,string> = {
  won:'text-green-400', lost:'text-red-400', pending:'text-yellow-400', refunded:'text-blue-400',
};

export default function Home() {
  const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
  const [minDeposit, setMinDeposit] = useState(10);

  useEffect(() => {
    fetch('/api/bets/recent').then(r => r.ok ? r.json() : { bets:[] }).then(d => setRecentBets(d.bets ?? [])).catch(()=>{});
    fetch('/api/settings/public').then(r => r.ok ? r.json() : {}).then(d => setMinDeposit(d.minDepositAmount ?? 10)).catch(()=>{});
  }, []);

  return (
    <Layout>
      <div className="space-y-4">

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-surface to-[#1a1f27] border border-white/10 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center shrink-0">
              <Mascot className="w-10 h-10" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black tracking-tight leading-tight">Bets Pro</h1>
              <p className="text-gray-500 text-xs leading-relaxed">Real matches · Real odds · Instant payouts</p>
            </div>
          </div>
          
          {/* Action Buttons - 1win style */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/sports"
              className="relative overflow-hidden bg-gradient-to-r from-accent to-red-600 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-accent/25"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <Trophy size={16} className="relative" />
              <span className="relative">Bet Now</span>
            </Link>
            <Link href="/wallet"
              className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/25"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <span className="relative">+ Deposit</span>
            </Link>
          </div>
        </div>

        {/* Stats - Small compact cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:'Deposit', value:`${minDeposit}`, unit:'USDT', color:'text-green-400' },
            { label:'Withdraw', value:'10', unit:'USDT', color:'text-blue-400' },
            { label:'Referral', value:'30%', unit:'', color:'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-white/8 rounded-xl p-2 text-center">
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
              <p className={`font-black text-sm mt-0.5 ${s.color}`}>{s.value} <span className="text-[10px] text-gray-500">{s.unit}</span></p>
            </div>
          ))}
        </div>

        {/* Sportsbook CTA Card */}
        <Link href="/sports"
          className="group bg-gradient-to-r from-surface to-[#1a1f27] border border-white/8 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform block overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Trophy className="text-white" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm">SPORTSBOOK</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Live odds · Double chance · Money back</p>
          </div>
          <ArrowRight className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 shrink-0 transition-all" size={16} />
        </Link>

        {/* Careers CTA Card */}
        <Link href="/careers"
          className="group bg-gradient-to-r from-surface to-[#1a1f27] border border-white/8 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform block overflow-hidden"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="text-primary" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm">EARN WITH US</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Promote & earn up to $1,000/mo</p>
          </div>
          <ArrowRight className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 shrink-0 transition-all" size={16} />
        </Link>

        {/* Recent Bets */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
            <Zap size={12} className="text-primary" /> Recent Activity
          </h2>
          <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
            {recentBets.length === 0
              ? <p className="text-center text-gray-600 text-xs py-6">No bets yet — be the first!</p>
              : recentBets.map(bet => (
                <div key={bet._id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{bet.details?.homeTeam ?? '?'} vs {bet.details?.awayTeam ?? '?'}</p>
                    <p className="text-[10px] text-gray-500">
                      {SEL_LABEL[bet.details?.selection ?? ''] ?? bet.details?.selection ?? '?'} · {Number(bet.details?.odd ?? 0).toFixed(2)}x
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-primary">{Number(bet.amount).toFixed(2)}</p>
                    <p className={`text-[9px] font-black uppercase ${STATUS_COLOR[bet.status] ?? 'text-gray-400'}`}>{bet.status}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

      </div>
    </Layout>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, Copy, Gift, CheckCircle2 } from 'lucide-react';

export default function ReferralsPage() {
  const [copied,   setCopied]   = useState(false);
  const [refCode,  setRefCode]  = useState('');
  const [stats,    setStats]    = useState({ count: 0, earned: 0 });

  useEffect(() => {
    (async () => {
      const res  = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      setRefCode(data.user?.myReferralCode ?? '');

      const txRes  = await fetch('/api/transactions');
      if (!txRes.ok) return;
      const txData = await txRes.json();
      const referrals = (txData.transactions ?? []).filter((t: any) => t.type === 'referral');
      setStats({ count: referrals.length, earned: referrals.reduce((s: number, t: any) => s + t.amount, 0) });
    })();
  }, []);

  const origin       = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = refCode ? `${origin}/register?ref=${refCode}` : '';

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-wider">
          <Users className="text-accent" /> Referrals
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface rounded-2xl border border-white/8 p-4">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Referrals</p>
            <p className="text-2xl font-black">{stats.count}</p>
          </div>
          <div className="bg-surface rounded-2xl border border-white/8 p-4">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-2xl font-black text-accent">{stats.earned.toFixed(2)} <span className="text-sm">USDT</span></p>
          </div>
        </div>

        <div className="bg-surface border border-white/8 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Gift className="text-accent" size={22} />
            </div>
            <div>
              <h2 className="font-black text-base uppercase tracking-wider">Invite & Earn</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="text-white font-bold">5%</span> per deposit ·{' '}
                <span className="text-primary font-bold">30%</span> on deposits ≥ 100 USDT
              </p>
            </div>
          </div>

          {/* Your code */}
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Your Code</p>
            <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
              <span className="font-mono font-black text-lg text-primary flex-1">{refCode || '—'}</span>
              <button onClick={() => copy(refCode)}
                className="bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-white/5 flex items-center gap-1"
              >
                {copied ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={11}/> Copied!</span> : <><Copy size={11}/> Copy</>}
              </button>
            </div>
          </div>

          {/* Full link */}
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Full Invite Link</p>
            <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
              <span className="text-xs text-gray-400 font-medium flex-1 truncate">{referralLink || '—'}</span>
              <button onClick={() => copy(referralLink)}
                className="bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-white/5 flex items-center gap-1 shrink-0"
              >
                <Copy size={11}/> Copy
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider">How it works</h3>
          {[
            { n:1, title:'Share your code or link', desc:'Send your unique referral code or link to friends.' },
            { n:2, title:'Friends join & deposit',  desc:'They register with your code and make their first deposit.' },
            { n:3, title:'You earn instantly',      desc:'5% bonus per deposit, 30% if they deposit 100+ USDT.' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-4 bg-surface rounded-2xl border border-white/8 p-4">
              <div className="w-8 h-8 rounded-xl bg-background border border-white/10 flex items-center justify-center font-black text-accent shrink-0">{step.n}</div>
              <div>
                <h4 className="font-black text-sm mb-0.5">{step.title}</h4>
                <p className="text-xs text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

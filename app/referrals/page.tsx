'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, Copy, Gift } from 'lucide-react';

export default function ReferralsPage() {
  const [copied, setCopied]   = useState(false);
  const [refCode, setRefCode] = useState('');
  const [stats, setStats]     = useState({ count: 0, earned: 0 });

  useEffect(() => {
    (async () => {
      const res  = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      setRefCode(data.user?.email || '');

      const txRes  = await fetch('/api/transactions');
      if (!txRes.ok) return;
      const txData = await txRes.json();
      const referrals = (txData.transactions ?? []).filter((t: any) => t.type === 'referral');
      setStats({
        count:  referrals.length,
        earned: referrals.reduce((s: number, t: any) => s + t.amount, 0),
      });
    })();
  }, []);

  const origin      = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = `${origin}/register?ref=${encodeURIComponent(refCode)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
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
          <div className="bg-surface rounded-2xl border border-white/5 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-accent/10 blur-xl rounded-full" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Referrals</p>
            <p className="text-2xl font-black">{stats.count}</p>
          </div>
          <div className="bg-surface rounded-2xl border border-white/5 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-secondary/10 blur-xl rounded-full" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-2xl font-black text-secondary">{stats.earned.toFixed(2)} <span className="text-sm">USDT</span></p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-surface to-background border border-white/5 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-accent/20 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(225,44,76,0.3)] rotate-3">
              <Gift className="text-white" size={32} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider mb-2">Invite Friends, Earn USDT</h2>
            <p className="text-sm text-gray-400 font-medium">
              Earn <span className="text-white font-bold">5%</span> on every deposit your friends make.{' '}
              Get <span className="text-primary font-bold">30%</span> if they deposit 100 USDT or more!
            </p>
          </div>

          <div className="bg-background rounded-xl border border-white/5 p-1 flex items-center relative z-10">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-transparent px-4 py-3 outline-none text-sm font-bold text-gray-400"
            />
            <button
              onClick={copyToClipboard}
              className="bg-surface hover:bg-white/5 border border-white/5 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-black uppercase tracking-wider transition-colors"
            >
              {copied ? <span className="text-accent">Copied!</span> : <><Copy size={16} /> Copy</>}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-wider mb-4">How it works</h3>
          <div className="space-y-3">
            {[
              { n: 1, title: 'Share your link',        desc: 'Send your unique referral link to friends.' },
              { n: 2, title: 'Friends join & deposit', desc: 'They sign up and make their first deposit.' },
              { n: 3, title: 'You earn instantly',     desc: '5% bonus on every deposit, 30% if 100+ USDT.' },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4 bg-surface rounded-2xl border border-white/5 p-4 hover:border-accent/30 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-background border border-white/10 flex items-center justify-center font-black text-accent shrink-0">
                  {step.n}
                </div>
                <div>
                  <h4 className="font-black mb-0.5">{step.title}</h4>
                  <p className="text-sm text-gray-400 font-medium">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, Copy, Gift, CheckCircle2, Loader2, UserPlus, DollarSign } from 'lucide-react';

export default function ReferralsPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [refCode,    setRefCode]    = useState<string|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState({ referredUsers: 0, referralTxCount: 0, totalEarned: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/referral/stats'),
        ]);
        if (meRes.ok) {
          const d = await meRes.json();
          setRefCode(d.user?.myReferralCode ?? null);
        }
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats({ referredUsers: s.referredUsers ?? 0, referralTxCount: s.referralTxCount ?? 0, totalEarned: s.totalEarned ?? 0 });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const origin       = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = refCode ? `${origin}/register?ref=${refCode}` : '';

  const copyCode = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000);
  };
  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-5">
        <h1 className="text-xl font-black flex items-center gap-2 uppercase tracking-wider">
          <Users className="text-accent" size={20}/> Referrals
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface rounded-2xl border border-white/8 p-3 text-center">
            <UserPlus size={16} className="text-primary mx-auto mb-1"/>
            <p className="text-2xl font-black">{loading ? '—' : stats.referredUsers}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Registered</p>
          </div>
          <div className="bg-surface rounded-2xl border border-white/8 p-3 text-center">
            <DollarSign size={16} className="text-accent mx-auto mb-1"/>
            <p className="text-2xl font-black">{loading ? '—' : stats.referralTxCount}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Deposits</p>
          </div>
          <div className="bg-surface rounded-2xl border border-white/8 p-3 text-center">
            <Gift size={16} className="text-green-400 mx-auto mb-1"/>
            <p className="text-2xl font-black text-green-400">{loading ? '—' : stats.totalEarned.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">USDT Earned</p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-surface border border-white/8 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-bold mb-1">Earn on every deposit your friends make</p>
            <div className="flex gap-3 text-sm">
              <span className="bg-accent/10 border border-accent/20 text-accent font-black px-3 py-1.5 rounded-lg text-xs">5% per deposit</span>
              <span className="bg-primary/10 border border-primary/20 text-primary font-black px-3 py-1.5 rounded-lg text-xs">30% on 100+ USDT</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-500 text-sm">
              <Loader2 size={15} className="animate-spin"/> Loading your referral info...
            </div>
          ) : refCode ? (
            <>
              {/* Code row */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Your Code</p>
                <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
                  <span className="font-mono font-black text-2xl text-primary flex-1 select-all tracking-widest">{refCode}</span>
                  <button onClick={copyCode}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-2 rounded-lg text-xs font-black hover:bg-white/5 transition-colors flex items-center gap-1.5 min-w-[90px] justify-center"
                  >
                    {copiedCode
                      ? <><CheckCircle2 size={12} className="text-green-400"/> <span className="text-green-400">Copied!</span></>
                      : <><Copy size={12}/> Copy Code</>}
                  </button>
                </div>
              </div>

              {/* Link row */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Invite Link</p>
                <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-400 flex-1 truncate font-medium select-all">{referralLink}</span>
                  <button onClick={copyLink}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-2 rounded-lg text-xs font-black hover:bg-white/5 transition-colors flex items-center gap-1.5 min-w-[90px] justify-center"
                  >
                    {copiedLink
                      ? <><CheckCircle2 size={12} className="text-green-400"/> <span className="text-green-400">Copied!</span></>
                      : <><Copy size={12}/> Copy Link</>}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400 font-bold text-center">
              No code yet — try logging out and back in
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500">How it works</p>
          {[
            { n:1, title:'Share your code or link', desc:'Send BP-XXXXXX or your invite link to friends.' },
            { n:2, title:'They register with your code', desc:'Their account gets linked to yours instantly.' },
            { n:3, title:'They deposit — you earn', desc:'5% bonus per deposit, 30% on deposits of 100+ USDT. Credited instantly.' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3 bg-surface rounded-2xl border border-white/8 p-4">
              <div className="w-7 h-7 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-accent text-xs shrink-0">{s.n}</div>
              <div>
                <p className="font-black text-sm mb-0.5">{s.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

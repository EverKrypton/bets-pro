'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Users, Copy, Gift, CheckCircle2, Loader2 } from 'lucide-react';

export default function ReferralsPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [refCode,    setRefCode]    = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState({ count: 0, earned: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        setRefCode(data.user?.myReferralCode ?? null);

        const txRes  = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          const referrals = (txData.transactions ?? []).filter((t: any) => t.type === 'referral');
          setStats({
            count:  referrals.length,
            earned: referrals.reduce((s: number, t: any) => s + t.amount, 0),
          });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const origin       = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = refCode ? `${origin}/register?ref=${refCode}` : '';

  const copyCode = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-5">
        <h1 className="text-xl font-black flex items-center gap-2 uppercase tracking-wider">
          <Users className="text-accent" size={20}/> Referrals
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-2xl border border-white/8 p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Referrals</p>
            <p className="text-3xl font-black">{stats.count}</p>
          </div>
          <div className="bg-surface rounded-2xl border border-white/8 p-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-3xl font-black text-accent">{stats.earned.toFixed(2)}</p>
            <p className="text-xs text-gray-600 font-bold">USDT</p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-surface border border-white/8 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Gift className="text-accent" size={20}/>
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider">Invite & Earn USDT</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="text-white font-bold">5%</span> per deposit ·{' '}
                <span className="text-primary font-bold">30%</span> on deposits ≥ 100 USDT
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin"/> Loading your code...
            </div>
          ) : refCode ? (
            <>
              {/* Code */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Your Referral Code</p>
                <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
                  <span className="font-mono font-black text-xl text-primary flex-1 select-all">{refCode}</span>
                  <button
                    onClick={copyCode}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-2 rounded-lg text-xs font-black hover:bg-white/5 transition-colors flex items-center gap-1.5"
                  >
                    {copiedCode
                      ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> Copied!</span>
                      : <><Copy size={12}/> Copy Code</>
                    }
                  </button>
                </div>
              </div>

              {/* Full link */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Full Invite Link</p>
                <div className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-300 flex-1 truncate select-all font-medium">{referralLink}</span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-2 rounded-lg text-xs font-black hover:bg-white/5 transition-colors flex items-center gap-1.5"
                  >
                    {copiedLink
                      ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> Copied!</span>
                      : <><Copy size={12}/> Copy Link</>
                    }
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400 font-bold">
              No referral code yet. Try logging out and back in.
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">How it works</h3>
          {[
            { n:1, title:'Share your code or link', desc:'Send your unique code BP-XXXXXX or the full invite link to friends.' },
            { n:2, title:'Friend registers',        desc:'They enter your code during registration or use your link directly.' },
            { n:3, title:'They deposit & you earn', desc:'5% on every deposit they make, 30% if they deposit 100+ USDT.' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3 bg-surface rounded-2xl border border-white/8 p-4">
              <div className="w-7 h-7 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-accent text-xs shrink-0">{step.n}</div>
              <div>
                <p className="font-black text-sm mb-0.5">{step.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

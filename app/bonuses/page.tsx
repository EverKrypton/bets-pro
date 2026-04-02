'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, TrendingUp, Users, CheckCircle, Clock, ChevronRight, Lock, Sparkles } from 'lucide-react';

interface Bonus {
  _id: string;
  type: string;
  status: string;
  firstDepositAmount: number;
  bonusAmount: number;
  bonusPercent: number;
  requiredBetVolume: number;
  requiredReferrals: number;
  currentBetVolume: number;
  currentReferrals: number;
  referredUsersInvested: number;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

interface BonusStats {
  referredCount: number;
  referredWithDeposit: number;
  betVolume: number;
  totalBetsVolume: number;
  welcomeBonusSeen: boolean;
  firstDepositDone: boolean;
}

export default function BonusesPage() {
  const [bonus, setBonus] = useState<Bonus | null>(null);
  const [stats, setStats] = useState<BonusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBonus();
  }, []);

  const fetchBonus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bonus');
      const data = await res.json();
      if (res.ok) {
        setBonus(data.bonus);
        setStats(data.stats);
      }
    } catch {
      setError('Failed to load bonus data');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setError(null);
      const res = await fetch('/api/bonus/claim', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully claimed $${data.bonus.bonusAmount.toFixed(2)} bonus!`);
        fetchBonus();
      } else {
        setError(data.error || 'Failed to claim bonus');
      }
    } catch {
      setError('Failed to claim bonus');
    } finally {
      setClaiming(false);
    }
  };

  const canClaim = bonus && bonus.status !== 'claimed' &&
    stats && stats.betVolume >= (bonus.requiredBetVolume || 30) &&
    stats.referredWithDeposit >= (bonus.requiredReferrals || 3);

  const formatTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Bonuses</h1>
        <p className="text-sm text-gray-500">Claim your rewards and track your progress</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold"
          >
            {error}
            <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold"
          >
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin"/>
        </div>
      ) : !bonus ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161b22] border border-white/10 rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <Gift size={36} className="text-yellow-500"/>
          </div>
          <h2 className="text-xl font-black text-white mb-2">No Active Bonus</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            Make your first deposit of $100+ to unlock the welcome bonus!
          </p>
          <a
            href="/wallet"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Deposit Now <ChevronRight size={16}/>
          </a>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Main Bonus Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border-2 ${
              bonus.status === 'claimed'
                ? 'bg-green-500/5 border-green-500/30'
                : canClaim
                  ? 'bg-yellow-500/5 border-yellow-500/30'
                  : 'bg-[#161b22] border-white/10'
            }`}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${
              bonus.status === 'claimed'
                ? 'from-green-500/10 to-emerald-500/5'
                : canClaim
                  ? 'from-yellow-500/10 to-orange-500/5'
                  : 'from-purple-500/5 to-pink-500/5'
            } pointer-events-none`}/>

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      bonus.status === 'claimed'
                        ? 'bg-green-500/20'
                        : 'bg-gradient-to-br from-yellow-500 to-orange-500'
                    }`}>
                      {bonus.status === 'claimed' ? (
                        <CheckCircle size={20} className="text-green-400"/>
                      ) : (
                        <Gift size={20} className="text-white"/>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Welcome Bonus</h3>
                      <p className="text-xs text-gray-500">First Deposit Reward</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-white">${bonus.bonusAmount.toFixed(2)}</div>
                  <div className="text-sm text-yellow-400 font-bold">{bonus.bonusPercent}% Bonus</div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-6">
                {bonus.status === 'claimed' ? (
                  <span className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle size={12}/> Claimed
                  </span>
                ) : canClaim ? (
                  <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={12}/> Ready to Claim!
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold flex items-center gap-1.5">
                    <Clock size={12}/> In Progress
                  </span>
                )}
                {bonus.expiresAt && bonus.status !== 'claimed' && (
                  <span className="text-xs text-gray-500">Expires in {formatTimeLeft(bonus.expiresAt)}</span>
                )}
              </div>

              {/* Requirements */}
              <div className="space-y-3 mb-6">
                {/* Bet Volume */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-400"/>
                      <span className="text-sm font-bold text-white">Betting Volume</span>
                    </div>
                    <span className="text-sm font-bold">
                      <span className={stats && stats.betVolume >= bonus.requiredBetVolume ? 'text-green-400' : 'text-white'}>
                        ${stats?.betVolume.toFixed(2) || '0.00'}
                      </span>
                      <span className="text-gray-500"> / ${bonus.requiredBetVolume}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((stats?.betVolume || 0) / bonus.requiredBetVolume) * 100)}%` }}
                      className={`h-full rounded-full ${stats && stats.betVolume >= bonus.requiredBetVolume ? 'bg-green-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>

                {/* Referrals */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-purple-400"/>
                      <span className="text-sm font-bold text-white">Referrals with Deposit</span>
                    </div>
                    <span className="text-sm font-bold">
                      <span className={stats && stats.referredWithDeposit >= bonus.requiredReferrals ? 'text-green-400' : 'text-white'}>
                        {stats?.referredWithDeposit || 0}
                      </span>
                      <span className="text-gray-500"> / {bonus.requiredReferrals}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((stats?.referredWithDeposit || 0) / bonus.requiredReferrals) * 100)}%` }}
                      className={`h-full rounded-full ${stats && stats.referredWithDeposit >= bonus.requiredReferrals ? 'bg-green-500' : 'bg-purple-500'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Claim Button */}
              {bonus.status !== 'claimed' && (
                <button
                  onClick={handleClaim}
                  disabled={!canClaim || claiming}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                    canClaim
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90 active:scale-[0.98]'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {claiming ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Claiming...
                    </>
                  ) : canClaim ? (
                    <>
                      <Gift size={20}/> Claim ${bonus.bonusAmount.toFixed(2)} Bonus
                    </>
                  ) : (
                    <>
                      <Lock size={18}/> Requirements Not Met
                    </>
                  )}
                </button>
              )}

              {bonus.status === 'claimed' && (
                <div className="flex items-center justify-center gap-3 py-3 text-green-400">
                  <CheckCircle size={20}/>
                  <span className="font-bold">Bonus claimed on {new Date(bonus.claimedAt!).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#161b22] border border-white/10 rounded-2xl p-5"
          >
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400"/>
              Bonus Tiers
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg p-2.5">
                <span className="text-gray-500">Deposit $100+</span>
                <span className="text-yellow-400 font-bold ml-auto">20%</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <span className="text-gray-500">Deposit $200+</span>
                <span className="text-yellow-400 font-bold ml-auto">30%</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <span className="text-gray-500">Deposit $500+</span>
                <span className="text-yellow-400 font-bold ml-auto">40%</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <span className="text-gray-500">Deposit $1000+</span>
                <span className="text-yellow-400 font-bold ml-auto">50%</span>
              </div>
            </div>
          </motion.div>

          {/* Referral Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#161b22] border border-white/10 rounded-2xl p-5"
          >
            <h4 className="text-sm font-bold text-white mb-2">Need More Referrals?</h4>
            <p className="text-xs text-gray-500 mb-3">Share your referral link and get friends to deposit to unlock your bonus!</p>
            <a
              href="/referrals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white transition-colors"
            >
              View Referral Link <ChevronRight size={14}/>
            </a>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
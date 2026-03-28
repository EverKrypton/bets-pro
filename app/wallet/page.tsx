'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine,
  Copy, CheckCircle2, Loader2, Clock,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Tx {
  _id:       string;
  type:      string;
  amount:    number;
  status:    string;
  createdAt: string;
  details:   any;
}

export default function WalletPage() {
  const [activeTab, setActiveTab]         = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [amount, setAmount]               = useState('');
  const [address, setAddress]             = useState('');
  const [network, setNetwork]             = useState('BEP20');
  const [loading, setLoading]             = useState(false);
  const [copied, setCopied]               = useState(false);
  const [depositAddress, setDepositAddress] = useState('');
  const [balance, setBalance]             = useState(0);
  const [history, setHistory]             = useState<Tx[]>([]);
  const [feedback, setFeedback]           = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchMe();
    fetchHistory();
  }, []);

  const fetchMe = async () => {
    const res  = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.user?.balance ?? 0);
    if (data.user?.depositAddress) setDepositAddress(data.user.depositAddress);
  };

  const fetchHistory = async () => {
    const res  = await fetch('/api/transactions');
    if (!res.ok) return;
    const data = await res.json();
    setHistory(data.transactions ?? []);
  };

  const notify = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleGetDepositAddress = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/deposit/create', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.address) {
        setDepositAddress(data.address);
        notify('Deposit address ready. Minimum deposit: 10 USDT', true);
      } else {
        notify(data.error || 'Failed to get deposit address', false);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) { notify('Minimum withdrawal is 10 USDT', false); return; }
    if (!address)          { notify('Wallet address is required', false); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/withdraw/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: amt, address, network }),
      });
      const data = await res.json();

      if (res.ok) {
        notify(`Withdrawal submitted! You will receive ${data.netAmount} USDT after 1 USDT fee.`, true);
        setAmount('');
        setAddress('');
        fetchMe();
        fetchHistory();
      } else {
        notify(data.error || 'Withdrawal failed', false);
      }
    } finally {
      setLoading(false);
    }
  };

  const receive   = amount && Number(amount) >= 10 ? Math.max(0, Number(amount) - 1).toFixed(2) : '0.00';
  const STATUS_COLOR: Record<string, string> = {
    completed: 'text-green-400',
    pending:   'text-yellow-400',
    rejected:  'text-red-400',
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-wider">
          <Wallet className="text-accent" /> Wallet
        </h1>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-surface to-background border border-white/5 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-accent/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <p className="text-sm text-gray-400 font-bold mb-1 uppercase tracking-wider">Total Balance</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight">{balance.toFixed(2)}</span>
              <span className="text-lg text-accent font-black mb-1">USDT</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 bg-background/50 border border-white/5 px-3 py-1.5 rounded-full text-xs font-bold text-gray-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              BNB Smart Chain (BEP20)
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            feedback.ok
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-surface rounded-2xl p-1 border border-white/5 gap-1">
          {(['deposit', 'withdraw', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'history') fetchHistory(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-accent to-accent text-white shadow-[0_0_15px_rgba(225,44,76,0.3)]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'deposit'  && <ArrowDownToLine size={13} />}
              {tab === 'withdraw' && <ArrowUpFromLine size={13} />}
              {tab === 'history'  && <Clock size={13} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Deposit */}
        {activeTab === 'deposit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-3xl border border-white/5 p-6 space-y-5">
            <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Send <span className="text-white font-bold">USDT (BEP20)</span> to your personal address below.{' '}
                <span className="text-yellow-400 font-bold">Minimum deposit: 10 USDT.</span>{' '}
                Balance is credited automatically after network confirmation.
              </p>
            </div>

            {depositAddress ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Your USDT Deposit Address (BEP20)</p>
                <div className="bg-background rounded-xl border border-white/5 p-1 flex items-center gap-2">
                  <p className="flex-1 px-3 py-3 font-mono text-xs text-gray-300 break-all select-all">{depositAddress}</p>
                  <button
                    onClick={copyAddress}
                    className="shrink-0 bg-surface hover:bg-white/5 border border-white/5 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-black uppercase tracking-wider transition-colors"
                  >
                    {copied ? <span className="text-accent">Copied!</span> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-medium text-center">
                  Only send USDT on the BNB Smart Chain (BEP20) network. Other networks will result in loss of funds.
                </p>
              </div>
            ) : (
              <button
                onClick={handleGetDepositAddress}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-accent text-white font-black text-lg uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_20px_rgba(225,44,76,0.4)] flex items-center justify-center gap-3"
              >
                {loading ? <><Loader2 size={20} className="animate-spin" /> Generating…</> : 'Get Deposit Address'}
              </button>
            )}
          </motion.div>
        )}

        {/* Withdraw */}
        {activeTab === 'withdraw' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-3xl border border-white/5 p-6 space-y-5">
            <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-yellow-400 font-bold">Minimum: 10 USDT · Fee: 1 USDT.</span>{' '}
                Withdrawals are processed within 24 hours.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Network</label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:border-accent/50 transition-colors"
              >
                <option value="BEP20">BNB Smart Chain (BEP20)</option>
                <option value="TRC20">TRON (TRC20)</option>
                <option value="ERC20">Ethereum (ERC20)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Wallet Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none font-medium text-sm focus:border-accent/50 transition-colors"
                placeholder="Your USDT wallet address"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Amount (USDT)</label>
              <div className="flex bg-background rounded-xl border border-white/5 overflow-hidden focus-within:border-accent/50 transition-colors">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-3 outline-none font-black"
                  placeholder="Min 10 USDT"
                  min={10}
                />
                <button
                  onClick={() => setAmount(Math.floor(balance).toString())}
                  className="px-4 py-3 text-xs font-black text-accent hover:bg-white/5 transition-colors uppercase tracking-wider"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-400 px-1 font-bold">
              <span>Fee: 1 USDT</span>
              <span>You receive: <span className="text-white">{receive}</span> USDT</span>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !amount || Number(amount) < 10 || !address}
              className="w-full py-4 rounded-xl bg-surface border border-white/10 text-white font-black text-lg uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? <><Loader2 size={20} className="animate-spin" /> Submitting…</> : 'Request Withdrawal'}
            </button>
          </motion.div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 font-black uppercase tracking-wider text-sm">Transaction History</div>
            {history.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No transactions yet</p>
            ) : (
              <div className="divide-y divide-white/5">
                {history.map((tx) => (
                  <div key={tx._id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold capitalize text-sm">{tx.type}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{tx.amount.toFixed(2)} USDT</p>
                      <p className={`text-xs font-bold uppercase ${STATUS_COLOR[tx.status] ?? 'text-gray-400'}`}>{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

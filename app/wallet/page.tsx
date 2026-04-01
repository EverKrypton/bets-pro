'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import {
  ArrowDownToLine, ArrowUpFromLine, Copy, CheckCircle2,
  Loader2, Clock, CreditCard, Info, Send, KeyRound,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Tx { _id: string; type: string; amount: number; status: string; createdAt: string; details?: any; }

const STATUS_COLOR: Record<string,string> = {
  completed: 'text-green-400',
  pending:   'text-yellow-400',
  rejected:  'text-red-400',
  approved:  'text-green-400',
};

export default function WalletPage() {
  const [activeTab, setActiveTab]           = useState<'deposit'|'rub'|'withdraw'|'history'|'security'>('deposit');
  const [amount, setAmount]                 = useState('');
  const [address, setAddress]               = useState('');
  const [network, setNetwork]               = useState('BEP20');
  const [rubAmount, setRubAmount]           = useState('');
  const [rubRef, setRubRef]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [depositAddress, setDepositAddress] = useState('');
  const [balance, setBalance]               = useState(0);
  const [history, setHistory]               = useState<Tx[]>([]);
  const [feedback, setFeedback]             = useState<{msg:string;ok:boolean}|null>(null);
  const [rubRate, setRubRate]               = useState(90);
  const [rubBankDetails, setRubBankDetails] = useState('');
  const [rubSubmitted,  setRubSubmitted]     = useState(false);
  const [rubUsdPreview, setRubUsdPreview] = useState(0);
  const [minDeposit, setMinDeposit]       = useState(10);
  const [curPass,       setCurPass]         = useState('');
  const [newPass,       setNewPass]         = useState('');
  const [confPass,      setConfPass]        = useState('');
  const [changingPass,  setChangingPass]    = useState(false);

  useEffect(() => { fetchMe(); fetchHistory(); fetchPublicSettings(); }, []);

  const fetchMe = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.user?.balance ?? 0);
    if (data.user?.depositAddress) setDepositAddress(data.user.depositAddress);
  };

  const fetchHistory = async () => {
    const res = await fetch('/api/transactions');
    if (!res.ok) return;
    setHistory((await res.json()).transactions ?? []);
  };

  const fetchPublicSettings = async () => {
    const res = await fetch('/api/settings/public');
    if (!res.ok) return;
    const data = await res.json();
    setRubRate(data.rubUsdRate ?? 90);
    setRubBankDetails(data.rubBankDetails ?? '');
    setMinDeposit(data.minDepositAmount ?? 10);
  };

  const notify = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleGetDepositAddress = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/deposit/create', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.address) { setDepositAddress(data.address); notify('Deposit address ready!', true); }
      else notify(data.error || 'Failed to get address', false);
    } finally { setLoading(false); }
  };

  const handleRubSubmit = async () => {
    const amt = Number(rubAmount);
    if (!amt || amt < 500)              { notify('Minimum 500 ₽', false); return; }
    if (!rubRef || rubRef.trim().length < 4) { notify('Transfer reference required (min 4 chars)', false); return; }
    if (!rubBankDetails)                { notify('Bank details not configured yet. Contact support.', false); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/deposit/rub', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountRub: amt, txRef: rubRef.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRubUsdPreview(data.amountUsd);
        setRubSubmitted(true);
        notify('Request submitted! Admin will credit your balance within 30 minutes.', true);
        setRubAmount(''); setRubRef('');
      } else {
        notify(data.error || 'Failed to submit', false);
      }
    } finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) { notify('Minimum 10 USDT', false); return; }
    if (!address)          { notify('Wallet address required', false); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/withdraw/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, address, network }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Submitted! You will receive ${data.netAmount} USDT after 1 USDT fee.`, true);
        setAmount(''); setAddress(''); fetchMe(); fetchHistory();
      } else notify(data.error || 'Failed', false);
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!curPass || !newPass || !confPass) { notify('All fields required', false); return; }
    if (newPass !== confPass)              { notify('Passwords do not match', false); return; }
    if (newPass.length < 8)               { notify('Min 8 characters', false); return; }
    setChangingPass(true);
    try {
      const res  = await fetch('/api/auth/change-password', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) { notify('Password changed successfully!', true); setCurPass(''); setNewPass(''); setConfPass(''); }
      else        { notify(data.error || 'Failed', false); }
    } finally { setChangingPass(false); }
  };

  const rubPreview = rubAmount && Number(rubAmount) >= 500
    ? (Number(rubAmount) / rubRate).toFixed(2) : null;

  const receive = amount && Number(amount) >= 10
    ? Math.max(0, Number(amount) - 1).toFixed(2) : '0.00';

  const TABS = [
    { key: 'deposit',  label: 'USDT',    icon: ArrowDownToLine },
    { key: 'rub',      label: 'RUB ₽',   icon: CreditCard      },
    { key: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { key: 'history',  label: 'History',  icon: Clock           },
    { key: 'security', label: 'Security', icon: KeyRound        },
  ] as const;

  return (
    <Layout>
      <div className="space-y-4">

        {/* Balance card */}
        <div className="bg-surface border border-white/8 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Balance</p>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-black">{balance.toFixed(2)}</span>
            <span className="text-accent font-black text-lg mb-0.5">USDT</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('deposit')}
              className="flex-1 bg-accent text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-accent/90 transition-colors"
            >
              <ArrowDownToLine size={14}/> Deposit
            </button>
            <button onClick={() => setActiveTab('withdraw')}
              className="flex-1 bg-surface border border-white/10 text-gray-300 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/5 transition-colors"
            >
              <ArrowUpFromLine size={14}/> Withdraw
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            feedback.ok
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>{feedback.msg}</div>
        )}

        {/* Tabs */}
        <div className="flex bg-surface border border-white/8 rounded-xl p-1 gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setRubSubmitted(false);
                if (tab.key === 'history') fetchHistory();
              }}
              className={`py-2 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${
                activeTab === tab.key ? 'bg-accent text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              <tab.icon size={11}/> {tab.label}
            </button>
          ))}
        </div>

        {/* USDT Deposit */}
        {activeTab === 'deposit' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-white mb-0.5">USDT via BEP20 (BSC)</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Send USDT on BNB Smart Chain to your personal address. Minimum{' '}
                  <span className="text-yellow-400 font-bold">{minDeposit} USDT</span>. Credited automatically after confirmation.
                </p>
              </div>
            </div>

            {depositAddress ? (
              <div className="space-y-3">
                <div className="bg-background border border-white/8 rounded-xl p-3 flex items-center gap-2">
                  <p className="flex-1 font-mono text-xs text-gray-300 break-all select-all">{depositAddress}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(depositAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-white/5 flex items-center gap-1"
                  >
                    {copied ? <span className="text-green-400">Copied!</span> : <><Copy size={12}/> Copy</>}
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 text-center font-bold">
                  ⚠️ Only send USDT on BEP20 network. Other networks = lost funds.
                </p>
              </div>
            ) : (
              <button onClick={handleGetDepositAddress} disabled={loading}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin"/> Generating...</> : '+ Get My Deposit Address'}
              </button>
            )}
          </motion.div>
        )}

        {/* RUB Manual Deposit */}
        {activeTab === 'rub' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-3">

            {/* How it works */}
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Info size={15} className="shrink-0"/>
                <p className="text-sm font-black">How it works</p>
              </div>
              <ol className="space-y-2">
                {[
                  'Transfer RUB to the card below',
                  'Copy the last 4 digits of your card or the transfer reference number',
                  'Fill in the form and submit',
                  'Admin credits your USDT balance within 30 min',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Bank card to send to */}
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Send RUB to</p>
              {rubBankDetails ? (
                <div className="bg-background border border-white/8 rounded-xl p-3 flex items-center gap-2">
                  <CreditCard size={14} className="text-primary shrink-0"/>
                  <p className="flex-1 font-mono text-sm font-bold text-white break-all select-all">{rubBankDetails}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(rubBankDetails); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="shrink-0 bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-white/5 flex items-center gap-1"
                  >
                    {copied ? <span className="text-green-400">Copied!</span> : <><Copy size={12}/> Copy</>}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-yellow-400 font-bold">Bank details not configured yet. Contact support.</p>
              )}
              <p className="text-[10px] text-gray-600 font-bold">Rate: 1 USDT = {rubRate} ₽</p>
            </div>

            {/* Form */}
            {rubSubmitted ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 size={32} className="text-green-400 mx-auto"/>
                <p className="font-black text-green-400">Request Submitted!</p>
                <p className="text-xs text-gray-400">
                  Expected credit: <span className="text-white font-bold">{rubUsdPreview} USDT</span>
                </p>
                <p className="text-xs text-gray-500">Admin will process within 30 minutes.</p>
                <button onClick={() => setRubSubmitted(false)}
                  className="mt-2 text-xs font-black text-accent underline"
                >Submit another</button>
              </div>
            ) : (
              <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Amount (RUB ₽)</label>
                  <div className="flex bg-background border border-white/8 rounded-xl overflow-hidden focus-within:border-accent/50 transition-colors">
                    <span className="flex items-center pl-4 text-sm font-bold text-gray-500">₽</span>
                    <input
                      type="number" value={rubAmount} min={500}
                      onChange={e => setRubAmount(e.target.value)}
                      placeholder="Minimum 500 ₽"
                      className="flex-1 bg-transparent px-3 py-3 outline-none font-black text-lg"
                    />
                  </div>
                  {rubPreview && (
                    <p className="text-xs text-accent font-bold mt-1.5 pl-1">≈ {rubPreview} USDT at current rate</p>
                  )}
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {[500, 1000, 2500, 5000].map(v => (
                    <button key={v} onClick={() => setRubAmount(String(v))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${
                        Number(rubAmount) === v
                          ? 'bg-accent/20 border-accent/50 text-accent'
                          : 'bg-background border-white/8 text-gray-500 hover:text-white'
                      }`}
                    >₽{v.toLocaleString()}</button>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Transfer Reference</label>
                  <input
                    type="text" value={rubRef} onChange={e => setRubRef(e.target.value)}
                    placeholder="Last 4 digits of your card or transfer ID"
                    className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-accent/50 transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 mt-1 pl-0.5">This lets the admin identify your payment</p>
                </div>

                <button
                  onClick={handleRubSubmit}
                  disabled={loading || !rubAmount || Number(rubAmount) < 500 || !rubRef || rubRef.trim().length < 4}
                  className="w-full py-3.5 rounded-xl bg-primary text-background font-black text-sm uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin"/> Submitting...</>
                    : <><Send size={15}/> I Sent the Payment</>
                  }
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Withdraw */}
        {activeTab === 'withdraw' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-yellow-400 mt-0.5 shrink-0"/>
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-yellow-400 font-bold">Min 10 USDT · Fee 1 USDT.</span> Processed within 24h after admin approval.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Network</label>
              <select value={network} onChange={e => setNetwork(e.target.value)}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 outline-none font-bold text-sm focus:border-accent/50"
              >
                <option value="BEP20">BNB Smart Chain (BEP20)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Wallet Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 outline-none font-medium text-sm focus:border-accent/50"
                placeholder="Your USDT address"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Amount (USDT)</label>
              <div className="flex bg-background border border-white/8 rounded-xl overflow-hidden focus-within:border-accent/50">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-3 outline-none font-black" placeholder="Min 10" min={10}
                />
                <button onClick={() => setAmount(Math.floor(balance).toString())}
                  className="px-4 text-xs font-black text-accent hover:bg-white/5 transition-colors uppercase"
                >MAX</button>
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 font-bold px-0.5">
              <span>Fee: 1 USDT</span>
              <span>Receive: <span className="text-white">{receive}</span> USDT</span>
            </div>

            <button onClick={handleWithdraw} disabled={loading || !amount || Number(amount) < 10 || !address}
              className="w-full py-3.5 rounded-xl bg-surface border border-white/10 text-white font-black text-sm uppercase tracking-wider hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin"/> Submitting...</> : 'Request Withdrawal'}
            </button>
          </motion.div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <KeyRound size={12} className="text-accent"/> Change Password
            </p>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Current Password</label>
              <input type="password" value={curPass} onChange={e => setCurPass(e.target.value)}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 outline-none text-sm focus:border-accent/50 transition-colors"
                placeholder="Your current password"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">New Password</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 outline-none text-sm focus:border-accent/50 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Confirm New Password</label>
              <input type="password" value={confPass} onChange={e => setConfPass(e.target.value)}
                className={`w-full bg-background border rounded-xl px-4 py-3 outline-none text-sm transition-colors ${
                  confPass && confPass !== newPass ? 'border-red-500/50' : 'border-white/8 focus:border-accent/50'
                }`}
                placeholder="Repeat new password"
              />
              {confPass && confPass !== newPass && (
                <p className="text-[10px] text-red-400 font-bold mt-1 pl-1">Passwords do not match</p>
              )}
            </div>
            <button onClick={handleChangePassword}
              disabled={changingPass || !curPass || !newPass || !confPass || newPass !== confPass}
              className="w-full py-3.5 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {changingPass ? <><Loader2 size={15} className="animate-spin"/> Changing...</> : 'Update Password'}
            </button>
          </motion.div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 font-black text-sm uppercase tracking-wider">History</div>
            {history.length === 0
              ? <p className="text-center text-gray-600 text-sm py-10">No transactions yet</p>
              : <div className="divide-y divide-white/5">
                  {history.map(tx => (
                    <div key={tx._id} className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold capitalize text-sm">
                          {tx.details?.method === 'rub' ? 'Deposit (₽ RUB)' : tx.type}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm">{tx.amount.toFixed(2)} USDT</p>
                        <p className={`text-[10px] font-black uppercase ${STATUS_COLOR[tx.status] ?? 'text-gray-400'}`}>{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

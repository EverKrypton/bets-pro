'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import {
  Shield, Check, X, Plus, RefreshCw, Trophy,
  ChevronDown, ChevronUp, Trash2, CheckCircle2,
  Settings, Briefcase, ExternalLink, AlertTriangle,
  DollarSign, BarChart2, Clock, Save, CreditCard,
} from 'lucide-react';
import { LEAGUES } from '@/lib/sports';

type MatchStatus = 'pending' | 'open' | 'closed' | 'settled';
type ActiveTab   = 'matches' | 'exposure' | 'settings' | 'withdrawals' | 'rub' | 'applications';

interface Match {
  _id: string; homeTeam: string; awayTeam: string; league: string;
  date: string; time: string; status: MatchStatus;
  displayOdds: { home: number; draw: number; away: number } | null;
  result: string | null;
}
interface ExposureMatch {
  matchId: string; homeTeam: string; awayTeam: string; league: string;
  date: string; time: string; status: string;
  totalBets: number; totalStaked: number;
  breakdown: { home: number; draw: number; away: number; dc: number };
  payouts: { ifHome: number; ifDraw: number; ifAway: number };
  profit:  { ifHome: number; ifDraw: number; ifAway: number; worstCase: number };
  displayOdds: { home: number; draw: number; away: number } | null;
}
interface HouseSettings {
  maxBetAmount: number; maxPotentialPayout: number; minBetAmount: number;
  autoCloseMinutes: number; houseReserve: number; liveScoreRefreshSecs: number;
  footballDataApiKey: string; rubUsdRate: number; rubBankDetails: string;
}
interface Withdrawal {
  _id: string; userId: { username: string; email: string }; amount: number;
  details: { address: string; network: string; grossAmount: number }; status: string; createdAt: string;
}
interface RubDeposit {
  _id: string;
  userId: { username: string; email: string };
  amountRub: number; amountUsd: number; rate: number; txRef: string;
  status: string; createdAt: string; adminNote: string;
}
interface Application {
  _id: string; name: string; email: string; telegram: string;
  instagram: string; tiktok: string; twitter: string; youtube: string;
  totalFollowers: string; description: string; motivation: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
}

const STATUS_COLOR: Record<MatchStatus, string> = {
  pending: 'text-yellow-400', open: 'text-green-400',
  closed: 'text-orange-400',  settled: 'text-gray-400',
};
const APP_STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400', approved: 'text-green-400', rejected: 'text-gray-400',
};

function ProfitCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
  return <span className={`font-black text-sm ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(2)}</span>;
}

const SETTINGS_DEFAULTS: HouseSettings = {
  maxBetAmount: 50, maxPotentialPayout: 200, minBetAmount: 1,
  autoCloseMinutes: 30, houseReserve: 0, liveScoreRefreshSecs: 30,
  footballDataApiKey: '', rubUsdRate: 90, rubBankDetails: '',
};

export default function AdminPage() {
  const [matches,       setMatches]       = useState<Match[]>([]);
  const [exposure,      setExposure]      = useState<ExposureMatch[]>([]);
  const [totalExposure, setTotalExposure] = useState(0);
  const [houseSettings, setHouseSettings] = useState<HouseSettings>(SETTINGS_DEFAULTS);
  const [settingsForm,  setSettingsForm]  = useState<HouseSettings>(SETTINGS_DEFAULTS);
  const [withdrawals,   setWithdrawals]   = useState<Withdrawal[]>([]);
  const [rubDeposits,   setRubDeposits]   = useState<RubDeposit[]>([]);
  const [applications,  setApplications]  = useState<Application[]>([]);

  const [isAuthorized,  setIsAuthorized]  = useState(false);
  const [checkingAuth,  setCheckingAuth]  = useState(true);
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('matches');

  const [importLeague, setImportLeague] = useState('all');
  const [importing,    setImporting]    = useState(false);
  const [importMsg,    setImportMsg]    = useState('');

  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [oddsForm,        setOddsForm]        = useState({ home: '', draw: '', away: '', status: 'open', moneyBack: false });
  const [settlingId,      setSettlingId]      = useState<string | null>(null);
  const [settleResult,    setSettleResult]    = useState<'home'|'draw'|'away'>('home');
  const [expandedApp,     setExpandedApp]     = useState<string | null>(null);
  const [savingSettings,  setSavingSettings]  = useState(false);
  const [autocloseMsg,    setAutocloseMsg]    = useState('');
  const [rubNoteId,       setRubNoteId]       = useState<string | null>(null);
  const [rubNote,         setRubNote]         = useState('');

  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const notify = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchMatches      = useCallback(async () => {
    const res = await fetch('/api/admin/matches'); if (!res.ok) return;
    setMatches((await res.json()).matches ?? []);
  }, []);
  const fetchExposure     = useCallback(async () => {
    const res = await fetch('/api/admin/exposure'); if (!res.ok) return;
    const data = await res.json();
    setExposure(data.exposure ?? []); setTotalExposure(data.totalExposure ?? 0);
  }, []);
  const fetchSettings     = useCallback(async () => {
    const res = await fetch('/api/admin/settings'); if (!res.ok) return;
    const data = await res.json();
    const s = { ...SETTINGS_DEFAULTS, ...data.settings };
    setHouseSettings(s); setSettingsForm(s);
  }, []);
  const fetchWithdrawals  = useCallback(async () => {
    const res = await fetch('/api/admin/withdraw/pending'); if (!res.ok) return;
    setWithdrawals((await res.json()).withdrawals ?? []);
  }, []);
  const fetchRubDeposits  = useCallback(async () => {
    const res = await fetch('/api/admin/rub'); if (!res.ok) return;
    setRubDeposits((await res.json()).deposits ?? []);
  }, []);
  const fetchApplications = useCallback(async () => {
    const res = await fetch('/api/admin/applications'); if (!res.ok) return;
    setApplications((await res.json()).applications ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data.user?.role === 'admin') {
          setIsAuthorized(true);
          fetchMatches(); fetchExposure(); fetchSettings();
          fetchWithdrawals(); fetchRubDeposits(); fetchApplications();
        }
      } finally { setCheckingAuth(false); }
    })();
  }, [fetchMatches, fetchExposure, fetchSettings, fetchWithdrawals, fetchRubDeposits, fetchApplications]);

  useEffect(() => {
    if (activeTab !== 'exposure') return;
    const id = setInterval(fetchExposure, 30000);
    return () => clearInterval(id);
  }, [activeTab, fetchExposure]);

  useEffect(() => {
    if (activeTab === 'rub') fetchRubDeposits();
  }, [activeTab, fetchRubDeposits]);

  const importMatches = async () => {
    setImporting(true); setImportMsg('');
    const res  = await fetch('/api/admin/matches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league: importLeague }),
    });
    const data = await res.json();
    setImporting(false);
    setImportMsg(res.ok ? data.message : data.error);
    if (res.ok) fetchMatches();
  };

  const saveOdds = async (matchId: string) => {
    const home = parseFloat(oddsForm.home), draw = parseFloat(oddsForm.draw), away = parseFloat(oddsForm.away);
    if ([home,draw,away].some(o => isNaN(o) || o < 1.01)) { notify('All odds must be >= 1.01', false); return; }
    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ odds: { home, draw, away }, status: oddsForm.status, moneyBack: oddsForm.moneyBack }),
    });
    const data = await res.json();
    if (res.ok) { notify('Odds saved!', true); setEditingId(null); fetchMatches(); fetchExposure(); }
    else notify(data.error || 'Save failed', false);
  };

  const settleMatch = async (matchId: string) => {
    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: settleResult }),
    });
    const data = await res.json();
    if (res.ok) {
      notify(`Settled! Winners: ${data.winnersCount} · Losers: ${data.losersCount}`, true);
      setSettlingId(null); fetchMatches(); fetchExposure();
    } else notify(data.error || 'Settle failed', false);
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Delete and refund all pending bets on this match?')) return;
    const res  = await fetch(`/api/admin/matches/${matchId}`, { method: 'DELETE' });
    const data = await res.json();
    res.ok ? notify(data.message, true) : notify(data.error || 'Delete failed', false);
    fetchMatches(); fetchExposure();
  };

  const handleWithdrawal = async (id: string, action: 'approve' | 'reject') => {
    const res  = await fetch('/api/admin/withdraw/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, action }),
    });
    const data = await res.json();
    res.ok ? notify(`Withdrawal ${action}d`, true) : notify(data.error || 'Failed', false);
    fetchWithdrawals();
  };

  const handleRubDeposit = async (id: string, action: 'approve' | 'reject') => {
    const res  = await fetch('/api/admin/rub', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, adminNote: rubNoteId === id ? rubNote : '' }),
    });
    const data = await res.json();
    res.ok ? notify(`RUB deposit ${action}d`, true) : notify(data.error || 'Failed', false);
    setRubNoteId(null); setRubNote('');
    fetchRubDeposits();
  };

  const handleApplication = async (id: string, status: 'approved' | 'rejected') => {
    const res  = await fetch('/api/admin/applications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    res.ok ? notify(`Application ${status}`, true) : notify(data.error || 'Failed', false);
    fetchApplications();
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const res  = await fetch('/api/admin/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    const data = await res.json();
    setSavingSettings(false);
    if (res.ok) {
      notify('Settings saved!', true);
      const s = { ...SETTINGS_DEFAULTS, ...data.settings };
      setHouseSettings(s); setSettingsForm(s);
    } else notify(data.error || 'Save failed', false);
  };

  const runAutoclose = async () => {
    setAutocloseMsg('Running...');
    const res  = await fetch('/api/admin/autoclose', { method: 'POST' });
    const data = await res.json();
    setAutocloseMsg(data.message ?? '');
    fetchMatches(); fetchExposure();
    setTimeout(() => setAutocloseMsg(''), 5000);
  };

  if (checkingAuth) return (
    <Layout><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div></Layout>
  );

  if (!isAuthorized) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-16 h-16 text-accent mb-4 opacity-30" />
        <h1 className="text-2xl font-black mb-2">Access Denied</h1>
      </div>
    </Layout>
  );

  const pendingApps  = applications.filter(a => a.status === 'pending').length;
  const pendingWdraw = withdrawals.length;
  const pendingRub   = rubDeposits.length;

  const TABS: { key: ActiveTab; label: string; icon: any; badge?: number }[] = [
    { key: 'matches',      label: 'Matches',  icon: Trophy                                            },
    { key: 'exposure',     label: 'Exposure', icon: BarChart2, badge: totalExposure > 0 ? Math.round(totalExposure) : undefined },
    { key: 'settings',     label: 'Limits',   icon: Settings                                          },
    { key: 'withdrawals',  label: 'Withdraw', icon: DollarSign, badge: pendingWdraw || undefined      },
    { key: 'rub',          label: 'RUB ₽',    icon: CreditCard, badge: pendingRub   || undefined      },
    { key: 'applications', label: 'Jobs',     icon: Briefcase,  badge: pendingApps  || undefined      },
  ];

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-xl font-black flex items-center gap-2"><Shield size={18} className="text-accent" /> Admin</h1>

        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            feedback.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>{feedback.msg}</div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 pb-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === tab.key ? 'bg-accent text-white' : 'bg-surface border border-white/8 text-gray-500 hover:text-white'
              }`}
            >
              <tab.icon size={12} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── MATCHES ── */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={runAutoclose}
                className="flex items-center gap-2 bg-surface border border-white/8 px-3 py-2 rounded-xl text-xs font-black text-gray-400 hover:text-white transition-colors"
              >
                <Clock size={13} /> Run Auto-Close
              </button>
              {autocloseMsg && <span className="text-xs text-gray-500">{autocloseMsg}</span>}
            </div>

            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Plus size={12} className="text-accent" /> Import from TheSportsDB
              </p>
              <div className="flex gap-2">
                <select value={importLeague} onChange={e => setImportLeague(e.target.value)}
                  className="flex-1 bg-background border border-white/8 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                >
                  <option value="all">⚡ All Leagues at Once</option>
                  {Object.entries(LEAGUES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
                <button onClick={importMatches} disabled={importing}
                  className="bg-accent text-white px-4 py-2.5 rounded-xl font-black text-sm uppercase hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <RefreshCw size={14} />}
                  Import
                </button>
              </div>
              {importMsg && <p className="text-xs text-gray-500">{importMsg}</p>}
            </div>

            {matches.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No matches yet.</p>
              : matches.map(match => (
                <div key={match._id} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-sm">{match.homeTeam} vs {match.awayTeam}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{match.league} · {match.date} {match.time !== 'TBD' ? `· ${match.time} UTC` : ''}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${STATUS_COLOR[match.status]}`}>{match.status}</span>
                    </div>

                    {match.displayOdds && (
                      <div className="flex gap-2 mb-3">
                        {(['home','draw','away'] as const).map(sel => (
                          <div key={sel} className="flex-1 bg-background border border-white/8 rounded-lg p-2 text-center">
                            <p className="text-[9px] text-gray-600 font-bold uppercase">{sel}</p>
                            <p className="font-black text-sm">{match.displayOdds![sel]?.toFixed(2) ?? '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {match.status !== 'settled' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (editingId === match._id) { setEditingId(null); return; }
                            setEditingId(match._id);
                            setOddsForm({
                              home: match.displayOdds?.home?.toString() ?? '',
                              draw: match.displayOdds?.draw?.toString() ?? '',
                              away: match.displayOdds?.away?.toString() ?? '',
                              status: match.status, moneyBack: (match as any).moneyBack ?? false,
                            });
                          }}
                          className="flex-1 bg-background border border-white/8 text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:border-white/20"
                        >
                          <Settings size={12} /> Odds {editingId === match._id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </button>
                        {match.status === 'closed' && (
                          <button onClick={() => setSettlingId(settlingId === match._id ? null : match._id)}
                            className="flex-1 bg-primary/10 text-primary border border-primary/20 text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/20"
                          >
                            <CheckCircle2 size={12} /> Settle {settlingId === match._id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                          </button>
                        )}
                        <button onClick={() => deleteMatch(match._id)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/20">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                    {match.status === 'settled' && match.result && (
                      <p className="text-xs text-gray-500 font-bold">Result: <span className="text-white uppercase">{match.result}</span></p>
                    )}
                  </div>

                  {editingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/20 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">Set Odds (what users see)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home','draw','away'] as const).map(sel => (
                          <div key={sel}>
                            <label className="text-[9px] text-gray-600 font-bold uppercase block mb-1">{sel}</label>
                            <input type="number" step="0.01" min="1.01" value={oddsForm[sel]}
                              onChange={e => setOddsForm({...oddsForm, [sel]: e.target.value})}
                              className="w-full bg-background border border-white/8 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-accent/50"
                              placeholder="1.85"
                            />
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center gap-3 bg-background border border-white/8 rounded-xl px-4 py-3 cursor-pointer">
                        <input type="checkbox" checked={oddsForm.moneyBack}
                          onChange={e => setOddsForm({...oddsForm, moneyBack: e.target.checked})}
                          className="w-4 h-4 accent-green-500"
                        />
                        <div>
                          <p className="text-xs font-black text-white">💰 Money Back if they lose</p>
                          <p className="text-[10px] text-gray-500">Losers get stake refunded on settle</p>
                        </div>
                      </label>
                      <select value={oddsForm.status} onChange={e => setOddsForm({...oddsForm, status: e.target.value})}
                        className="w-full bg-background border border-white/8 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                      >
                        <option value="pending">Pending (hidden from users)</option>
                        <option value="open">Open (users can bet)</option>
                        <option value="closed">Closed (no more bets)</option>
                      </select>
                      <button onClick={() => saveOdds(match._id)} className="w-full py-2.5 bg-accent text-white rounded-xl font-black text-sm uppercase hover:opacity-90">Save</button>
                    </div>
                  )}

                  {settlingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/20 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">Select Match Result</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home','draw','away'] as const).map(res => (
                          <button key={res} onClick={() => setSettleResult(res)}
                            className={`py-2.5 rounded-xl font-black text-sm uppercase transition-all ${settleResult === res ? 'bg-primary text-background' : 'bg-background border border-white/8 text-gray-400 hover:text-white'}`}
                          >{res}</button>
                        ))}
                      </div>
                      <button onClick={() => settleMatch(match._id)} className="w-full py-2.5 bg-primary text-background rounded-xl font-black text-sm uppercase hover:opacity-90">
                        Confirm — {settleResult.toUpperCase()} Wins
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── EXPOSURE ── */}
        {activeTab === 'exposure' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 border ${totalExposure > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className={totalExposure > 0 ? 'text-red-400' : 'text-green-400'} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">Total House Exposure</p>
                  <p className={`text-2xl font-black ${totalExposure > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {totalExposure > 0 ? `-${totalExposure.toFixed(2)}` : '0.00'} USDT
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {totalExposure > 0 ? 'Max you could lose across all open matches' : 'No exposure — no open bets'}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={fetchExposure} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white">
              <RefreshCw size={13} /> Refresh
            </button>
            {exposure.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No open matches with bets</p>
              : exposure.map(m => (
                <div key={m.matchId} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm">{m.homeTeam} vs {m.awayTeam}</p>
                      <p className="text-xs text-gray-500">{m.league} · {m.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-bold">{m.totalBets} bets</p>
                      <p className="font-black text-sm text-primary">{m.totalStaked.toFixed(2)} USDT staked</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[{ l:'Home',val:m.breakdown.home},{l:'Draw',val:m.breakdown.draw},{l:'Away',val:m.breakdown.away},{l:'DC',val:m.breakdown.dc}].map(b=>(
                      <div key={b.l} className="bg-background border border-white/8 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-600 font-bold uppercase">{b.l}</p>
                        <p className="font-black text-sm">{b.val}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-600">House P&L if result is...</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label:'Home Wins', profit:m.profit.ifHome,  payout:m.payouts.ifHome  },
                      { label:'Draw',      profit:m.profit.ifDraw,  payout:m.payouts.ifDraw  },
                      { label:'Away Wins', profit:m.profit.ifAway,  payout:m.payouts.ifAway  },
                    ].map(r=>(
                      <div key={r.label} className="bg-background border border-white/8 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-bold text-gray-600 uppercase mb-1">{r.label}</p>
                        <ProfitCell value={r.profit} />
                        <p className="text-[9px] text-gray-600 mt-0.5">pay {r.payout?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  {m.profit.worstCase < 0 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400 font-bold">Worst case: you lose {Math.abs(m.profit.worstCase).toFixed(2)} USDT</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Settings size={12} className="text-accent" /> Bet Limits
              </p>
              {[
                { key:'minBetAmount',         label:'Min Bet (USDT)',          hint:'Minimum a user can bet',                 type:'number' },
                { key:'maxBetAmount',         label:'Max Bet (USDT)',          hint:'Maximum per single bet',                 type:'number' },
                { key:'maxPotentialPayout',   label:'Max Payout (USDT)',       hint:'Max a user can win per bet',             type:'number' },
                { key:'autoCloseMinutes',     label:'Auto-close (min before)', hint:'Minutes before kickoff to close bets',   type:'number' },
                { key:'liveScoreRefreshSecs', label:'Live score refresh (sec)',hint:'How often users poll live scores',        type:'number' },
                { key:'houseReserve',         label:'House Reserve (USDT)',    hint:'Your actual available USDT to pay winners', type:'number' },
              ].map(({ key, label, hint, type }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-gray-400 block mb-1">{label}</label>
                  <p className="text-[10px] text-gray-600 mb-1.5">{hint}</p>
                  <input type={type} step="1" min="0"
                    value={(settingsForm as any)[key] ?? ''}
                    onChange={e => setSettingsForm({ ...settingsForm, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-white/8 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50"
                  />
                </div>
              ))}

              {houseSettings.houseReserve < totalExposure && totalExposure > 0 && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 font-bold">
                    Reserve ({houseSettings.houseReserve} USDT) is less than exposure ({totalExposure.toFixed(2)} USDT). You may not be able to pay winners.
                  </p>
                </div>
              )}
            </div>

            {/* RUB Settings */}
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <CreditCard size={12} className="text-primary" /> RUB Deposit Settings
              </p>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">RUB / USDT Rate</label>
                <p className="text-[10px] text-gray-600 mb-1.5">How many rubles per 1 USDT (e.g. 90 means 90 ₽ = 1 USDT)</p>
                <input type="number" step="0.01" min="1"
                  value={settingsForm.rubUsdRate ?? 90}
                  onChange={e => setSettingsForm({ ...settingsForm, rubUsdRate: parseFloat(e.target.value) || 90 })}
                  className="w-full bg-background border border-white/8 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Bank Card / Account Details</label>
                <p className="text-[10px] text-gray-600 mb-1.5">This is shown to users in the wallet RUB tab so they know where to send money</p>
                <input type="text"
                  value={settingsForm.rubBankDetails ?? ''}
                  onChange={e => setSettingsForm({ ...settingsForm, rubBankDetails: e.target.value })}
                  placeholder="e.g. Sberbank 4276 1234 5678 9012 · Ivan I."
                  className="w-full bg-background border border-white/8 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-accent/50"
                />
              </div>
            </div>

            {/* API Keys */}
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">API Keys</p>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">football-data.org API Key</label>
                <p className="text-[10px] text-gray-600 mb-1.5">Free key for real-time scores (optional, get at football-data.org)</p>
                <input type="text"
                  value={settingsForm.footballDataApiKey ?? ''}
                  onChange={e => setSettingsForm({ ...settingsForm, footballDataApiKey: e.target.value })}
                  placeholder="paste your API key here"
                  className="w-full bg-background border border-white/8 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-accent/50"
                />
              </div>
            </div>

            <button onClick={saveSettings} disabled={savingSettings}
              className="w-full py-3 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingSettings ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save All Settings
            </button>

            {/* Summary */}
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Active Settings</p>
              {[
                { label:'Min bet',      value:`${houseSettings.minBetAmount} USDT` },
                { label:'Max bet',      value:`${houseSettings.maxBetAmount} USDT` },
                { label:'Max payout',   value:`${houseSettings.maxPotentialPayout} USDT` },
                { label:'Auto-close',   value:`${houseSettings.autoCloseMinutes} min before kickoff` },
                { label:'Reserve',      value:`${houseSettings.houseReserve} USDT` },
                { label:'RUB rate',     value:`${houseSettings.rubUsdRate} ₽ = 1 USDT` },
                { label:'Bank details', value:houseSettings.rubBankDetails || '⚠️ Not set' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-xs text-gray-500 font-bold">{r.label}</span>
                  <span className={`text-xs font-black ${r.label==='Bank details'&&!houseSettings.rubBankDetails?'text-yellow-400':'text-white'} max-w-[60%] truncate text-right`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WITHDRAWALS ── */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No pending withdrawals</p>
              : withdrawals.map(w => (
                <div key={w._id} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm">{w.userId?.username ?? w.userId?.email}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{w.details?.network ?? 'BEP20'}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">{w.details?.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-black text-accent">{w.amount} USDT</p>
                      <p className="text-[10px] text-gray-500">(gross {w.details?.grossAmount ?? '—'})</p>
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleWithdrawal(w._id, 'approve')}
                      className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-500/20 text-sm font-black uppercase"
                    ><Check size={14} /> Approve</button>
                    <button onClick={() => handleWithdrawal(w._id, 'reject')}
                      className="flex-1 bg-surface border border-white/8 text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase"
                    ><X size={14} /> Reject</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── RUB DEPOSITS ── */}
        {activeTab === 'rub' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-bold">
                {pendingRub} pending · Rate: {houseSettings.rubUsdRate} ₽/USDT
              </p>
              <button onClick={fetchRubDeposits} className="text-xs font-black text-gray-500 hover:text-white flex items-center gap-1">
                <RefreshCw size={12}/> Refresh
              </button>
            </div>
            {rubDeposits.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No pending RUB deposits</p>
              : rubDeposits.map(dep => (
                <div key={dep._id} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm">{dep.userId?.username ?? dep.userId?.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(dep.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-black text-primary text-lg">₽{dep.amountRub.toLocaleString()}</p>
                      <p className="text-xs text-accent font-black">≈ {dep.amountUsd.toFixed(2)} USDT</p>
                      <p className="text-[10px] text-gray-600">{dep.rate} ₽/USDT</p>
                    </div>
                  </div>
                  <div className="bg-background border border-white/8 rounded-xl px-3 py-2 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase shrink-0">Transfer ref</p>
                    <p className="font-mono text-sm font-black text-white">{dep.txRef}</p>
                  </div>
                  {rubNoteId === dep._id && (
                    <input type="text" value={rubNote} onChange={e => setRubNote(e.target.value)}
                      placeholder="Admin note (optional)"
                      className="w-full bg-background border border-white/8 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50"
                    />
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setRubNoteId(dep._id); setRubNote(''); }}
                      className="text-[10px] text-gray-600 hover:text-white font-black underline"
                    >{rubNoteId === dep._id ? 'Note added' : '+ Add note'}</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRubDeposit(dep._id, 'approve')}
                      className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-500/20 text-sm font-black uppercase"
                    ><Check size={14} /> Credit {dep.amountUsd.toFixed(2)} USDT</button>
                    <button onClick={() => handleRubDeposit(dep._id, 'reject')}
                      className="flex-1 bg-surface border border-white/8 text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase"
                    ><X size={14} /> Reject</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {activeTab === 'applications' && (
          <div className="space-y-3">
            {applications.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No applications yet</p>
              : applications.map(app => (
                <div key={app._id} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandedApp(expandedApp === app._id ? null : app._id)}
                    className="w-full p-4 flex justify-between items-start text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm">{app.name}</p>
                        <span className={`text-[10px] font-black uppercase ${APP_STATUS_COLOR[app.status]}`}>{app.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{app.email}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{app.totalFollowers} followers · {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    {expandedApp === app._id ? <ChevronUp size={16} className="text-gray-500 mt-1 shrink-0"/> : <ChevronDown size={16} className="text-gray-500 mt-1 shrink-0"/>}
                  </button>
                  {expandedApp === app._id && (
                    <div className="border-t border-white/5 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label:'Telegram',  val:app.telegram  },
                          { label:'Instagram', val:app.instagram },
                          { label:'TikTok',    val:app.tiktok    },
                          { label:'Twitter',   val:app.twitter   },
                          { label:'YouTube',   val:app.youtube   },
                        ].filter(s => s.val).map(s => (
                          <div key={s.label} className="bg-background border border-white/8 rounded-lg px-3 py-2">
                            <p className="text-[9px] font-bold text-gray-600 uppercase">{s.label}</p>
                            <p className="text-xs text-white font-medium truncate mt-0.5 flex items-center gap-1">
                              {s.val}
                              {s.val.startsWith('http') && <ExternalLink size={10} className="text-gray-500 shrink-0"/>}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-background border border-white/8 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-gray-600 mb-1.5">Community</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{app.description}</p>
                      </div>
                      <div className="bg-background border border-white/8 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-gray-600 mb-1.5">Motivation</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{app.motivation}</p>
                      </div>
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApplication(app._id, 'approved')}
                            className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-500/20 text-sm font-black uppercase"
                          ><Check size={14} /> Approve</button>
                          <button onClick={() => handleApplication(app._id, 'rejected')}
                            className="flex-1 bg-surface border border-white/8 text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase"
                          ><X size={14} /> Reject</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

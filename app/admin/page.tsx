'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import {
  Shield, Check, X, Plus, RefreshCw, Trophy,
  ChevronDown, ChevronUp, Trash2, CheckCircle2,
  Settings, Briefcase, ExternalLink,
} from 'lucide-react';
import { LEAGUES } from '@/lib/sports';

type MatchStatus = 'pending' | 'open' | 'closed' | 'settled';

interface Match {
  _id: string; homeTeam: string; awayTeam: string; league: string;
  date: string; time: string; status: MatchStatus;
  displayOdds: { home: number; draw: number; away: number } | null;
  result: string | null;
}

interface Withdrawal {
  _id: string; userId: { username: string }; amount: number;
  details: { address: string }; status: string; createdAt: string;
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

export default function AdminPage() {
  const [matches, setMatches]           = useState<Match[]>([]);
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab]       = useState<'matches' | 'withdrawals' | 'applications'>('matches');

  const [importLeague, setImportLeague] = useState('all');
  const [importing, setImporting]       = useState(false);
  const [importMsg, setImportMsg]       = useState('');

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [oddsForm, setOddsForm]     = useState({ home: '', draw: '', away: '', status: 'open' });
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<'home'|'draw'|'away'>('home');
  const [expandedApp, setExpandedApp]   = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchMatches      = useCallback(async () => {
    const res = await fetch('/api/admin/matches'); if (!res.ok) return;
    setMatches((await res.json()).matches ?? []);
  }, []);

  const fetchWithdrawals  = useCallback(async () => {
    const res = await fetch('/api/admin/withdraw/pending'); if (!res.ok) return;
    setWithdrawals((await res.json()).withdrawals ?? []);
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
          fetchMatches(); fetchWithdrawals(); fetchApplications();
        }
      } finally { setCheckingAuth(false); }
    })();
  }, [fetchMatches, fetchWithdrawals, fetchApplications]);

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
    if ([home,draw,away].some((o) => isNaN(o) || o < 1.01)) { notify('All odds must be >= 1.01', false); return; }
    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ odds: { home, draw, away }, status: oddsForm.status }),
    });
    const data = await res.json();
    if (res.ok) { notify('Odds saved!', true); setEditingId(null); fetchMatches(); }
    else          notify(data.error || 'Save failed', false);
  };

  const settleMatch = async (matchId: string) => {
    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: settleResult }),
    });
    const data = await res.json();
    if (res.ok) { notify(`Settled! Winners: ${data.winnersCount} · Losers: ${data.losersCount}`, true); setSettlingId(null); fetchMatches(); }
    else          notify(data.error || 'Settle failed', false);
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Delete and refund all bets?')) return;
    const res  = await fetch(`/api/admin/matches/${matchId}`, { method: 'DELETE' });
    const data = await res.json();
    res.ok ? notify(data.message, true) : notify(data.error || 'Delete failed', false);
    fetchMatches();
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

  const handleApplication = async (id: string, status: 'approved' | 'rejected') => {
    const res  = await fetch('/api/admin/applications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    res.ok ? notify(`Application ${status}`, true) : notify(data.error || 'Failed', false);
    fetchApplications();
  };

  if (checkingAuth) return (
    <Layout><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div></Layout>
  );

  if (!isAuthorized) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-16 h-16 text-accent mb-4 opacity-30" />
        <h1 className="text-2xl font-black mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm">Admin only.</p>
      </div>
    </Layout>
  );

  const pendingApps = applications.filter(a => a.status === 'pending').length;

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
        <div className="flex bg-surface border border-white/8 rounded-xl p-1 gap-1">
          {[
            { key: 'matches',      label: 'Matches',     icon: Trophy    },
            { key: 'withdrawals',  label: 'Withdrawals', icon: Settings  },
            { key: 'applications', label: `Jobs${pendingApps > 0 ? ` (${pendingApps})` : ''}`, icon: Briefcase },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key ? 'bg-accent text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Matches ── */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Plus size={12} className="text-accent" /> Import from TheSportsDB</p>
              <div className="flex gap-2">
                <select
                  value={importLeague}
                  onChange={(e) => setImportLeague(e.target.value)}
                  className="flex-1 bg-background border border-white/8 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                >
                  {Object.entries(LEAGUES).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
                  <option value="all">⚡ All Leagues at Once</option>
                </select>
                <button
                  onClick={importMatches} disabled={importing}
                  className="bg-accent text-white px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <RefreshCw size={14} />}
                  Import
                </button>
              </div>
              {importMsg && <p className="text-xs text-gray-500">{importMsg}</p>}
            </div>

            {matches.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No matches yet.</p>
              : matches.map((match) => (
                <div key={match._id} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-sm">{match.homeTeam} vs {match.awayTeam}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{match.league} · {match.date}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${STATUS_COLOR[match.status]}`}>{match.status}</span>
                    </div>

                    {match.displayOdds && (
                      <div className="flex gap-2 mb-3">
                        {(['home','draw','away'] as const).map((sel) => (
                          <div key={sel} className="flex-1 bg-background border border-white/8 rounded-lg p-2 text-center">
                            <p className="text-[9px] text-gray-600 font-bold uppercase">{sel}</p>
                            <p className="font-black text-sm text-white">{match.displayOdds![sel]?.toFixed(2) ?? '—'}</p>
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
                            setOddsForm({ home: match.displayOdds?.home?.toString() ?? '', draw: match.displayOdds?.draw?.toString() ?? '', away: match.displayOdds?.away?.toString() ?? '', status: match.status });
                          }}
                          className="flex-1 bg-background border border-white/8 text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:border-white/20"
                        >
                          <Settings size={12} /> Odds {editingId === match._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {match.status === 'closed' && (
                          <button
                            onClick={() => setSettlingId(settlingId === match._id ? null : match._id)}
                            className="flex-1 bg-primary/10 text-primary border border-primary/20 text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/20"
                          >
                            <CheckCircle2 size={12} /> Settle {settlingId === match._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                        <button onClick={() => deleteMatch(match._id)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/20">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/20 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">Set Odds (what users see)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home','draw','away'] as const).map((sel) => (
                          <div key={sel}>
                            <label className="text-[9px] text-gray-600 font-bold uppercase block mb-1">{sel}</label>
                            <input
                              type="number" step="0.01" min="1.01"
                              value={oddsForm[sel]}
                              onChange={(e) => setOddsForm({...oddsForm, [sel]: e.target.value})}
                              className="w-full bg-background border border-white/8 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-accent/50"
                              placeholder="1.85"
                            />
                          </div>
                        ))}
                      </div>
                      <select
                        value={oddsForm.status}
                        onChange={(e) => setOddsForm({...oddsForm, status: e.target.value})}
                        className="w-full bg-background border border-white/8 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                      >
                        <option value="pending">Pending (hidden)</option>
                        <option value="open">Open (users can bet)</option>
                        <option value="closed">Closed (no more bets)</option>
                      </select>
                      <button onClick={() => saveOdds(match._id)} className="w-full py-2.5 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90">
                        Save
                      </button>
                    </div>
                  )}

                  {settlingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/20 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">Match Result</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home','draw','away'] as const).map((res) => (
                          <button
                            key={res}
                            onClick={() => setSettleResult(res)}
                            className={`py-2.5 rounded-xl font-black text-sm uppercase transition-all ${settleResult === res ? 'bg-primary text-background' : 'bg-background border border-white/8 text-gray-400 hover:text-white'}`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => settleMatch(match._id)} className="w-full py-2.5 bg-primary text-background rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90">
                        Confirm — {settleResult.toUpperCase()} wins
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── Withdrawals ── */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No pending withdrawals</p>
              : withdrawals.map((w) => (
                <div key={w._id} className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm">{w.userId?.username}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">{w.details?.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-black text-accent">{w.amount} USDT</p>
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleWithdrawal(w._id, 'approve')} className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-500/20 text-sm font-black uppercase tracking-wider">
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => handleWithdrawal(w._id, 'reject')} className="flex-1 bg-surface border border-white/8 text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase tracking-wider">
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── Applications ── */}
        {activeTab === 'applications' && (
          <div className="space-y-3">
            {applications.length === 0
              ? <p className="text-center text-gray-600 text-sm py-8">No applications yet</p>
              : applications.map((app) => (
                <div key={app._id} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedApp(expandedApp === app._id ? null : app._id)}
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
                    {expandedApp === app._id ? <ChevronUp size={16} className="text-gray-500 mt-1 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 mt-1 shrink-0" />}
                  </button>

                  {expandedApp === app._id && (
                    <div className="border-t border-white/5 p-4 space-y-3">
                      {/* Socials */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Telegram',  val: app.telegram  },
                          { label: 'Instagram', val: app.instagram },
                          { label: 'TikTok',    val: app.tiktok    },
                          { label: 'Twitter',   val: app.twitter   },
                          { label: 'YouTube',   val: app.youtube   },
                        ].filter(s => s.val).map((s) => (
                          <div key={s.label} className="bg-background border border-white/8 rounded-lg px-3 py-2">
                            <p className="text-[9px] font-bold text-gray-600 uppercase">{s.label}</p>
                            <p className="text-xs text-white font-medium truncate mt-0.5 flex items-center gap-1">
                              {s.val}
                              {s.val.startsWith('http') && <ExternalLink size={10} className="text-gray-500 shrink-0" />}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      <div className="bg-background border border-white/8 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-gray-600 mb-1.5">About their community</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{app.description}</p>
                      </div>

                      {/* Motivation */}
                      <div className="bg-background border border-white/8 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase text-gray-600 mb-1.5">Why they want to join</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{app.motivation}</p>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApplication(app._id, 'approved')} className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-500/20 text-sm font-black uppercase tracking-wider">
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => handleApplication(app._id, 'rejected')} className="flex-1 bg-surface border border-white/8 text-gray-400 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase tracking-wider">
                            <X size={14} /> Reject
                          </button>
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

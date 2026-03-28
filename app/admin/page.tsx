'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import {
  Shield, Check, X, Plus, RefreshCw, Trophy,
  ChevronDown, ChevronUp, Trash2, CheckCircle2, Settings,
} from 'lucide-react';
import { LEAGUES } from '@/lib/sports';

type MatchStatus = 'pending' | 'open' | 'closed' | 'settled';

interface Match {
  _id:         string;
  homeTeam:    string;
  awayTeam:    string;
  league:      string;
  date:        string;
  time:        string;
  status:      MatchStatus;
  displayOdds: { home: number; draw: number; away: number } | null;
  result:      string | null;
}

interface Withdrawal {
  _id:       string;
  userId:    { username: string };
  amount:    number;
  details:   { address: string };
  status:    string;
  createdAt: string;
}

const STATUS_COLOR: Record<MatchStatus, string> = {
  pending:  'text-yellow-400',
  open:     'text-green-400',
  closed:   'text-orange-400',
  settled:  'text-gray-400',
};

export default function AdminPage() {
  const [matches, setMatches]           = useState<Match[]>([]);
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab]       = useState<'matches' | 'withdrawals'>('matches');

  const [importLeague, setImportLeague] = useState('la_liga');
  const [importing, setImporting]       = useState(false);
  const [importMsg, setImportMsg]       = useState('');

  const [editingId, setEditingId]     = useState<string | null>(null);
  const [oddsForm, setOddsForm]       = useState({ home: '', draw: '', away: '', status: 'open' });

  const [settlingId, setSettlingId]     = useState<string | null>(null);
  const [settleResult, setSettleResult] = useState<'home' | 'draw' | 'away'>('home');

  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchMatches = useCallback(async () => {
    const res  = await fetch('/api/admin/matches');
    if (!res.ok) return;
    const data = await res.json();
    setMatches(data.matches ?? []);
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    const res  = await fetch('/api/admin/withdraw/pending');
    if (!res.ok) return;
    const data = await res.json();
    setWithdrawals(data.withdrawals ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data.user?.role === 'admin') {
          setIsAuthorized(true);
          fetchMatches();
          fetchWithdrawals();
        }
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [fetchMatches, fetchWithdrawals]);

  const importMatches = async () => {
    setImporting(true);
    setImportMsg('');
    const res  = await fetch('/api/admin/matches', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ league: importLeague }),
    });
    const data = await res.json();
    setImporting(false);
    setImportMsg(res.ok ? data.message : data.error);
    if (res.ok) fetchMatches();
  };

  const saveOdds = async (matchId: string) => {
    const home = parseFloat(oddsForm.home);
    const draw = parseFloat(oddsForm.draw);
    const away = parseFloat(oddsForm.away);

    if ([home, draw, away].some((o) => isNaN(o) || o < 1.01)) {
      notify('All odds must be numbers >= 1.01', false);
      return;
    }

    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ odds: { home, draw, away }, status: oddsForm.status }),
    });
    const data = await res.json();

    if (res.ok) {
      notify('Odds saved!', true);
      setEditingId(null);
      fetchMatches();
    } else {
      notify(data.error || 'Save failed', false);
    }
  };

  const settleMatch = async (matchId: string) => {
    const res  = await fetch(`/api/admin/matches/${matchId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ result: settleResult }),
    });
    const data = await res.json();

    if (res.ok) {
      notify(`Settled! Winners: ${data.winnersCount} · Losers: ${data.losersCount}`, true);
      setSettlingId(null);
      fetchMatches();
    } else {
      notify(data.error || 'Settle failed', false);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm('Delete this match and refund all pending bets?')) return;
    const res  = await fetch(`/api/admin/matches/${matchId}`, { method: 'DELETE' });
    const data = await res.json();
    res.ok ? notify(data.message, true) : notify(data.error || 'Delete failed', false);
    fetchMatches();
  };

  const handleWithdrawal = async (id: string, action: 'approve' | 'reject') => {
    const res  = await fetch('/api/admin/withdraw/approve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ transactionId: id, action }),
    });
    const data = await res.json();
    res.ok ? notify(`Withdrawal ${action}d`, true) : notify(data.error || 'Action failed', false);
    fetchWithdrawals();
  };

  if (checkingAuth) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAuthorized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-16 h-16 text-accent mb-4 opacity-50" />
          <h1 className="text-2xl font-black uppercase tracking-wider mb-2">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-wider">
          <Shield className="text-accent" /> Admin Panel
        </h1>

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
          {(['matches', 'withdrawals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-accent to-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'matches' ? <><Trophy size={14} /> Matches</> : <><Settings size={14} /> Withdrawals</>}
            </button>
          ))}
        </div>

        {/* ── Matches Tab ── */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {/* Import */}
            <div className="bg-surface rounded-2xl border border-white/5 p-4 space-y-3">
              <h2 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                <Plus size={14} className="text-accent" /> Import Matches from TheSportsDB
              </h2>
              <div className="flex gap-2">
                <select
                  value={importLeague}
                  onChange={(e) => setImportLeague(e.target.value)}
                  className="flex-1 bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                >
                  {Object.entries(LEAGUES).map(([key, val]) => (
                    <option key={key} value={key}>{val.name}</option>
                  ))}
                </select>
                <button
                  onClick={importMatches}
                  disabled={importing}
                  className="bg-accent text-white px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {importing
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <RefreshCw size={14} />}
                  Import All
                </button>
              </div>
              {importMsg && <p className="text-xs text-gray-400">{importMsg}</p>}
            </div>

            {matches.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No matches yet. Import a league above.</p>
            ) : (
              matches.map((match) => (
                <div key={match._id} className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-black">{match.homeTeam} vs {match.awayTeam}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{match.league} · {match.date} {match.time !== 'TBD' ? `· ${match.time}` : ''}</p>
                      </div>
                      <span className={`text-xs font-black uppercase ${STATUS_COLOR[match.status]}`}>{match.status}</span>
                    </div>

                    {match.displayOdds && (
                      <div className="flex gap-2 mt-3">
                        {(['home', 'draw', 'away'] as const).map((sel) => (
                          <div key={sel} className="flex-1 bg-background rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{sel}</p>
                            <p className="font-black text-secondary text-sm">{match.displayOdds![sel]?.toFixed(2) ?? '-'}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {match.status !== 'settled' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            if (editingId === match._id) { setEditingId(null); return; }
                            setEditingId(match._id);
                            setOddsForm({
                              home:   match.displayOdds?.home?.toString() ?? '',
                              draw:   match.displayOdds?.draw?.toString() ?? '',
                              away:   match.displayOdds?.away?.toString() ?? '',
                              status: match.status,
                            });
                          }}
                          className="flex-1 bg-background border border-white/10 text-sm font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-white/5"
                        >
                          <Settings size={13} /> Odds {editingId === match._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {match.status === 'closed' && (
                          <button
                            onClick={() => setSettlingId(settlingId === match._id ? null : match._id)}
                            className="flex-1 bg-primary/10 text-primary border border-primary/20 text-sm font-black py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-primary/20"
                          >
                            <CheckCircle2 size={13} /> Settle {settlingId === match._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}

                        <button
                          onClick={() => deleteMatch(match._id)}
                          className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Odds editor */}
                  {editingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/30 space-y-3">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        Set odds — exactly what users will see
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home', 'draw', 'away'] as const).map((sel) => (
                          <div key={sel}>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{sel}</label>
                            <input
                              type="number"
                              step="0.01"
                              min="1.01"
                              value={oddsForm[sel]}
                              onChange={(e) => setOddsForm({ ...oddsForm, [sel]: e.target.value })}
                              className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-accent/50"
                              placeholder="e.g. 1.85"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Status</label>
                        <select
                          value={oddsForm.status}
                          onChange={(e) => setOddsForm({ ...oddsForm, status: e.target.value })}
                          className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                        >
                          <option value="pending">Pending (not visible to users)</option>
                          <option value="open">Open (users can bet)</option>
                          <option value="closed">Closed (no more bets)</option>
                        </select>
                      </div>
                      <button
                        onClick={() => saveOdds(match._id)}
                        className="w-full py-2.5 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90"
                      >
                        Save Odds & Status
                      </button>
                    </div>
                  )}

                  {/* Settle panel */}
                  {settlingId === match._id && (
                    <div className="border-t border-white/5 p-4 bg-background/30 space-y-3">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Select Match Result</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['home', 'draw', 'away'] as const).map((res) => (
                          <button
                            key={res}
                            onClick={() => setSettleResult(res)}
                            className={`py-2.5 rounded-xl font-black text-sm uppercase transition-all ${
                              settleResult === res
                                ? 'bg-primary text-background'
                                : 'bg-background border border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => settleMatch(match._id)}
                        className="w-full py-2.5 bg-primary text-background rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90"
                      >
                        Confirm — {settleResult.toUpperCase()} wins
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Withdrawals Tab ── */}
        {activeTab === 'withdrawals' && (
          <div className="bg-surface rounded-2xl border border-white/5 p-4 space-y-4">
            <h2 className="font-black uppercase tracking-wider text-sm">Pending Withdrawals</h2>
            {withdrawals.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">No pending withdrawals</p>
            ) : (
              withdrawals.map((w) => (
                <div key={w._id} className="bg-background rounded-2xl border border-white/5 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black">{w.userId?.username}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1 break-all">{w.details?.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-accent">{w.amount} USDT</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWithdrawal(w._id, 'approve')}
                      className="flex-1 bg-accent/10 text-accent border border-accent/20 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-accent/20 text-sm font-black uppercase tracking-wider"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleWithdrawal(w._id, 'reject')}
                      className="flex-1 bg-surface border border-white/10 text-gray-400 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 text-sm font-black uppercase tracking-wider"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
    }

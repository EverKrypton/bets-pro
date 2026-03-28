'use client';

import { useState, useEffect } from 'react';
import Layout                  from '@/components/Layout';
import { Trophy, Clock, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence }      from 'motion/react';

interface Match {
  _id:         string;
  homeTeam:    string;
  awayTeam:    string;
  league:      string;
  date:        string;
  time:        string;
  displayOdds: { home: number; draw: number; away: number };
}

interface BetSlip {
  matchId:   string;
  homeTeam:  string;
  awayTeam:  string;
  selection: string;
  odd:       number;
  label:     string;
}

// Single-chance markets
const SINGLE: { key: 'home'|'draw'|'away'; label: string }[] = [
  { key: 'home', label: '1'  },
  { key: 'draw', label: 'X'  },
  { key: 'away', label: '2'  },
];

// Double-chance market labels
const DOUBLE_LABELS: Record<string, string> = {
  '1x': '1X — Home or Draw',
  'x2': 'X2 — Draw or Away',
  '12': '12 — Home or Away',
};

// Compute double chance odd from display odds
function dcOdd(odds: Match['displayOdds'], market: '1x'|'x2'|'12'): number {
  const pH = 1 / odds.home, pD = 1 / odds.draw, pA = 1 / odds.away;
  const combined = market === '1x' ? pH + pD : market === 'x2' ? pD + pA : pH + pA;
  return Math.max(1.01, Number((1 / combined).toFixed(2)));
}

const STATUS_COLOR: Record<string, string> = {
  won:      'text-green-400',
  lost:     'text-red-400',
  pending:  'text-yellow-400',
  refunded: 'text-gray-400',
};

export default function Sports() {
  const [matches, setMatches]   = useState<Match[]>([]);
  const [loading, setLoading]   = useState(true);
  const [slip, setSlip]         = useState<BetSlip | null>(null);
  const [amount, setAmount]     = useState('');
  const [placing, setPlacing]   = useState(false);
  const [message, setMessage]   = useState<{ text: string; ok: boolean } | null>(null);
  const [myBets, setMyBets]     = useState<any[]>([]);
  const [showBets, setShowBets] = useState(false);

  useEffect(() => { fetchMatches(); fetchMyBets(); }, []);

  const fetchMatches = async () => {
    try {
      const res  = await fetch('/api/matches');
      const data = await res.json();
      setMatches(data.matches ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBets = async () => {
    const res  = await fetch('/api/bets');
    if (!res.ok) return;
    const data = await res.json();
    setMyBets(data.bets ?? []);
  };

  const pick = (match: Match, key: string, odd: number, label: string) => {
    if (slip?.matchId === match._id && slip?.selection === key) {
      setSlip(null);
      return;
    }
    setSlip({ matchId: match._id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, selection: key, odd, label });
    setAmount('');
    setMessage(null);
  };

  const placeBet = async () => {
    if (!slip || !amount || isNaN(Number(amount)) || Number(amount) < 1) return;
    setPlacing(true);
    setMessage(null);

    const res  = await fetch('/api/bet/place', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ matchId: slip.matchId, selection: slip.selection, amount: Number(amount) }),
    });
    const data = await res.json();
    setPlacing(false);

    if (res.ok) {
      setMessage({ text: `✓ Bet placed · Potential win: ${(Number(amount) * slip.odd).toFixed(2)} USDT`, ok: true });
      setSlip(null);
      setAmount('');
      fetchMyBets();
    } else {
      setMessage({ text: data.error || 'Bet failed', ok: false });
    }
  };

  const potWin = slip && amount && Number(amount) > 0
    ? (Number(amount) * slip.odd).toFixed(2) : '—';

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between py-1">
          <h1 className="text-xl font-black flex items-center gap-2">
            <Trophy size={20} className="text-accent" /> Sportsbook
          </h1>
          <button
            onClick={() => { setShowBets(!showBets); fetchMyBets(); }}
            className="flex items-center gap-2 bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <TrendingUp size={13} /> My Bets
            {myBets.length > 0 && (
              <span className="bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {myBets.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback */}
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            message.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* My Bets */}
        <AnimatePresence>
          {showBets && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="bg-surface border border-white/8 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-wider">My Bets</span>
                <button onClick={() => setShowBets(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              {myBets.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-8">No bets yet</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {myBets.map((b) => (
                    <div key={b._id} className="px-4 py-3 flex justify-between items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {DOUBLE_LABELS[b.selection] ?? b.selection?.toUpperCase()} · {b.multiplier?.toFixed(2)}x
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-black">{b.amount} USDT</p>
                        <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${STATUS_COLOR[b.status] ?? 'text-gray-500'}`}>
                          {b.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet Slip */}
        <AnimatePresence>
          {slip && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-surface border border-accent/40 rounded-2xl overflow-hidden"
            >
              <div className="flex items-start justify-between px-4 py-3 border-b border-white/8">
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Bet Slip</p>
                  <p className="font-black text-sm mt-0.5">{slip.homeTeam} vs {slip.awayTeam}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DOUBLE_LABELS[slip.selection] ?? slip.label.replace('1','Home').replace('2','Away')}
                    {' · '}<span className="text-white font-bold">{slip.odd.toFixed(2)}x</span>
                  </p>
                </div>
                <button
                  onClick={() => setSlip(null)}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex bg-background border border-white/8 rounded-xl overflow-hidden focus-within:border-accent/50 transition-colors">
                  <span className="flex items-center pl-4 text-xs font-bold text-gray-500">USDT</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none font-black text-lg"
                    min={1}
                    autoFocus
                  />
                </div>

                <div className="flex gap-1.5">
                  {[5, 10, 25, 50, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                        Number(amount) === v
                          ? 'bg-accent/20 border-accent/50 text-white'
                          : 'bg-background border-white/8 text-gray-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center px-0.5">
                  <span className="text-xs text-gray-500">Potential win</span>
                  <span className="font-black text-sm text-primary">{potWin} USDT</span>
                </div>

                <button
                  onClick={placeBet}
                  disabled={placing || !amount || Number(amount) < 1}
                  className="w-full py-3.5 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {placing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Placing...
                    </span>
                  ) : 'Place Bet'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matches */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="mx-auto mb-3 text-gray-700" size={40} />
            <p className="font-bold text-sm text-gray-500">No matches open right now</p>
            <p className="text-xs text-gray-600 mt-1">Check back soon</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const activeSel = slip?.matchId === match._id ? slip.selection : null;
              return (
                <div
                  key={match._id}
                  className={`bg-surface border rounded-2xl overflow-hidden transition-colors ${
                    activeSel ? 'border-accent/40' : 'border-white/8'
                  }`}
                >
                  {/* Match info */}
                  <div className="px-4 py-2.5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{match.league}</span>
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                      <Clock size={10} />
                      <span>{match.date}{match.time !== 'TBD' ? ` · ${match.time}` : ''}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Teams */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-white/5 border border-white/8 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">H</span>
                        <span className="font-bold text-sm">{match.homeTeam}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-white/5 border border-white/8 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">A</span>
                        <span className="font-bold text-sm">{match.awayTeam}</span>
                      </div>
                    </div>

                    {/* 1X2 */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Match Result</p>
                      <div className="grid grid-cols-3 gap-2">
                        {SINGLE.map(({ key, label }) => {
                          const odd      = match.displayOdds?.[key];
                          const isActive = activeSel === key;
                          return (
                            <button
                              key={key}
                              onClick={() => pick(match, key, odd, label)}
                              disabled={!odd}
                              className={`py-3 rounded-xl border flex flex-col items-center gap-0.5 transition-all active:scale-95 disabled:opacity-30 ${
                                isActive
                                  ? 'bg-accent border-accent'
                                  : 'bg-background border-white/8 hover:border-white/20'
                              }`}
                            >
                              <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-white/70' : 'text-gray-600'}`}>{label}</span>
                              <span className="font-black text-base">{odd ? odd.toFixed(2) : '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Double Chance */}
                    {match.displayOdds?.home && match.displayOdds?.draw && match.displayOdds?.away && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Double Chance</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['1x','x2','12'] as const).map((dc) => {
                            const odd      = dcOdd(match.displayOdds, dc);
                            const isActive = activeSel === dc;
                            return (
                              <button
                                key={dc}
                                onClick={() => pick(match, dc, odd, dc.toUpperCase())}
                                className={`py-3 rounded-xl border flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                                  isActive
                                    ? 'bg-accent border-accent'
                                    : 'bg-background border-white/8 hover:border-white/20'
                                }`}
                              >
                                <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-white/70' : 'text-gray-600'}`}>{dc.toUpperCase()}</span>
                                <span className="font-black text-base">{odd.toFixed(2)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

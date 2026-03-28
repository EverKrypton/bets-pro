'use client';

import { useState, useEffect } from 'react';
import Layout                  from '@/components/Layout';
import { Trophy, Clock, X, ChevronRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  selection: 'home' | 'draw' | 'away';
  odd:       number;
}

const LABEL: Record<string, string> = { home: '1', draw: 'X', away: '2' };
const SEL_LABEL: Record<string, string> = { home: 'Home Win', draw: 'Draw', away: 'Away Win' };

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

  const selectOdd = (match: Match, selection: 'home' | 'draw' | 'away') => {
    const odd = match.displayOdds?.[selection];
    if (!odd) return;
    if (slip?.matchId === match._id && slip?.selection === selection) {
      setSlip(null);
      return;
    }
    setSlip({ matchId: match._id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, selection, odd });
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
      setMessage({ text: `✓ Bet placed — potential win: ${(Number(amount) * slip.odd).toFixed(2)} USDT`, ok: true });
      setSlip(null);
      setAmount('');
      fetchMyBets();
    } else {
      setMessage({ text: data.error || 'Bet failed', ok: false });
    }
  };

  const potentialWin = slip && amount && !isNaN(Number(amount)) && Number(amount) > 0
    ? (Number(amount) * slip.odd).toFixed(2)
    : '—';

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between py-1">
          <h1 className="text-xl font-black flex items-center gap-2 tracking-wide">
            <Trophy size={20} className="text-accent" /> Sportsbook
          </h1>
          <button
            onClick={() => { setShowBets(!showBets); fetchMyBets(); }}
            className="flex items-center gap-2 bg-surface border border-white/8 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <TrendingUp size={13} />
            My Bets
            {myBets.length > 0 && (
              <span className="bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {myBets.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback */}
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            message.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* My Bets drawer */}
        <AnimatePresence>
          {showBets && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="bg-surface border border-white/8 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/8 flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-wider">My Bets</span>
                <button onClick={() => setShowBets(false)} className="text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              {myBets.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No bets placed yet</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {myBets.map((b) => (
                    <div key={b._id} className="px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-white">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {SEL_LABEL[b.selection] ?? b.selection} · {b.multiplier?.toFixed(2)}x
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">{b.amount} USDT</p>
                        <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${
                          b.status === 'won'      ? 'text-green-400' :
                          b.status === 'lost'     ? 'text-red-400'   :
                          b.status === 'pending'  ? 'text-yellow-400': 'text-gray-500'
                        }`}>{b.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet Slip — sticky bottom style */}
        <AnimatePresence>
          {slip && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              className="bg-surface border border-accent/40 rounded-2xl overflow-hidden"
            >
              {/* Slip header */}
              <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-accent/20">
                <div>
                  <p className="text-xs text-accent font-bold uppercase tracking-wider">Bet Slip</p>
                  <p className="text-sm font-black text-white mt-0.5">
                    {slip.homeTeam} vs {slip.awayTeam}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {SEL_LABEL[slip.selection]} · <span className="text-white font-bold">{slip.odd.toFixed(2)}x</span>
                  </p>
                </div>
                <button
                  onClick={() => setSlip(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Amount input */}
              <div className="p-4 space-y-3">
                <div className="flex bg-background border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/60 transition-colors">
                  <span className="flex items-center pl-4 text-sm font-bold text-gray-400">USDT</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none font-black text-lg text-white"
                    min={1}
                    autoFocus
                  />
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-2 rounded-lg bg-background border border-white/8 text-xs font-bold text-gray-400 hover:text-white hover:border-white/20 transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Payout row */}
                <div className="flex justify-between items-center px-1 py-1">
                  <span className="text-xs text-gray-500">Potential win</span>
                  <span className="font-black text-primary text-sm">{potentialWin} USDT</span>
                </div>

                <button
                  onClick={placeBet}
                  disabled={placing || !amount || Number(amount) < 1}
                  className="w-full py-3.5 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
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

        {/* Match list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Trophy className="mx-auto mb-3 opacity-20" size={44} />
            <p className="font-bold text-sm">No matches available</p>
            <p className="text-xs mt-1 text-gray-600">Admin hasn't opened any matches yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const activeSelection = slip?.matchId === match._id ? slip.selection : null;
              return (
                <div
                  key={match._id}
                  className={`bg-surface border rounded-2xl overflow-hidden transition-colors ${
                    activeSelection ? 'border-accent/40' : 'border-white/8'
                  }`}
                >
                  {/* Match header */}
                  <div className="px-4 py-2.5 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {match.league}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                      <Clock size={11} />
                      <span>{match.date}{match.time !== 'TBD' ? ` · ${match.time}` : ''}</span>
                    </div>
                  </div>

                  {/* Teams + odds */}
                  <div className="p-4">
                    {/* Teams */}
                    <div className="mb-4 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">H</span>
                        <span className="font-bold text-sm text-white">{match.homeTeam}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">A</span>
                        <span className="font-bold text-sm text-white">{match.awayTeam}</span>
                      </div>
                    </div>

                    {/* Odds buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {(['home', 'draw', 'away'] as const).map((sel) => {
                        const odd      = match.displayOdds?.[sel];
                        const isActive = activeSelection === sel;
                        return (
                          <button
                            key={sel}
                            onClick={() => selectOdd(match, sel)}
                            disabled={!odd}
                            className={`
                              py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5
                              border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                              ${isActive
                                ? 'bg-accent border-accent text-white'
                                : 'bg-background border-white/8 hover:border-white/20 hover:bg-white/5'
                              }
                            `}
                          >
                            <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                              {LABEL[sel]}
                            </span>
                            <span className={`font-black text-base ${isActive ? 'text-white' : 'text-white'}`}>
                              {odd ? odd.toFixed(2) : '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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

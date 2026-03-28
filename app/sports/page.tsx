'use client';

import { useState, useEffect } from 'react';
import Layout                   from '@/components/Layout';
import { Trophy, Clock, ChevronRight, X, AlertCircle } from 'lucide-react';
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

export default function Sports() {
  const [matches, setMatches]   = useState<Match[]>([]);
  const [loading, setLoading]   = useState(true);
  const [slip, setSlip]         = useState<BetSlip | null>(null);
  const [amount, setAmount]     = useState('');
  const [placing, setPlacing]   = useState(false);
  const [message, setMessage]   = useState<{ text: string; ok: boolean } | null>(null);
  const [myBets, setMyBets]     = useState<any[]>([]);
  const [showBets, setShowBets] = useState(false);

  useEffect(() => {
    fetchMatches();
    fetchMyBets();
  }, []);

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
      setMessage({ text: `Bet placed! Potential win: ${(Number(amount) * slip.odd).toFixed(2)} USDT`, ok: true });
      setSlip(null);
      setAmount('');
      fetchMyBets();
    } else {
      setMessage({ text: data.error || 'Bet failed', ok: false });
    }
  };

  const potentialWin = slip && amount && !isNaN(Number(amount))
    ? (Number(amount) * slip.odd).toFixed(2)
    : '0.00';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black flex items-center gap-2 uppercase tracking-wider">
            <Trophy className="text-accent" /> Sportsbook
          </h1>
          <button
            onClick={() => { setShowBets(!showBets); fetchMyBets(); }}
            className="bg-surface border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            My Bets ({myBets.length})
          </button>
        </div>

        {message && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
            message.ok
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <AlertCircle size={16} /> {message.text}
          </div>
        )}

        {/* My Bets */}
        <AnimatePresence>
          {showBets && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-surface rounded-2xl border border-white/5 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 font-black uppercase tracking-wider text-sm">My Sport Bets</div>
              {myBets.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No bets yet</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {myBets.map((b) => (
                    <div key={b._id} className="p-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-xs text-gray-400">{b.selection?.toUpperCase()} @ {b.multiplier?.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black">{b.amount} USDT</p>
                        <p className={`text-xs font-bold ${
                          b.status === 'won' ? 'text-green-400' :
                          b.status === 'lost' ? 'text-red-400' :
                          b.status === 'pending' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>{b.status.toUpperCase()}</p>
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface rounded-2xl border border-accent/30 p-4 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Bet Slip</p>
                  <p className="font-black">{slip.homeTeam} vs {slip.awayTeam}</p>
                  <p className="text-sm text-accent font-bold mt-1">
                    {LABEL[slip.selection]} ({slip.selection.charAt(0).toUpperCase() + slip.selection.slice(1)}) @ {slip.odd.toFixed(2)}
                  </p>
                </div>
                <button onClick={() => setSlip(null)} className="text-gray-400 hover:text-white p-1"><X size={18} /></button>
              </div>

              <div className="flex bg-background rounded-xl border border-white/5 overflow-hidden focus-within:border-accent/50 transition-colors">
                <span className="pl-4 flex items-center text-accent font-bold text-sm">USDT</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (min 1)"
                  className="flex-1 bg-transparent px-3 py-3 outline-none font-bold text-lg"
                  min={1}
                />
              </div>

              <div className="flex justify-between text-sm text-gray-400">
                <span>Potential win</span>
                <span className="font-black text-primary">{potentialWin} USDT</span>
              </div>

              <button
                onClick={placeBet}
                disabled={placing || !amount || Number(amount) < 1}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent text-white font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing ? 'Placing...' : 'Place Bet'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matches */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy className="mx-auto mb-3 opacity-30" size={40} />
            <p className="font-bold">No matches available right now</p>
            <p className="text-sm mt-1">Check back later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match._id}
                className={`bg-surface rounded-2xl border overflow-hidden transition-colors ${
                  slip?.matchId === match._id ? 'border-accent/50' : 'border-white/5 hover:border-accent/30'
                }`}
              >
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-background/50">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    {match.league}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Clock size={12} />
                    {match.date} {match.time !== 'TBD' ? `• ${match.time}` : ''}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-background border border-white/10 flex items-center justify-center text-[10px] font-bold">H</div>
                        <span className="font-semibold">{match.homeTeam}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-background border border-white/10 flex items-center justify-center text-[10px] font-bold">A</div>
                        <span className="font-semibold">{match.awayTeam}</span>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['home', 'draw', 'away'] as const).map((sel) => {
                      const odd      = match.displayOdds?.[sel];
                      const isActive = slip?.matchId === match._id && slip?.selection === sel;
                      return (
                        <button
                          key={sel}
                          onClick={() => selectOdd(match, sel)}
                          disabled={!odd}
                          className={`rounded-xl py-3 flex flex-col items-center justify-center transition-all disabled:opacity-40 ${
                            isActive
                              ? 'bg-accent/20 border border-accent text-accent'
                              : 'bg-background border border-white/5 hover:bg-white/5 hover:border-secondary/30'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase">{LABEL[sel]}</span>
                          <span className={`font-black ${isActive ? 'text-accent' : 'text-secondary'}`}>
                            {odd ? odd.toFixed(2) : '-'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

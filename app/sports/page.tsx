'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { X, TrendingUp, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Odds { home: number; draw: number; away: number; }

interface Match {
  _id:         string;
  homeTeam:    string;
  awayTeam:    string;
  homeBadge:   string;
  awayBadge:   string;
  league:      string;
  date:        string;
  time:        string;
  displayOdds: Odds;
}

interface BetSlip {
  matchId:   string;
  homeTeam:  string;
  awayTeam:  string;
  selection: string;
  odd:       number;
  label:     string;
}

const DC_LABEL: Record<string, string> = {
  '1x': '1X', 'x2': 'X2', '12': '12',
};

const SEL_FULL: Record<string, string> = {
  home: 'Home Win', draw: 'Draw', away: 'Away Win',
  '1x': 'Home or Draw', 'x2': 'Draw or Away', '12': 'Home or Away',
};

function validOdds(o?: Odds | null): boolean {
  return !!o && o.home > 1.01 && o.draw > 1.01 && o.away > 1.01;
}

function dcOdd(odds: Odds, m: '1x' | 'x2' | '12'): number {
  const pH = 1 / odds.home, pD = 1 / odds.draw, pA = 1 / odds.away;
  const p  = m === '1x' ? pH + pD : m === 'x2' ? pD + pA : pH + pA;
  return Math.max(1.02, Number((1 / p).toFixed(2)));
}

function TeamBadge({ url, name, size = 32 }: { url?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0 uppercase"
      >
        {name.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      style={{ width: size, height: size }}
      className="rounded-full object-contain shrink-0 bg-white/5 p-0.5"
      onError={() => setErr(true)}
    />
  );
}

const STATUS_COLOR: Record<string, string> = {
  won: 'text-green-400', lost: 'text-red-400',
  pending: 'text-yellow-400', refunded: 'text-gray-500',
};

export default function Sports() {
  const [matches, setMatches]     = useState<Match[]>([]);
  const [filtered, setFiltered]   = useState<Match[]>([]);
  const [loading, setLoading]     = useState(true);
  const [leagues, setLeagues]     = useState<string[]>([]);
  const [activeLeague, setActiveLeague] = useState('All');
  const [slip, setSlip]           = useState<BetSlip | null>(null);
  const [amount, setAmount]       = useState('');
  const [placing, setPlacing]     = useState(false);
  const [message, setMessage]     = useState<{ text: string; ok: boolean } | null>(null);
  const [myBets, setMyBets]       = useState<any[]>([]);
  const [showBets, setShowBets]   = useState(false);
  const [search, setSearch]       = useState('');
  const leagueRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMatches(); fetchMyBets(); }, []);

  useEffect(() => {
    let list = matches;
    if (activeLeague !== 'All') list = list.filter(m => m.league === activeLeague);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [matches, activeLeague, search]);

  const fetchMatches = async () => {
    try {
      const res  = await fetch('/api/matches');
      const data = await res.json();
      const list: Match[] = data.matches ?? [];
      setMatches(list);
      const uniq = ['All', ...Array.from(new Set(list.map(m => m.league).filter(Boolean)))];
      setLeagues(uniq);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBets = async () => {
    const res  = await fetch('/api/bets');
    if (!res.ok) return;
    setMyBets((await res.json()).bets ?? []);
  };

  const pick = (match: Match, key: string, odd: number) => {
    if (slip?.matchId === match._id && slip?.selection === key) { setSlip(null); return; }
    setSlip({ matchId: match._id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, selection: key, odd, label: SEL_FULL[key] });
    setAmount('');
    setMessage(null);
  };

  const placeBet = async () => {
    if (!slip || !amount || Number(amount) < 1) return;
    setPlacing(true);
    setMessage(null);
    const res  = await fetch('/api/bet/place', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: slip.matchId, selection: slip.selection, amount: Number(amount) }),
    });
    const data = await res.json();
    setPlacing(false);
    if (res.ok) {
      setMessage({ text: `✓ Bet placed — Win: ${(Number(amount) * slip.odd).toFixed(2)} USDT`, ok: true });
      setSlip(null); setAmount(''); fetchMyBets();
    } else {
      setMessage({ text: data.error || 'Bet failed', ok: false });
    }
  };

  const potWin = slip && Number(amount) > 0 ? (Number(amount) * slip.odd).toFixed(2) : '—';

  // Group by league for display
  const grouped = filtered.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.league || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-3 -mx-4 px-0">

        {/* Search bar */}
        <div className="px-4">
          <div className="flex items-center gap-2 bg-surface border border-white/8 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search team or match..."
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* League tabs */}
        <div ref={leagueRef} className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
          {leagues.map(lg => (
            <button
              key={lg}
              onClick={() => setActiveLeague(lg)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                activeLeague === lg
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-white/8 text-gray-500 hover:text-white'
              }`}
            >
              {lg}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {message && (
          <div className={`mx-4 rounded-xl px-4 py-3 text-sm font-medium border ${
            message.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* My Bets */}
        <div className="px-4 flex items-center justify-between">
          <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
            {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
          </p>
          <button
            onClick={() => { setShowBets(!showBets); fetchMyBets(); }}
            className="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-white transition-colors"
          >
            <TrendingUp size={13} /> My Bets
            {myBets.length > 0 && (
              <span className="bg-accent text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{myBets.length}</span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showBets && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mx-4 bg-surface border border-white/8 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider">My Bets</span>
                <button onClick={() => setShowBets(false)}><X size={15} className="text-gray-500" /></button>
              </div>
              {myBets.length === 0
                ? <p className="text-center text-gray-600 text-xs py-6">No bets yet</p>
                : (
                  <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                    {myBets.map(b => (
                      <div key={b._id} className="px-4 py-3 flex justify-between items-center">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{SEL_FULL[b.selection] ?? b.selection} · {b.multiplier?.toFixed(2)}x</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs font-black">{b.amount} USDT</p>
                          <p className={`text-[9px] font-black uppercase ${STATUS_COLOR[b.status] ?? 'text-gray-500'}`}>{b.status}</p>
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
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="mx-4 bg-surface border border-accent/40 rounded-2xl overflow-hidden"
            >
              <div className="flex items-start justify-between px-4 py-3 bg-accent/10 border-b border-accent/20">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest">Bet Slip</p>
                  <p className="font-black text-sm mt-0.5">{slip.homeTeam} vs {slip.awayTeam}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{slip.label} · <span className="text-white font-black">{slip.odd.toFixed(2)}x</span></p>
                </div>
                <button onClick={() => setSlip(null)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white mt-0.5">
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex bg-background border border-white/8 rounded-xl overflow-hidden focus-within:border-accent/50 transition-colors">
                  <span className="flex items-center pl-4 text-xs text-gray-500 font-bold">USDT</span>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" min={1} autoFocus
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none font-black text-lg"
                  />
                </div>
                <div className="flex gap-1.5">
                  {[5,10,25,50,100].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        Number(amount) === v ? 'bg-accent/20 border-accent/50 text-white' : 'bg-background border-white/8 text-gray-500 hover:text-white'
                      }`}
                    >{v}</button>
                  ))}
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Potential win</span>
                  <span className="font-black text-primary">{potWin} USDT</span>
                </div>
                <button onClick={placeBet} disabled={placing || !amount || Number(amount) < 1}
                  className="w-full py-3.5 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {placing ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Placing...</span> : 'Place Bet'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
            <p className="text-xs text-gray-600">Loading matches...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-bold text-sm text-gray-500">No matches available</p>
          </div>
        ) : (
          <div>
            {Object.entries(grouped).map(([lg, lgMatches]) => (
              <div key={lg}>
                {/* League header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/60 border-y border-white/5 sticky top-[57px] z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{lg}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{lgMatches.length} match{lgMatches.length !== 1 ? 'es' : ''}</span>
                </div>

                <div className="divide-y divide-white/5">
                  {lgMatches.map(match => {
                    const activeSel  = slip?.matchId === match._id ? slip.selection : null;
                    const hasOdds    = validOdds(match.displayOdds);

                    return (
                      <div key={match._id} className={`bg-background transition-colors ${activeSel ? 'bg-accent/5' : ''}`}>
                        {/* Date/time + match header */}
                        <div className="px-4 pt-3 pb-2">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-gray-600 font-bold">
                              {match.date}{match.time !== 'TBD' ? ` · ${match.time}` : ''}
                            </span>
                            <ChevronRight size={13} className="text-gray-700" />
                          </div>

                          {/* Teams */}
                          <div className="space-y-2.5">
                            {/* Home */}
                            <div className="flex items-center gap-3">
                              <TeamBadge url={match.homeBadge} name={match.homeTeam} size={28} />
                              <span className="font-bold text-sm text-white flex-1 truncate">{match.homeTeam}</span>
                            </div>
                            {/* Away */}
                            <div className="flex items-center gap-3">
                              <TeamBadge url={match.awayBadge} name={match.awayTeam} size={28} />
                              <span className="font-bold text-sm text-white flex-1 truncate">{match.awayTeam}</span>
                            </div>
                          </div>
                        </div>

                        {/* Odds section */}
                        {hasOdds ? (
                          <div className="px-4 pb-3 space-y-2">
                            {/* 1X2 row */}
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['home','draw','away'] as const).map((sel, i) => {
                                const label   = ['1','X','2'][i];
                                const odd     = match.displayOdds[sel];
                                const isActive = activeSel === sel;
                                return (
                                  <button key={sel} onClick={() => pick(match, sel, odd)}
                                    className={`py-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                                      isActive ? 'bg-accent border-accent' : 'bg-surface border-white/8 hover:border-white/20'
                                    }`}
                                  >
                                    <span className={`text-[9px] font-bold ${isActive ? 'text-white/60' : 'text-gray-500'}`}>{label}</span>
                                    <span className="font-black text-sm">{odd.toFixed(2)}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Double Chance row */}
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['1x','x2','12'] as const).map(dc => {
                                const odd      = dcOdd(match.displayOdds, dc);
                                const isActive = activeSel === dc;
                                return (
                                  <button key={dc} onClick={() => pick(match, dc, odd)}
                                    className={`py-2 rounded-xl border flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                                      isActive ? 'bg-accent border-accent' : 'bg-surface border-white/8 hover:border-white/20'
                                    }`}
                                  >
                                    <span className={`text-[9px] font-bold ${isActive ? 'text-white/60' : 'text-gray-500'}`}>{DC_LABEL[dc]}</span>
                                    <span className="font-black text-sm">{odd.toFixed(2)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 pb-3">
                            <p className="text-[10px] text-gray-700 text-center py-1 font-bold">Odds coming soon</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

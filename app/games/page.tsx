'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Clock, X, ChevronDown, ChevronUp, Info, Lock, TrendingDown, Zap, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Odds  { home: number; draw: number; away: number; }
interface GoalOdds {
  homeOver05?: number; homeOver15?: number; homeUnder05?: number;
  awayOver05?: number; awayOver15?: number; awayUnder05?: number;
  totalOver15?: number; totalOver25?: number; totalUnder15?: number; totalUnder25?: number;
  bttsYes?: number; bttsNo?: number;
}
interface Match {
  _id: string; homeTeam: string; awayTeam: string;
  homeBadge: string; awayBadge: string;
  league: string; date: string; time: string;
  displayOdds: Odds; status: 'open'|'closed'|'settled';
  displayStatus?: 'open'|'closed'|'finished'|'settled';
  result?: string|null; moneyBack?: boolean; apiId?: string;
  goalOdds?: GoalOdds;
}
interface LiveEvent {
  apiId: string; homeTeam: string; awayTeam: string;
  homeScore: string|null; awayScore: string|null;
  minute: string; status: string; league: string; isLive?: boolean;
}
interface SlipItem {
  matchId: string; homeTeam: string; awayTeam: string;
  selection: string; label: string; odd: number; moneyBack?: boolean;
}

const ML_INVERSE: Record<string,string> = {
  home:'NOT 1', draw:'NOT X', away:'NOT 2',
  '1x':'NOT 12', 'x2':'NOT 1X', '12':'NOT X2',
};
const MF_INVERSE: Record<string,string> = {
  home:'Home Loses/Draws', draw:'No Draw', away:'Away Loses/Draws',
  '1x':'Neither Home Nor Draw', 'x2':'Neither Draw Nor Away', '12':'Neither Home Nor Away',
};

function inverseOdds(odds: number): number {
  if (odds <= 1) return 999;
  return Math.max(1.01, Number((odds / (odds - 1)).toFixed(3)));
}

function dcInverseOdd(o: Odds, m: '1x'|'x2'|'12'): number {
  const invH = inverseOdds(o.home);
  const invD = inverseOdds(o.draw);
  const invA = inverseOdds(o.away);
  const pH=1/invH, pD=1/invD, pA=1/invA;
  const p = m==='1x' ? pH+pD : m==='x2' ? pD+pA : pH+pA;
  return Math.max(1.02, Number((1/p).toFixed(2)));
}

function hasOdds(o?: Odds|null) { return !!o && o.home>1.01 && o.draw>1.01 && o.away>1.01; }

function Badge({ url, name, size=36 }: { url?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const init = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  if (!url || err) return (
    <div style={{width:size,height:size,fontSize:size*0.28}}
      className="rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-black text-gray-400 shrink-0">
      {init}
    </div>
  );
  return <img src={url} alt={name} style={{width:size,height:size}}
    className="rounded-full object-contain shrink-0 bg-white/5" onError={()=>setErr(true)} />;
}

function OddBtn({ label, odd, active, onClick, disabled=false, inverse=false }: {
  label:string; odd:number; active:boolean; onClick:()=>void; disabled?:boolean; inverse?:boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all active:scale-95 select-none relative overflow-hidden
        ${active ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                 : 'bg-[#1a1f27] border-white/8 hover:border-yellow-500/30 hover:bg-yellow-500/5'}
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <span className={`text-[10px] font-bold uppercase leading-none mb-0.5 ${active?'text-yellow-400':'text-gray-500'}`}>{label}</span>
      <span className={`font-black text-sm leading-none ${active?'text-yellow-400':'text-white'}`}>{odd.toFixed(2)}</span>
    </button>
  );
}

const STATUS_PILL: Record<string,string> = {
  won:      'text-green-400 bg-green-500/15 border-green-500/20',
  lost:     'text-red-400 bg-red-500/15 border-red-500/20',
  pending:  'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  refunded: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
};

function useLiveMinute(baseMinute: string | undefined, isLive: boolean) {
  const [display, setDisplay] = useState(baseMinute ?? '');
  const base = useRef(baseMinute);
  const start = useRef(Date.now());

  useEffect(() => {
    if (baseMinute !== undefined) { base.current = baseMinute; start.current = Date.now(); }
  }, [baseMinute]);

  useEffect(() => {
    if (!isLive) { setDisplay(baseMinute ?? ''); return; }
    const parsed = parseInt(base.current ?? '0');
    if (isNaN(parsed)) { setDisplay(base.current ?? ''); return; }
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start.current) / 60000);
      setDisplay(String(Math.min(90, parsed + elapsed)) + "'");
    }, 10000);
    setDisplay(String(parsed) + "'");
    return () => clearInterval(id);
  }, [isLive, baseMinute]);

  return display;
}

function LiveScore({ live }: { live: LiveEvent }) {
  const minute = useLiveMinute(live.minute, live.isLive ?? true);
  return (
    <motion.div
      initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
      className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"/>
      <span className="text-red-400 font-black text-sm tabular-nums">
        {live.homeScore ?? '0'}–{live.awayScore ?? '0'}
      </span>
      {minute && <span className="text-red-400/70 text-[10px] font-bold">{minute}</span>}
    </motion.div>
  );
}

export default function InversePage() {
  const [matches,      setMatches]      = useState<Match[]>([]);
  const [liveMap,      setLiveMap]      = useState<Record<string,LiveEvent>>({});
  const [prevScores,   setPrevScores]   = useState<Record<string,string>>({});
  const [scoreBump,    setScoreBump]    = useState<Record<string,boolean>>({});
  const [loading,      setLoading]      = useState(true);
  const [leagues,      setLeagues]      = useState<string[]>([]);
  const [activeLeague, setActiveLeague] = useState('All');
  const [expandedDC,   setExpandedDC]   = useState<Record<string,boolean>>({});
  const [slip,         setSlip]         = useState<SlipItem|null>(null);
  const [amount,       setAmount]       = useState('');
  const [placing,      setPlacing]      = useState(false);
  const [feedback,     setFeedback]     = useState<{text:string;ok:boolean}|null>(null);
  const [myBets,       setMyBets]       = useState<any[]>([]);
  const [showBets,     setShowBets]     = useState(false);
  const [maxBet,       setMaxBet]       = useState(50);
  const [minBet,       setMinBet]       = useState(1);
  const [refreshSecs,  setRefreshSecs]  = useState(30);
  const [liveCount,    setLiveCount]    = useState(0);
  const [menuOpen,    setMenuOpen]     = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/livescores');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string,LiveEvent> = {};
      let count = 0;
      for (const e of (data.events ?? [])) {
        if (e.isLive) count++;
        map[e.apiId]                               = e;
        map[`${e.homeTeam}|${e.awayTeam}`]         = e;
        map[`${e.homeTeam}|${e.awayTeam}|${e.league}`] = e;
      }
      setLiveMap(prev => {
        const bumps: Record<string,boolean> = {};
        for (const [k, ev] of Object.entries(map)) {
          const prev_score = `${prev[k]?.homeScore}-${prev[k]?.awayScore}`;
          const next_score = `${ev.homeScore}-${ev.awayScore}`;
          if (prev[k] && prev_score !== next_score) { bumps[k] = true; }
        }
        if (Object.keys(bumps).length) {
          setScoreBump(b => ({ ...b, ...bumps }));
          setTimeout(() => setScoreBump({}), 2000);
        }
        return map;
      });
      setLiveCount(count);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mRes, sRes] = await Promise.all([fetch('/api/matches'), fetch('/api/settings/public')]);
        const list: Match[] = (await mRes.json()).matches ?? [];
        setMatches(list);
        setLeagues(Array.from(new Set(list.map(m=>m.league).filter(Boolean))));
        if (sRes.ok) {
          const s = await sRes.json();
          setMaxBet(s.maxBetAmount ?? 50);
          setMinBet(s.minBetAmount ?? 1);
          setRefreshSecs(s.liveScoreRefreshSecs ?? 30);
        }
      } finally { setLoading(false); }
    })();
    fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(fetchLive, refreshSecs * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refreshSecs, fetchLive]);

  const fetchMyBets = async () => {
    const res = await fetch('/api/bets/inverse');
    if (!res.ok) return;
    setMyBets((await res.json()).bets ?? []);
  };

  const getLive = (m: Match): LiveEvent|null => {
    if (m.apiId && liveMap[m.apiId]) return liveMap[m.apiId];
    return liveMap[`${m.homeTeam}|${m.awayTeam}`]
        ?? liveMap[`${m.homeTeam}|${m.awayTeam}|${m.league}`]
        ?? null;
  };

  const filtered = matches.filter(m => activeLeague==='All' || m.league===activeLeague);
  const grouped  = filtered.reduce<Record<string,Match[]>>((acc,m) => {
    const k = m.league||'Other'; (acc[k]??=[]).push(m); return acc;
  }, {});

  const pick = (match: Match, sel: string, odd: number) => {
    const closed   = match.status==='closed' || match.displayStatus==='closed';
    const finished = match.displayStatus==='finished' || match.status==='settled';
    if (closed || finished) return;
    if (slip?.matchId===match._id && slip.selection===sel) { setSlip(null); return; }
    setSlip({ matchId:match._id, homeTeam:match.homeTeam, awayTeam:match.awayTeam,
      selection:sel, label:MF_INVERSE[sel]??sel, odd, moneyBack:match.moneyBack });
    setAmount(''); setFeedback(null);
  };

  const placeBet = async () => {
    if (!slip) return;
    const amt = Number(amount);
    if (!amt || amt<minBet) { setFeedback({text:`Min bet: ${minBet} USDT`,ok:false}); return; }
    if (amt>maxBet)         { setFeedback({text:`Max bet: ${maxBet} USDT`,ok:false}); return; }
    setPlacing(true); setFeedback(null);
    const res = await fetch('/api/bet/inverse', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ matchId:slip.matchId, selection:slip.selection, amount:amt }),
    });
    const data = await res.json();
    setPlacing(false);
    if (res.ok) {
      setFeedback({text:`✓ Inverse bet placed! Potential win: ${data.potentialPayout?.toFixed(2)} USDT`,ok:true});
      setSlip(null); setAmount(''); fetchMyBets();
    } else setFeedback({text:data.error||'Bet failed',ok:false});
  };

  const potWin = slip && Number(amount)>0 ? (Number(amount)*slip.odd).toFixed(2) : null;

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className="text-yellow-500" size={20}/>
        <div>
          <h1 className="font-black text-lg leading-none">Inverse Betting</h1>
          <p className="text-[10px] text-gray-500 font-bold mt-0.5">Bet AGAINST outcomes — win when they lose</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="hidden lg:flex bg-surface border border-white/8 rounded-xl p-1 gap-1 overflow-x-auto flex-1">
          <button 
            onClick={() => setActiveLeague('All')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeLeague==='All' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          {leagues.sort().map(lg => (
            <button key={lg} onClick={() => setActiveLeague(lg)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeLeague===lg 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >{lg}</button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 lg:hidden">
          <div className="flex-1 flex items-center gap-2 bg-surface border border-white/8 rounded-xl px-4 py-2.5">
            <span className="font-black text-sm text-white truncate">{activeLeague === 'All' ? 'All Leagues' : activeLeague}</span>
            {liveCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">{liveCount}</span>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 bg-surface border border-white/8 px-3 py-2.5 rounded-xl text-xs font-black text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={15}/> <span className="hidden xs:block">Leagues</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl z-40 overflow-hidden max-h-80 overflow-y-auto">
                  <p className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-600 border-b border-white/5">Leagues</p>
                  <button onClick={() => { setActiveLeague('All'); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors text-left border-b border-white/5 ${
                      activeLeague === 'All' ? 'bg-yellow-500/15 text-yellow-400' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex-1">All Leagues</span>
                    {activeLeague === 'All' && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0"/>}
                  </button>
                  {leagues.sort().map(lg => (
                    <button key={lg}
                      onClick={() => { setActiveLeague(lg); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors text-left border-b border-white/5 last:border-0 ${
                        activeLeague === lg ? 'bg-yellow-500/15 text-yellow-400' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex-1 truncate">{lg}</span>
                      {activeLeague === lg && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0"/>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {liveCount>0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
        >
          <Zap size={13} className="text-red-400"/>
          <span className="text-red-400 text-xs font-black">{liveCount} LIVE RIGHT NOW</span>
          <span className="text-red-400/50 text-[10px] ml-auto">updates every {refreshSecs}s</span>
        </motion.div>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className={`mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border ${
              feedback.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {feedback.text}
            <button onClick={()=>setFeedback(null)} className="ml-auto"><X size={14}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={()=>{ setShowBets(v=>!v); fetchMyBets(); }}
        className="w-full flex items-center justify-between bg-surface border border-yellow-500/20 rounded-xl px-4 py-2.5 mb-3 text-sm font-black text-gray-400 hover:text-white transition-colors"
      >
        <span>
          My Inverse Bets
          {myBets.length>0 && <span className="ml-2 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{myBets.length}</span>}
        </span>
        {showBets ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>

      <AnimatePresence>
        {showBets && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="mb-3 bg-surface border border-white/8 rounded-2xl overflow-hidden"
          >
            {myBets.length===0
              ? <p className="text-center text-gray-600 text-xs py-6">No inverse bets placed yet</p>
              : <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {myBets.map(b => (
                    <div key={b._id} className="px-4 py-3 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-[10px] text-yellow-400 mt-0.5">{MF_INVERSE[b.selection]??b.selection} · {Number(b.multiplier).toFixed(2)}x</p>
                        <p className="text-[10px] text-gray-600">Stake {Number(b.amount).toFixed(2)} · Win {(Number(b.amount)*Number(b.multiplier)).toFixed(2)} USDT</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${STATUS_PILL[b.status]??''}`}>
                        {b.status==='refunded'?'💰 MB':b.status}
                      </span>
                    </div>
                  ))}
                </div>
            }
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {slip && (
          <motion.div
            initial={{y:200,opacity:0}} animate={{y:0,opacity:1}} exit={{y:200,opacity:0}}
            transition={{type:'spring',damping:24,stiffness:260}}
            className="fixed bottom-20 left-0 right-0 z-40 px-3 max-w-lg mx-auto"
          >
            <div className="bg-[#161b22] border border-yellow-500/50 rounded-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="flex items-start justify-between px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Inverse Bet</p>
                    <TrendingDown size={10} className="text-yellow-400"/>
                  </div>
                  <p className="font-black text-sm text-white truncate">{slip.homeTeam} vs {slip.awayTeam}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{slip.label} · <span className="text-yellow-400 font-black">{slip.odd.toFixed(2)}</span></p>
                </div>
                <button onClick={()=>setSlip(null)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 ml-2">
                  <X size={15}/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center bg-background border border-white/10 rounded-xl overflow-hidden focus-within:border-yellow-500/60 transition-colors">
                  <span className="pl-4 text-xs font-bold text-gray-500 shrink-0">USDT</span>
                  <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                    placeholder={`${minBet}–${maxBet}`} autoFocus
                    className="flex-1 bg-transparent px-3 py-3.5 outline-none font-black text-xl text-white"
                  />
                </div>
                <div className="flex gap-2">
                  {[5,10,25,50].filter(v=>v<=maxBet).map(v=>(
                    <button key={v} onClick={()=>setAmount(String(v))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${
                        Number(amount)===v ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400' : 'bg-surface border-white/8 text-gray-500 hover:text-white'
                      }`}
                    >{v}</button>
                  ))}
                  <button onClick={()=>setAmount(String(maxBet))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${
                      Number(amount)===maxBet ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400' : 'bg-surface border-white/8 text-gray-500 hover:text-white'
                    }`}
                  >Max</button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Potential win</span>
                  <span className={`font-black text-xl ${potWin ? 'text-green-400' : 'text-gray-700'}`}>
                    {potWin ? `${potWin} USDT` : '—'}
                  </span>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-yellow-400/80 font-bold">
                    <TrendingDown size={10} className="inline mr-1"/>You win if {slip.label.toLowerCase()} DOES NOT happen
                  </p>
                </div>
                <button onClick={placeBet} disabled={placing||!amount||Number(amount)<minBet}
                  className="w-full py-4 rounded-xl bg-yellow-500 text-black font-black text-base uppercase tracking-wider hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {placing
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>Placing...</span>
                    : 'Place Inverse Bet'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-yellow-500 rounded-full animate-spin"/>
          <p className="text-xs text-gray-600">Loading inverse markets...</p>
        </div>
      ) : Object.keys(grouped).length===0 ? (
        <div className="text-center py-24">
          <p className="font-bold text-sm text-gray-500">No matches available</p>
        </div>
      ) : (
        <div className="space-y-3 pb-44">
          {Object.entries(grouped).map(([league, lgMatches]) => (
            <div key={league} className="bg-[#161b22] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#1a1f27] border-b border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"/>
                <span className="text-xs font-black text-gray-200 uppercase tracking-wider flex-1">{league}</span>
                <span className="text-[10px] text-gray-600 font-bold">{lgMatches.length} match{lgMatches.length>1?'es':''}</span>
              </div>

              <div className="divide-y divide-white/5">
                {lgMatches.map(match => {
                  const active   = slip?.matchId===match._id ? slip.selection : null;
                  const valid    = hasOdds(match.displayOdds);
                  const dcOpen   = expandedDC[match._id]??false;
                  const live     = getLive(match);
                  const closed   = match.status==='closed' || match.displayStatus==='closed';
                  const finished = match.displayStatus==='finished' || match.status==='settled';
                  const scoreKey = `${match.homeTeam}|${match.awayTeam}`;
                  const bumping  = scoreBump[match.apiId??''] || scoreBump[scoreKey];

                  return (
                    <div key={match._id} className={`transition-colors duration-200 ${active ? 'bg-yellow-500/5' : ''}`}>
                      <div className="flex items-center justify-between px-4 pt-3 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-gray-600"/>
                          <span className="text-[10px] text-gray-600 font-bold">
                            {match.date}{match.time&&match.time!=='TBD'?` · ${match.time} UTC`:''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {live && <LiveScore live={live} />}
                          {!live && finished && (
                            <span className="flex items-center gap-1 bg-gray-500/10 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-500/20">
                              ✓ {match.result ? `Ended: ${match.result.toUpperCase()}` : 'Finished'}
                            </span>
                          )}
                          {!live && !finished && closed && (
                            <span className="flex items-center gap-1 bg-orange-500/10 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-orange-500/20">
                              <Lock size={9}/> Closed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge url={match.homeBadge} name={match.homeTeam} size={34}/>
                          <span className="font-bold text-sm text-white flex-1 truncate">{match.homeTeam}</span>
                          {live && (
                            <motion.span
                              key={live.homeScore}
                              animate={bumping ? { scale:[1,1.4,1], color:['#ffffff','#f0b429','#ffffff'] } : {}}
                              transition={{ duration:0.5 }}
                              className="font-black text-2xl text-white w-8 text-center tabular-nums"
                            >{live.homeScore ?? '0'}</motion.span>
                          )}
                        </div>
                        {live && (
                          <div className="flex items-center gap-3 pl-[46px]">
                            <span className="text-[10px] text-gray-600 font-bold">vs</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Badge url={match.awayBadge} name={match.awayTeam} size={34}/>
                          <span className="font-bold text-sm text-white flex-1 truncate">{match.awayTeam}</span>
                          {live && (
                            <motion.span
                              key={live.awayScore}
                              animate={bumping ? { scale:[1,1.4,1], color:['#ffffff','#f0b429','#ffffff'] } : {}}
                              transition={{ duration:0.5 }}
                              className="font-black text-2xl text-white w-8 text-center tabular-nums"
                            >{live.awayScore ?? '0'}</motion.span>
                          )}
                        </div>
                      </div>

                      {valid && !finished && (
                        <div className="px-3 pb-3 space-y-2">
                          {closed && (
                            <p className="text-center text-[10px] text-orange-400/70 font-bold py-0.5">
                              🔒 Betting closed — match in progress
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            {(['home','draw','away'] as const).map(sel => {
                              const invOdd = inverseOdds(match.displayOdds[sel]);
                              return (
                                <OddBtn key={sel} inverse
                                  label={ML_INVERSE[sel]} odd={invOdd}
                                  active={active===sel} disabled={closed||finished}
                                  onClick={() => pick(match, sel, invOdd)}
                                />
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setExpandedDC(p => ({...p,[match._id]:!p[match._id]}))}
                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-yellow-500/70 hover:text-yellow-400 transition-colors"
                          >
                            Inverse Double Chance {dcOpen ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                          </button>
                          <AnimatePresence>
                            {dcOpen && (
                              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                                className="flex gap-1.5 overflow-hidden"
                              >
                                {(['1x','x2','12'] as const).map(dc => {
                                  const invOdd = dcInverseOdd(match.displayOdds, dc);
                                  return <OddBtn key={dc} inverse label={ML_INVERSE[dc]} odd={invOdd}
                                    active={active===dc} disabled={closed||finished}
                                    onClick={() => pick(match, dc, invOdd)}/>;
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {valid && finished && (
                        <div className="px-4 pb-3">
                          <div className="flex gap-1.5 opacity-30 pointer-events-none">
                            {(['home','draw','away'] as const).map(sel => {
                              const invOdd = inverseOdds(match.displayOdds[sel]);
                              const noop = () => {};
                              return <OddBtn key={sel} inverse label={ML_INVERSE[sel]} odd={invOdd}
                                active={false} disabled={true} onClick={noop}/>;
                            })}
                          </div>
                        </div>
                      )}

                      {!valid && !finished && (
                        <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-gray-700">
                          <Info size={11}/> Odds not set yet
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
    </Layout>
  );
}
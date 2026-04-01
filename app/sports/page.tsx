'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Clock, X, ChevronDown, ChevronUp, Info, Lock, Gift, Zap, Menu } from 'lucide-react';
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

const ML: Record<string,string> = { home:'1', draw:'X', away:'2', '1x':'1X', 'x2':'X2', '12':'12' };
const MF: Record<string,string> = {
  home:'Home Win', draw:'Draw', away:'Away Win',
  '1x':'Home or Draw', 'x2':'Draw or Away', '12':'Home or Away',
  // Goal bets
  homeOver05:'Home 1+ Goals', homeOver15:'Home 2+ Goals', homeUnder05:'Home 0 Goals',
  awayOver05:'Away 1+ Goals', awayOver15:'Away 2+ Goals', awayUnder05:'Away 0 Goals',
  totalOver15:'Total 2+ Goals', totalOver25:'Total 3+ Goals', totalUnder15:'Total 0-1', totalUnder25:'Total 0-2',
  bttsYes:'Both Score', bttsNo:'One Fails',
};

function dcOdd(o: Odds, m: '1x'|'x2'|'12'): number {
  const pH=1/o.home, pD=1/o.draw, pA=1/o.away;
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

function OddBtn({ label, odd, active, onClick, disabled=false }: {
  label:string; odd:number; active:boolean; onClick:()=>void; disabled?:boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all active:scale-95 select-none relative overflow-hidden
        ${active ? 'bg-accent border-accent shadow-[0_0_12px_rgba(230,57,70,0.4)]'
                 : 'bg-[#1a1f27] border-white/8 hover:border-accent/50 hover:bg-accent/5'}
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <span className={`text-[10px] font-bold uppercase leading-none mb-0.5 ${active?'text-white/70':'text-gray-500'}`}>{label}</span>
      <span className={`font-black text-sm leading-none ${active?'text-white':'text-white'}`}>{odd.toFixed(2)}</span>
    </button>
  );
}

const STATUS_PILL: Record<string,string> = {
  won:      'text-green-400 bg-green-500/15 border-green-500/20',
  lost:     'text-red-400 bg-red-500/15 border-red-500/20',
  pending:  'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  refunded: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
};

// Simulate minute ticking between polls for visual smoothness
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

export default function SportsPage() {
  const [matches,      setMatches]      = useState<Match[]>([]);
  const [liveMap,      setLiveMap]      = useState<Record<string,LiveEvent>>({});
  const [prevScores,   setPrevScores]   = useState<Record<string,string>>({});
  const [scoreBump,    setScoreBump]    = useState<Record<string,boolean>>({});
  const [loading,      setLoading]      = useState(true);
  const [leagues,      setLeagues]      = useState<string[]>([]);
  const [activeLeague, setActiveLeague] = useState('All');
  const [expandedDC,   setExpandedDC]   = useState<Record<string,boolean>>({});
  const [expandedGoals, setExpandedGoals] = useState<Record<string,boolean>>({});
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
      // Detect score changes → trigger bump animation
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
    const res = await fetch('/api/bets');
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
      selection:sel, label:MF[sel]??sel, odd, moneyBack:match.moneyBack });
    setAmount(''); setFeedback(null);
  };

  const placeBet = async () => {
    if (!slip) return;
    const amt = Number(amount);
    if (!amt || amt<minBet) { setFeedback({text:`Min bet: ${minBet} USDT`,ok:false}); return; }
    if (amt>maxBet)         { setFeedback({text:`Max bet: ${maxBet} USDT`,ok:false}); return; }
    setPlacing(true); setFeedback(null);
    const res = await fetch('/api/bet/place', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ matchId:slip.matchId, selection:slip.selection, amount:amt }),
    });
    const data = await res.json();
    setPlacing(false);
    if (res.ok) {
      setFeedback({text:`✓ Bet placed! Potential win: ${data.potentialPayout?.toFixed(2)} USDT`,ok:true});
      setSlip(null); setAmount(''); fetchMyBets();
    } else setFeedback({text:data.error||'Bet failed',ok:false});
  };

  const potWin = slip && Number(amount)>0 ? (Number(amount)*slip.odd).toFixed(2) : null;

  return (
    <Layout>
      {/* League selector - same style as admin panel */}
      <div className="flex items-center gap-2 mb-3">
        {/* Desktop: horizontal scrollable tabs */}
        <div className="hidden lg:flex bg-surface border border-white/8 rounded-xl p-1 gap-1 overflow-x-auto flex-1">
          <button 
            onClick={() => setActiveLeague('All')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeLeague==='All' 
                ? 'bg-accent text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          {leagues.sort().map(lg => (
            <button key={lg} onClick={() => setActiveLeague(lg)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeLeague===lg 
                  ? 'bg-accent text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >{lg}</button>
          ))}
        </div>
        {/* Mobile: active league pill + dropdown menu */}
        <div className="flex-1 flex items-center gap-2 lg:hidden">
          <div className="flex-1 flex items-center gap-2 bg-surface border border-white/8 rounded-xl px-4 py-2.5">
            <span className="font-black text-sm text-white truncate">{activeLeague === 'All' ? 'All Leagues' : activeLeague}</span>
            {liveCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">{liveCount}</span>
            )}
          </div>
          {/* Menu button */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 bg-surface border border-white/8 px-3 py-2.5 rounded-xl text-xs font-black text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={15}/> <span className="hidden xs:block">Leagues</span>
            </button>
            {/* Dropdown */}
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl z-40 overflow-hidden max-h-80 overflow-y-auto">
                  <p className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-600 border-b border-white/5">Leagues</p>
                  <button onClick={() => { setActiveLeague('All'); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors text-left border-b border-white/5 ${
                      activeLeague === 'All' ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex-1">All Leagues</span>
                    {activeLeague === 'All' && <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0"/>}
                  </button>
                  {leagues.sort().map(lg => (
                    <button key={lg}
                      onClick={() => { setActiveLeague(lg); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors text-left border-b border-white/5 last:border-0 ${
                        activeLeague === lg ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex-1 truncate">{lg}</span>
                      {activeLeague === lg && <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0"/>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live banner */}
      {liveCount>0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
        >
          <Zap size={13} className="text-red-400"/>
          <span className="text-red-400 text-xs font-black">{liveCount} LIVE RIGHT NOW</span>
          <span className="text-red-400/50 text-[10px] ml-auto">updates every {refreshSecs}s</span>
        </motion.div>
      )}

      {/* Feedback */}
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

      {/* My bets */}
      <button onClick={()=>{ setShowBets(v=>!v); fetchMyBets(); }}
        className="w-full flex items-center justify-between bg-surface border border-white/8 rounded-xl px-4 py-2.5 mb-3 text-sm font-black text-gray-400 hover:text-white transition-colors"
      >
        <span>
          My Bets
          {myBets.length>0 && <span className="ml-2 bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{myBets.length}</span>}
        </span>
        {showBets ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>

      <AnimatePresence>
        {showBets && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="mb-3 bg-surface border border-white/8 rounded-2xl overflow-hidden"
          >
            {myBets.length===0
              ? <p className="text-center text-gray-600 text-xs py-6">No bets placed yet</p>
              : <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {myBets.map(b => (
                    <div key={b._id} className="px-4 py-3 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{MF[b.selection]??b.selection} · {Number(b.multiplier).toFixed(2)}x</p>
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

      {/* Bet slip */}
      <AnimatePresence>
        {slip && (
          <motion.div
            initial={{y:200,opacity:0}} animate={{y:0,opacity:1}} exit={{y:200,opacity:0}}
            transition={{type:'spring',damping:24,stiffness:260}}
            className="fixed bottom-20 left-0 right-0 z-40 px-3 max-w-lg mx-auto"
          >
            <div className="bg-[#161b22] border border-accent/60 rounded-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="flex items-start justify-between px-4 py-3 bg-accent/10 border-b border-accent/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Bet Slip</p>
                    {slip.moneyBack && (
                      <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-500/30">
                        <Gift size={9}/> Money Back
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm text-white truncate">{slip.homeTeam} vs {slip.awayTeam}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{slip.label} · <span className="text-white font-black">{slip.odd.toFixed(2)}</span></p>
                </div>
                <button onClick={()=>setSlip(null)} className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 ml-2">
                  <X size={15}/>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center bg-background border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/60 transition-colors">
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
                        Number(amount)===v ? 'bg-accent/20 border-accent/60 text-white' : 'bg-surface border-white/8 text-gray-500 hover:text-white'
                      }`}
                    >{v}</button>
                  ))}
                  <button onClick={()=>setAmount(String(maxBet))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${
                      Number(amount)===maxBet ? 'bg-accent/20 border-accent/60 text-white' : 'bg-surface border-white/8 text-gray-500 hover:text-white'
                    }`}
                  >Max</button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Potential win</span>
                  <span className={`font-black text-xl ${potWin ? 'text-green-400' : 'text-gray-700'}`}>
                    {potWin ? `${potWin} USDT` : '—'}
                  </span>
                </div>
                {slip.moneyBack && (
                  <p className="text-[10px] text-green-400/80 text-center font-bold">
                    💰 If you lose, your stake will be refunded automatically
                  </p>
                )}
                <button onClick={placeBet} disabled={placing||!amount||Number(amount)<minBet}
                  className="w-full py-4 rounded-xl bg-accent text-white font-black text-base uppercase tracking-wider hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {placing
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Placing...</span>
                    : 'Place Bet'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-7 h-7 border-2 border-white/10 border-t-accent rounded-full animate-spin"/>
          <p className="text-xs text-gray-600">Loading matches...</p>
        </div>
      ) : Object.keys(grouped).length===0 ? (
        <div className="text-center py-24">
          <p className="font-bold text-sm text-gray-500">No matches available</p>
        </div>
      ) : (
        <div className="space-y-3 pb-44">
          {Object.entries(grouped).map(([league, lgMatches]) => (
            <div key={league} className="bg-[#161b22] border border-white/8 rounded-2xl overflow-hidden">
              {/* League header */}
              <div className="px-4 py-2.5 bg-[#1a1f27] border-b border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent shrink-0"/>
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
                    <div key={match._id} className={`transition-colors duration-200 ${active ? 'bg-accent/5' : ''}`}>
                      {/* Top row: time + status badges */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-1.5 gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-gray-600"/>
                          <span className="text-[10px] text-gray-600 font-bold">
                            {match.date}{match.time&&match.time!=='TBD'?` · ${match.time} UTC`:''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {match.moneyBack && !closed && !finished && (
                            <span className="flex items-center gap-1 bg-green-500/15 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-500/20">
                              <Gift size={9}/> Money Back
                            </span>
                          )}
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

                      {/* Teams + live scores */}
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

                      {/* Odds */}
                      {valid && !finished && (
                        <div className="px-3 pb-3 space-y-2">
                          {closed && (
                            <p className="text-center text-[10px] text-orange-400/70 font-bold py-0.5">
                              🔒 Betting closed — match in progress
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            {(['home','draw','away'] as const).map(sel => (
                              <OddBtn key={sel}
                                label={ML[sel]} odd={match.displayOdds[sel]}
                                active={active===sel} disabled={closed||finished}
                                onClick={() => pick(match, sel, match.displayOdds[sel])}
                              />
                            ))}
                          </div>
                          {/* Double chance */}
                          <button
                            onClick={() => setExpandedDC(p => ({...p,[match._id]:!p[match._id]}))}
                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors"
                          >
                            Double Chance {dcOpen ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                          </button>
                          <AnimatePresence>
                            {dcOpen && (
                              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                                className="flex gap-1.5 overflow-hidden"
                              >
                                {(['1x','x2','12'] as const).map(dc => {
                                  const odd = dcOdd(match.displayOdds, dc);
                                  return <OddBtn key={dc} label={ML[dc]} odd={odd}
                                    active={active===dc} disabled={closed||finished}
                                    onClick={() => pick(match, dc, odd)}/>;
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Goal bets */}
                          {!!match.goalOdds && Object.values(match.goalOdds).some(v => v && v > 1) && (
                            <>
                              <button
                                onClick={() => setExpandedGoals(p => ({...p,[match._id]:!p[match._id]}))}
                                className="w-full flex items-center justify-center gap-1 py-1 text-[9px] font-bold text-blue-400/70 hover:text-blue-400 transition-colors"
                              >
                                🎯 Goals {expandedGoals[match._id] ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                              </button>
                              <AnimatePresence>
                                {expandedGoals[match._id] && (
                                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="space-y-1.5">
                                    {/* Team Goals */}
                                    <div className="text-[8px] text-gray-500 font-bold uppercase px-1">Team Goals</div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {[
                                        { key: 'homeOver05', label: 'H 1+' },
                                        { key: 'homeOver15', label: 'H 2+' },
                                        { key: 'homeUnder05', label: 'H 0' },
                                      ].map(g => (match.goalOdds as any)[g.key] > 1 && (
                                        <OddBtn key={g.key} label={g.label} odd={(match.goalOdds as any)[g.key]}
                                          active={active===g.key} disabled={closed||finished}
                                          onClick={() => pick(match, g.key, (match.goalOdds as any)[g.key])}/>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {[
                                        { key: 'awayOver05', label: 'A 1+' },
                                        { key: 'awayOver15', label: 'A 2+' },
                                        { key: 'awayUnder05', label: 'A 0' },
                                      ].map(g => (match.goalOdds as any)[g.key] > 1 && (
                                        <OddBtn key={g.key} label={g.label} odd={(match.goalOdds as any)[g.key]}
                                          active={active===g.key} disabled={closed||finished}
                                          onClick={() => pick(match, g.key, (match.goalOdds as any)[g.key])}/>
                                      ))}
                                    </div>
                                    {/* Total Goals */}
                                    <div className="text-[8px] text-gray-500 font-bold uppercase px-1 mt-1.5">Total Goals</div>
                                    <div className="grid grid-cols-4 gap-1">
                                      {[
                                        { key: 'totalOver15', label: 'O1.5' },
                                        { key: 'totalOver25', label: 'O2.5' },
                                        { key: 'totalUnder15', label: 'U1.5' },
                                        { key: 'totalUnder25', label: 'U2.5' },
                                      ].map(g => (match.goalOdds as any)[g.key] > 1 && (
                                        <OddBtn key={g.key} label={g.label} odd={(match.goalOdds as any)[g.key]}
                                          active={active===g.key} disabled={closed||finished}
                                          onClick={() => pick(match, g.key, (match.goalOdds as any)[g.key])}/>
                                      ))}
                                    </div>
                                    {/* BTTS */}
                                    <div className="text-[8px] text-gray-500 font-bold uppercase px-1 mt-1.5">Both Teams Score</div>
                                    <div className="grid grid-cols-2 gap-1">
                                      {(match.goalOdds as any).bttsYes > 1 && (
                                        <OddBtn label="Yes" odd={(match.goalOdds as any).bttsYes}
                                          active={active==='bttsYes'} disabled={closed||finished}
                                          onClick={() => pick(match, 'bttsYes', (match.goalOdds as any).bttsYes)}/>
                                      )}
                                      {(match.goalOdds as any).bttsNo > 1 && (
                                        <OddBtn label="No" odd={(match.goalOdds as any).bttsNo}
                                          active={active==='bttsNo'} disabled={closed||finished}
                                          onClick={() => pick(match, 'bttsNo', (match.goalOdds as any).bttsNo)}/>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )}
                        </div>
                      )}

                      {valid && finished && (
                        <div className="px-4 pb-3">
                          <div className="flex gap-1.5 opacity-30 pointer-events-none">
                            {(['home','draw','away'] as const).map(sel => (
                              <OddBtn key={sel} label={ML[sel]} odd={match.displayOdds[sel]}
                                active={false} disabled={true} onClick={()=>{}}/>
                            ))}
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

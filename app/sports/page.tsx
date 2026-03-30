'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Clock, X, ChevronDown, ChevronUp, Info, Radio, Lock, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Odds  { home: number; draw: number; away: number; }
interface Match {
  _id: string; homeTeam: string; awayTeam: string;
  homeBadge: string; awayBadge: string;
  league: string; date: string; time: string;
  displayOdds: Odds; status: 'open'|'closed'|'settled';
  displayStatus?: 'open'|'closed'|'finished'|'settled';
  result?: string|null;
  moneyBack?: boolean; apiId?: string;
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

const ML: Record<string, string> = { home:'1', draw:'X', away:'2', '1x':'1X', 'x2':'X2', '12':'12' };
const MF: Record<string, string> = {
  home:'Home Win', draw:'Draw', away:'Away Win',
  '1x':'Home or Draw', 'x2':'Draw or Away', '12':'Home or Away',
};

function dcOdd(o: Odds, m: '1x'|'x2'|'12'): number {
  const pH=1/o.home, pD=1/o.draw, pA=1/o.away;
  const p = m==='1x' ? pH+pD : m==='x2' ? pD+pA : pH+pA;
  return Math.max(1.02, Number((1/p).toFixed(2)));
}
function hasOdds(o?: Odds|null) { return !!o && o.home>1.01 && o.draw>1.01 && o.away>1.01; }

function Badge({ url, name, size=32 }: { url?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const init = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  if (!url || err) return (
    <div style={{width:size,height:size,fontSize:size*0.3}}
      className="rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-black text-gray-400 shrink-0">
      {init}
    </div>
  );
  return <img src={url} alt={name} style={{width:size,height:size}}
    className="rounded-full object-contain shrink-0 bg-white/5" onError={()=>setErr(true)} />;
}

function OddBtn({ label, odd, active, onClick, disabled=false }: {
  label: string; odd: number; active: boolean; onClick: ()=>void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex-1 flex flex-col items-center py-2.5 rounded-lg border transition-all active:scale-95 select-none
        ${active ? 'bg-accent border-accent' : 'bg-background border-white/8 hover:border-accent/40 hover:bg-accent/5'}
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <span className={`text-[10px] font-bold uppercase leading-none mb-0.5 ${active?'text-white/60':'text-gray-500'}`}>{label}</span>
      <span className="font-black text-sm leading-none">{odd.toFixed(2)}</span>
    </button>
  );
}

const STATUS_PILL: Record<string,string> = {
  won:'text-green-400 bg-green-500/15 border-green-500/20',
  lost:'text-red-400 bg-red-500/15 border-red-500/20',
  pending:'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  refunded:'text-blue-400 bg-blue-500/15 border-blue-500/20',
};

export default function SportsPage() {
  const [matches,      setMatches]      = useState<Match[]>([]);
  const [liveMap,      setLiveMap]      = useState<Record<string,LiveEvent>>({});
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
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    fetchAll();
    fetchLive();
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(fetchLive, refreshSecs * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refreshSecs]);

  const fetchAll = async () => {
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
  };

  const fetchLive = async () => {
    try {
      const res = await fetch('/api/livescores');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string,LiveEvent> = {};
      let count = 0;
      for (const e of (data.events ?? [])) {
        if (e.isLive) count++;
        map[e.apiId] = e;
        map[`${e.homeTeam}|${e.awayTeam}`] = e;
      }
      setLiveMap(map);
      setLiveCount(count);
    } catch { /* silent */ }
  };

  const fetchMyBets = async () => {
    const res = await fetch('/api/bets');
    if (!res.ok) return;
    setMyBets((await res.json()).bets ?? []);
  };

  const getLive = (m: Match): LiveEvent|null => {
    if (m.apiId && liveMap[m.apiId]) return liveMap[m.apiId];
    return liveMap[`${m.homeTeam}|${m.awayTeam}`] ?? null;
  };

  const filtered = matches.filter(m => activeLeague==='All' || m.league===activeLeague);
  const grouped  = filtered.reduce<Record<string,Match[]>>((acc,m) => {
    const k = m.league||'Other'; (acc[k]??=[]).push(m); return acc;
  }, {});

  const pick = (match: Match, sel: string, odd: number) => {
    if (match.status === 'closed') return;
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
    const res = await fetch('/api/bet/place',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({matchId:slip.matchId, selection:slip.selection, amount:amt}),
    });
    const data = await res.json();
    setPlacing(false);
    if (res.ok) {
      setFeedback({text:`✓ Bet placed! Win: ${data.potentialPayout?.toFixed(2)??(amt*slip.odd).toFixed(2)} USDT`,ok:true});
      setSlip(null); setAmount(''); fetchMyBets();
    } else {
      setFeedback({text:data.error||'Bet failed',ok:false});
    }
  };

  const potWin = slip && Number(amount)>0 ? (Number(amount)*slip.odd).toFixed(2) : null;

  return (
    <Layout>
      {/* League tabs */}
      <div className="-mx-4 px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All',...leagues].map(lg=>(
            <button key={lg} onClick={()=>setActiveLeague(lg)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                activeLeague===lg?'bg-accent text-white':'bg-surface border border-white/8 text-gray-500 hover:text-white'
              }`}>{lg}</button>
          ))}
        </div>
      </div>

      {/* Live banner */}
      {liveCount>0 && (
        <div className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <Radio size={13} className="text-red-400" />
          <span className="text-red-400 text-xs font-black">{liveCount} LIVE NOW</span>
          <span className="text-red-400/60 text-[10px]">· updates every {refreshSecs}s</span>
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className={`mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border ${
              feedback.ok?'bg-green-500/10 border-green-500/30 text-green-400':'bg-red-500/10 border-red-500/30 text-red-400'}`}
          >
            {feedback.text}
            <button onClick={()=>setFeedback(null)} className="ml-auto"><X size={14}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My bets */}
      <button onClick={()=>{setShowBets(v=>!v);fetchMyBets();}}
        className="w-full flex items-center justify-between bg-surface border border-white/8 rounded-xl px-4 py-2.5 mb-3 text-sm font-black text-gray-400 hover:text-white transition-colors"
      >
        <span>My Bets {myBets.length>0&&<span className="ml-1.5 bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{myBets.length}</span>}</span>
        {showBets?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
      </button>

      <AnimatePresence>
        {showBets && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="mb-3 bg-surface border border-white/8 rounded-2xl overflow-hidden"
          >
            {myBets.length===0
              ? <p className="text-center text-gray-600 text-xs py-6">No bets placed yet</p>
              : <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {myBets.map(b=>(
                    <div key={b._id} className="px-4 py-3 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{b.details?.homeTeam} vs {b.details?.awayTeam}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{MF[b.selection]??b.selection} · {Number(b.multiplier).toFixed(2)}x</p>
                        <p className="text-[10px] text-gray-600">
                          Staked {Number(b.amount).toFixed(2)} · Win {(Number(b.amount)*Number(b.multiplier)).toFixed(2)} USDT
                        </p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${STATUS_PILL[b.status]??''}`}>
                        {b.status==='refunded'?'💰 refunded':b.status}
                      </span>
                    </div>
                  ))}
                </div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet slip — springs up from bottom */}
      <AnimatePresence>
        {slip && (
          <motion.div
            initial={{y:180,opacity:0}} animate={{y:0,opacity:1}} exit={{y:180,opacity:0}}
            transition={{type:'spring',damping:26,stiffness:280}}
            className="fixed bottom-20 left-0 right-0 z-40 px-4 max-w-lg mx-auto"
          >
            <div className="bg-[#161b22] border border-accent/50 rounded-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="flex items-start justify-between px-4 py-3 bg-accent/10 border-b border-accent/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Bet Slip</p>
                    {slip.moneyBack && (
                      <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-500/30">
                        <Gift size={9}/> Money Back if you lose
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
                        Number(amount)===v?'bg-accent/20 border-accent/60 text-white':'bg-surface border-white/8 text-gray-500 hover:text-white'}`}
                    >{v}</button>
                  ))}
                  <button onClick={()=>setAmount(String(maxBet))}
                    className={`flex-1 py-2 rounded-lg border text-xs font-black transition-all ${
                      Number(amount)===maxBet?'bg-accent/20 border-accent/60 text-white':'bg-surface border-white/8 text-gray-500 hover:text-white'}`}
                  >Max</button>
                </div>
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-xs text-gray-500">Potential win</span>
                  <span className={`font-black text-lg ${potWin?'text-green-400':'text-gray-700'}`}>
                    {potWin?`${potWin} USDT`:'—'}
                  </span>
                </div>
                {slip.moneyBack && (
                  <p className="text-[10px] text-green-400/80 text-center font-bold">
                    💰 If you lose, your {amount||'stake'} USDT will be refunded automatically
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
        <div className="space-y-3 pb-40">
          {Object.entries(grouped).map(([league,lgMatches])=>(
            <div key={league} className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent shrink-0"/>
                <span className="text-xs font-black text-gray-300 uppercase tracking-wider">{league}</span>
                <span className="ml-auto text-[10px] text-gray-600">{lgMatches.length} match{lgMatches.length>1?'es':''}</span>
              </div>

              <div className="divide-y divide-white/5">
                {lgMatches.map(match=>{
                  const active  = slip?.matchId===match._id ? slip.selection : null;
                  const valid   = hasOdds(match.displayOdds);
                  const dcOpen  = expandedDC[match._id]??false;
                  const live    = getLive(match);
                  const closed  = match.status==='closed' || match.displayStatus==='closed';
                  const finished = match.displayStatus==='finished' || match.status==='settled';

                  return (
                    <div key={match._id} className={`transition-colors ${active?'bg-accent/5':''} ${closed?'opacity-80':''}`}>
                      {/* Header row */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <div className="flex items-center gap-2">
                          <Clock size={10} className="text-gray-600"/>
                          <span className="text-[10px] text-gray-600 font-bold">
                            {match.date}{match.time&&match.time!=='TBD'?` · ${match.time} UTC`:''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.moneyBack && !closed && (
                            <span className="flex items-center gap-1 bg-green-500/15 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-500/20">
                              <Gift size={9}/> Money Back
                            </span>
                          )}
                          {live && (
                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"/>
                              <span className="text-red-400 font-black text-xs">{live.homeScore??'0'}–{live.awayScore??'0'}</span>
                              {live.minute&&<span className="text-red-400/70 text-[10px] font-bold">{live.minute}'</span>}
                            </div>
                          )}
                          {finished ? (
                            <div className="flex items-center gap-1 bg-gray-500/10 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-gray-500/20">
                              ✓ {match.result ? `Ended: ${match.result.toUpperCase()}` : 'Finished'}
                            </div>
                          ) : closed ? (
                            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-orange-500/20">
                              <Lock size={9}/> Closed
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="px-4 pb-3 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <Badge url={match.homeBadge} name={match.homeTeam} size={32}/>
                          <span className="font-bold text-sm text-white flex-1 truncate">{match.homeTeam}</span>
                          {live&&<span className="font-black text-2xl text-white w-7 text-center">{live.homeScore??'0'}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge url={match.awayBadge} name={match.awayTeam} size={32}/>
                          <span className="font-bold text-sm text-white flex-1 truncate">{match.awayTeam}</span>
                          {live&&<span className="font-black text-2xl text-white w-7 text-center">{live.awayScore??'0'}</span>}
                        </div>
                      </div>

                      {/* Odds or closed state */}
                      {valid ? (
                        <div className="px-3 pb-3 space-y-2">
                          {closed && (
                            <p className="text-center text-[10px] text-orange-400/70 font-bold py-1">
                              🔒 Betting closed — match in progress
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            {(['home','draw','away'] as const).map(sel=>(
                              <OddBtn key={sel}
                                label={ML[sel]} odd={match.displayOdds[sel]}
                                active={active===sel} disabled={closed}
                                onClick={()=>pick(match,sel,match.displayOdds[sel])}
                              />
                            ))}
                          </div>
                          <button onClick={()=>setExpandedDC(p=>({...p,[match._id]:!p[match._id]}))}
                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-gray-600 hover:text-gray-400 transition-colors"
                          >
                            Double Chance {dcOpen?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                          </button>
                          <AnimatePresence>
                            {dcOpen && (
                              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                                className="flex gap-1.5 overflow-hidden"
                              >
                                {(['1x','x2','12'] as const).map(dc=>{
                                  const odd=dcOdd(match.displayOdds,dc);
                                  return <OddBtn key={dc} label={ML[dc]} odd={odd}
                                    active={active===dc} disabled={closed}
                                    onClick={()=>pick(match,dc,odd)}/>;
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
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

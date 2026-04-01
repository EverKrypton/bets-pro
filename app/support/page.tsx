'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { MessageSquare, Plus, Send, ChevronLeft, Clock, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  _id: string;
  senderRole: 'user'|'mod'|'admin';
  senderName: string;
  body: string;
  createdAt: string;
}
interface Ticket {
  _id: string;
  subject: string;
  status: 'open'|'pending'|'closed';
  messages: Message[];
  lastReplyAt: string;
  readByUser: boolean;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  open:    'bg-green-500/15 text-green-400 border-green-500/20',
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  closed:  'bg-gray-500/15 text-gray-400 border-gray-500/20',
};
const STATUS_LABEL: Record<string, string> = { open:'Open', pending:'Awaiting reply', closed:'Closed' };

export default function SupportPage() {
  const [tickets,       setTickets]       = useState<Ticket[]>([]);
  const [activeTicket,  setActiveTicket]  = useState<Ticket|null>(null);
  const [showNewForm,   setShowNewForm]   = useState(false);
  const [subject,       setSubject]       = useState('');
  const [firstMsg,      setFirstMsg]      = useState('');
  const [replyBody,     setReplyBody]     = useState('');
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [feedback,      setFeedback]      = useState<{msg:string;ok:boolean}|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval>|null>(null);

  const notify = (msg: string, ok: boolean) => {
    setFeedback({msg,ok});
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchTickets = async () => {
    const res = await fetch('/api/support');
    if (res.ok) setTickets((await res.json()).tickets ?? []);
    setLoading(false);
  };

  const fetchTicket = async (id: string) => {
    const res = await fetch(`/api/support/${id}`);
    if (res.ok) {
      const data = await res.json();
      setActiveTicket(data.ticket);
      setTickets(prev => prev.map(t => t._id === id ? { ...t, readByUser: true } : t));
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Poll active ticket for mod replies every 10s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeTicket) return;
    pollRef.current = setInterval(() => fetchTicket(activeTicket._id), 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeTicket?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages.length]);

  const openTicket = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setShowNewForm(false);
    fetchTicket(ticket._id);
  };

  const createTicket = async () => {
    if (!subject.trim() || !firstMsg.trim()) { notify('Subject and message required', false); return; }
    setCreating(true);
    const res  = await fetch('/api/support', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ subject: subject.trim(), body: firstMsg.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setSubject(''); setFirstMsg(''); setShowNewForm(false);
      setTickets(prev => [data.ticket, ...prev]);
      setActiveTicket(data.ticket);
      notify('Ticket created! Support will reply shortly.', true);
    } else notify(data.error || 'Failed', false);
  };

  const sendReply = async () => {
    if (!replyBody.trim() || !activeTicket) return;
    setSending(true);
    const res  = await fetch(`/api/support/${activeTicket._id}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ body: replyBody.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) { setReplyBody(''); setActiveTicket(data.ticket); }
    else notify(data.error || 'Failed to send', false);
  };

  const closeTicket = async () => {
    if (!activeTicket) return;
    const res = await fetch(`/api/support/${activeTicket._id}`, { method:'PATCH' });
    if (res.ok) {
      const data = await res.json();
      setActiveTicket(data.ticket);
      setTickets(prev => prev.map(t => t._id === data.ticket._id ? data.ticket : t));
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={24}/></div>
    </Layout>
  );

  // ── Ticket detail view ────────────────────────────────────────────
  if (activeTicket) return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => { setActiveTicket(null); fetchTickets(); }}
            className="w-9 h-9 rounded-xl bg-surface border border-white/8 flex items-center justify-center text-gray-400 hover:text-white shrink-0"
          ><ChevronLeft size={16}/></button>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate">{activeTicket.subject}</p>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[activeTicket.status]}`}>
              {STATUS_LABEL[activeTicket.status]}
            </span>
          </div>
          {activeTicket.status !== 'closed' && (
            <button onClick={closeTicket} className="text-[10px] font-black text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
              <XCircle size={12}/> Close
            </button>
          )}
        </div>

        {feedback && (
          <div className={`mb-3 px-4 py-2 rounded-xl text-xs font-bold border ${feedback.ok?'bg-green-500/10 border-green-500/20 text-green-400':'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {feedback.msg}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2">
          {activeTicket.messages.map((msg, i) => {
            const isUser = msg.senderRole === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-1`}>
                  <p className={`text-[9px] font-bold ${isUser ? 'text-right text-gray-600' : 'text-gray-500'}`}>
                    {isUser ? 'You' : `🛡️ ${msg.senderName}`}
                  </p>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-sm'
                      : 'bg-surface border border-white/8 text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.body}
                  </div>
                  <p className={`text-[9px] text-gray-600 ${isUser ? 'text-right' : ''}`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Reply input */}
        {activeTicket.status !== 'closed' ? (
          <div className="pt-3 border-t border-white/8 flex gap-2 items-end">
            <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder="Type your message... (Enter to send)"
              rows={2}
              className="flex-1 bg-surface border border-white/8 rounded-xl px-4 py-3 outline-none text-sm resize-none focus:border-accent/50 transition-colors"
            />
            <button onClick={sendReply} disabled={sending || !replyBody.trim()}
              className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-white hover:bg-accent/90 disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
            </button>
          </div>
        ) : (
          <div className="pt-3 border-t border-white/8 text-center text-xs text-gray-600 font-bold">
            Ticket closed · <button onClick={() => { setActiveTicket(null); setShowNewForm(true); }} className="text-accent underline">Open a new one</button>
          </div>
        )}
      </div>
    </Layout>
  );

  // ── Ticket list / new ticket ──────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black flex items-center gap-2 uppercase tracking-wider">
            <MessageSquare className="text-accent" size={20}/> Support
          </h1>
          <button onClick={() => { setShowNewForm(v=>!v); setActiveTicket(null); }}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-accent/90 transition-colors"
          >
            {showNewForm ? <><X size={13}/> Cancel</> : <><Plus size={13}/> New Ticket</>}
          </button>
        </div>

        {feedback && (
          <div className={`px-4 py-3 rounded-xl text-sm font-bold border ${feedback.ok?'bg-green-500/10 border-green-500/20 text-green-400':'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {feedback.msg}
          </div>
        )}

        {/* New ticket form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3"
            >
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">New Support Ticket</p>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject (e.g. Deposit not credited)"
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              />
              <textarea value={firstMsg} onChange={e=>setFirstMsg(e.target.value)} placeholder="Describe your issue in detail..." rows={4}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors resize-none"
              />
              <button onClick={createTicket} disabled={creating || !subject.trim() || !firstMsg.trim()}
                className="w-full py-3 bg-accent text-white rounded-xl font-black text-sm uppercase hover:bg-accent/90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 size={14} className="animate-spin"/> Submitting...</> : <><Send size={14}/> Submit Ticket</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ticket list */}
        {tickets.length === 0 && !showNewForm ? (
          <div className="text-center py-16 space-y-4">
            <MessageSquare size={40} className="text-gray-700 mx-auto"/>
            <div>
              <p className="font-black text-white">No support tickets yet</p>
              <p className="text-sm text-gray-500 mt-1">Open a ticket and our team will respond within minutes</p>
            </div>
            <button onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-accent/90"
            >
              <Plus size={14}/> Open First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => (
              <button key={ticket._id} onClick={() => openTicket(ticket)}
                className={`w-full bg-surface border rounded-2xl p-4 text-left transition-all hover:border-white/20 active:scale-[0.99] ${
                  !ticket.readByUser && ticket.status === 'pending' ? 'border-accent/40 bg-accent/5' : 'border-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!ticket.readByUser && ticket.status === 'pending' && (
                        <span className="w-2 h-2 bg-accent rounded-full shrink-0"/>
                      )}
                      <p className="font-black text-sm truncate">{ticket.subject}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock size={9}/> {new Date(ticket.lastReplyAt).toLocaleString()}
                      · {ticket.messages.length} message{ticket.messages.length!==1?'s':''}
                    </p>
                    {ticket.messages.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1.5 truncate">
                        {ticket.messages[ticket.messages.length-1].body}
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${STATUS_STYLE[ticket.status]}`}>
                    {STATUS_LABEL[ticket.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

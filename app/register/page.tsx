'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Mascot from '@/components/Mascot';
import { Suspense } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function RegisterForm() {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [refCode,  setRefCode]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [refStatus, setRefStatus] = useState<'idle'|'checking'|'valid'|'invalid'>('idle');
  const [refOwner,  setRefOwner]  = useState('');
  const router       = useRouter();
  const searchParams = useSearchParams();
  const validateTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      const code = ref.toUpperCase();
      setRefCode(code);
      validateCode(code);
    }
  }, [searchParams]);

  const validateCode = (code: string) => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    const clean = code.trim().toUpperCase();
    if (!clean || clean.length < 4) { setRefStatus('idle'); return; }
    setRefStatus('checking');
    validateTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/referral/validate?code=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.valid) { setRefStatus('valid'); setRefOwner(data.username); }
        else            { setRefStatus('invalid'); setRefOwner(''); }
      } catch { setRefStatus('invalid'); }
    }, 500);
  };

  const handleRefChange = (val: string) => {
    const upper = val.toUpperCase();
    setRefCode(upper);
    validateCode(upper);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || username.length > 20) { setError(t.auth.usernameLen); return; }
    if (password.length < 8) { setError(t.auth.passwordMin); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        referrerCode: refStatus === 'valid' ? refCode.trim().toUpperCase() : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Register failed'); return; }
    router.replace('/wallet');
  };

  const refHint = () => {
    if (!refCode) return null;
    if (refStatus === 'checking') return (
      <span className="flex items-center gap-1 text-gray-500"><Loader2 size={11} className="animate-spin"/> Checking...</span>
    );
    if (refStatus === 'valid') return (
      <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={11}/> Code from <strong>{refOwner}</strong> — you're linked!</span>
    );
    if (refStatus === 'invalid') return (
      <span className="flex items-center gap-1 text-red-400"><XCircle size={11}/> Code not found — double-check it</span>
    );
    return null;
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Mascot className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-black">{t.auth.registerTitle}</h1>
          <p className="text-xs text-gray-400">{t.auth.registerSubtitle}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 font-medium">{error}</div>
      )}

      <input value={username} onChange={e => setUsername(e.target.value)} placeholder={t.auth.username}
        className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors" required minLength={3} maxLength={20}
        name="username" autoComplete="username"
      />
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder={t.auth.email}
        className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors" required
        name="email" autoComplete="email"
      />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={t.auth.password}
        className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors" minLength={8} required
        name="password" autoComplete="new-password"
      />

      <div className="space-y-1.5">
        <div className={`flex items-center bg-background border rounded-xl overflow-hidden transition-colors ${
          refStatus === 'valid'   ? 'border-green-500/50' :
          refStatus === 'invalid' ? 'border-red-500/40'   :
          'border-white/10 focus-within:border-primary/50'
        }`}>
          <input value={refCode} onChange={e => handleRefChange(e.target.value)}
            placeholder="Referral code (optional, e.g. BP-A3K91F)"
            className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-sm"
          />
          {refStatus === 'checking' && <Loader2 size={14} className="text-gray-500 animate-spin mr-3 shrink-0"/>}
          {refStatus === 'valid'    && <CheckCircle2 size={14} className="text-green-400 mr-3 shrink-0"/>}
          {refStatus === 'invalid'  && <XCircle size={14} className="text-red-400 mr-3 shrink-0"/>}
        </div>
        <p className="text-[10px] pl-1 font-bold">{refHint()}</p>
      </div>

      <button disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-accent text-background rounded-xl py-3.5 font-black inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {loading ? <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin"/> {t.auth.registerBtn}...</> : t.auth.registerBtn}
      </button>

      <p className="text-sm text-gray-400 text-center">
        {t.auth.haveAccount} <Link href="/login" className="text-primary font-bold">{t.auth.loginBtn}</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-5 h-5 border-2 border-white/10 border-t-accent rounded-full animate-spin"/>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

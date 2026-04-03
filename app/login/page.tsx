'use client';

import { useState }    from 'react';
import Link            from 'next/link';
import { useRouter }   from 'next/navigation';
import Mascot          from '@/components/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t }                   = useLanguage();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const router                  = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Mascot className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-black">{t.auth.loginTitle}</h1>
            <p className="text-xs text-gray-400">{t.auth.loginSubtitle}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          name="email"
          placeholder={t.auth.email}
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder={t.auth.password}
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors"
          required
        />

        <button
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-accent text-background rounded-xl py-3 font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" /> Loading...</>
          ) : t.auth.loginBtn}
        </button>

        <p className="text-sm text-gray-400 text-center">
          {t.auth.noAccount}{' '}
          <Link href="/register" className="text-primary font-bold">{t.nav.register}</Link>
        </p>
      </form>
    </div>
  );
}

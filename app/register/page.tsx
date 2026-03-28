'use client';

import { useState }  from 'react';
import Link          from 'next/link';
import { useRouter } from 'next/navigation';
import Mascot        from '@/components/Mascot';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const router                  = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username,
        email,
        password,
        referrerCode: new URLSearchParams(window.location.search).get('ref') || null,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Register failed');
      return;
    }

    router.replace('/wallet');
  };

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Mascot className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-black">Register</h1>
            <p className="text-xs text-gray-400">Create account with email</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors"
          required
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password (min. 8 characters)"
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 transition-colors"
          minLength={8}
          required
        />

        <button
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-accent text-background rounded-xl py-3 font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" /> Loading...</>
          ) : 'Create account'}
        </button>

        <p className="text-sm text-gray-400 text-center">
          Already have account?{' '}
          <Link href="/login" className="text-primary font-bold">Login</Link>
        </p>
      </form>
    </div>
  );
}

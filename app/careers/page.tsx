'use client';

import { useState } from 'react';
import Layout       from '@/components/Layout';
import { Briefcase, Users, TrendingUp, DollarSign, CheckCircle2, Send } from 'lucide-react';

export default function CareersPage() {
  const [form, setForm] = useState({
    name: '', email: '', telegram: '', instagram: '',
    tiktok: '', twitter: '', youtube: '', totalFollowers: '',
    description: '', motivation: '',
  });
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/careers', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
    } else {
      setError(data.error || 'Submission failed. Please try again.');
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-black">Application Received!</h2>
          <p className="text-gray-400 max-w-xs">
            We review every application personally. If you're a fit, we'll reach out within 72 hours.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* Hero */}
        <div className="bg-surface border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Briefcase className="text-accent" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black">Join Bets Pro</h1>
              <p className="text-xs text-gray-500">Community Manager / Affiliate</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            We're building the biggest football betting platform ever. We need people with real communities who can create content, attract investors and grow alongside us.
          </p>

          {/* Perks */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: DollarSign,  label: 'Up to',     value: '$1,000/mo' },
              { icon: TrendingUp,  label: 'Commission', value: 'Per invite'  },
              { icon: Users,       label: 'Role',       value: 'Remote'      },
            ].map((p) => (
              <div key={p.label} className="bg-background border border-white/8 rounded-xl p-3 text-center">
                <p.icon size={16} className="text-accent mx-auto mb-1" />
                <p className="text-[10px] text-gray-500 font-bold uppercase">{p.label}</p>
                <p className="text-xs font-black text-white mt-0.5">{p.value}</p>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">What we need</p>
            {[
              'Active communities on social media (Telegram, Instagram, TikTok, etc.)',
              'Ability to create engaging content about sports betting',
              'Attract users who will deposit and play on the platform',
              'Demonstrate your reach — numbers, screenshots, engagement',
              'Your community must invest, not just follow',
            ].map((req) => (
              <div key={req} className="flex items-start gap-2 text-sm text-gray-400">
                <CheckCircle2 size={14} className="text-accent mt-0.5 shrink-0" />
                <span>{req}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-base font-black uppercase tracking-wider">Apply Now</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Basic Info</p>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Full name *"
              className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="Email address *"
              className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              required
            />
          </div>

          {/* Social media */}
          <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Your Communities</p>
            <p className="text-xs text-gray-600">Include links or usernames. More platforms = better chances.</p>

            {[
              { field: 'telegram',  placeholder: 'Telegram (channel/group link or @username)' },
              { field: 'instagram', placeholder: 'Instagram (@username or link)' },
              { field: 'tiktok',   placeholder: 'TikTok (@username or link)' },
              { field: 'twitter',  placeholder: 'Twitter / X (@username or link)' },
              { field: 'youtube',  placeholder: 'YouTube (channel link)' },
            ].map(({ field, placeholder }) => (
              <input
                key={field}
                value={(form as any)[field]}
                onChange={set(field)}
                placeholder={placeholder}
                className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              />
            ))}

            <input
              value={form.totalFollowers}
              onChange={set('totalFollowers')}
              placeholder="Total followers / members across all platforms *"
              className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors"
              required
            />
          </div>

          {/* About */}
          <div className="bg-surface border border-white/8 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Tell Us More</p>

            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Describe your community — who are they, how active, what content do they engage with? *"
              rows={4}
              className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors resize-none"
              required
            />

            <textarea
              value={form.motivation}
              onChange={set('motivation')}
              placeholder="Why do you want to work with Bets Pro? How many users can you realistically bring in the first month? *"
              rows={4}
              className="w-full bg-background border border-white/8 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 transition-colors resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Send size={15} /> Submit Application</>
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            We review every application personally and respond within 72 hours.
          </p>
        </form>
      </div>
    </Layout>
  );
}

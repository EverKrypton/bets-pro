'use client';

import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown, Gift, Wallet, Users, Trophy, Shield, Clock } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const faqData = [
  {
    category: 'Getting Started',
    icon: Trophy,
    color: 'text-blue-400',
    questions: [
      {
        q: 'How do I start betting?',
        a: 'Create an account, deposit USDT to your wallet, then navigate to Sports or Games to place your bets.',
      },
      {
        q: 'What is the minimum deposit?',
        a: 'The minimum deposit is $10 USDT. Deposits are processed instantly via OxaPay.',
      },
      {
        q: 'What is the minimum bet?',
        a: 'The minimum bet amount is $1 USDT. Maximum bet limits depend on the match and are shown in the bet slip.',
      },
    ],
  },
  {
    category: 'WelcomeBonus',
    icon: Gift,
    color: 'text-yellow-400',
    questions: [
      {
        q: 'How do I get the welcome bonus?',
        a: 'Make your first deposit of $100 or more. The bonus percentage depends on the amount: $100+ = 20%, $200+ = 30%, $500+ = 40%, $1000+ = 50%.',
      },
      {
        q: 'What are the requirements to claim?',
        a: 'You need to: (1) Place bets totaling $30 or more, (2) Invite 3 friends who deposit. Both requirements must be met within 30 days.',
      },
      {
        q: 'How long is the bonus valid?',
        a: 'Your welcome bonus expires after 30 days if not claimed. Meet the requirements and claimbefore it expires!',
      },
    ],
  },
  {
    category: 'Withdrawals',
    icon: Wallet,
    color: 'text-green-400',
    questions: [
      {
        q: 'What is the minimum withdrawal?',
        a: 'The minimum withdrawal is $10 USDT. A $1 USDT fee is deducted from each withdrawal.',
      },
      {
        q: 'How long do withdrawals take?',
        a: 'Withdrawals are processed by the admin team. Once approved, funds are sent via BEP20 (BNB Smart Chain) and typically arrive within minutes.',
      },
      {
        q: 'Is there a withdrawal limit?',
        a: 'You can make up to 10 withdrawals per day. Maximum single withdrawal is $10,000 USDT.',
      },
    ],
  },
  {
    category: 'Referrals',
    icon: Users,
    color: 'text-purple-400',
    questions: [
      {
        q: 'How does the referral program work?',
        a: 'Share your unique referral link. When someone signs up using your link and deposits, you earn 30% of the house edge on their bets.',
      },
      {
        q: 'How do referrals help my bonus?',
        a: 'For the welcome bonus, you need 3 referrals who deposit. This is tracked automatically in your Bonuses page.',
      },
      {
        q: 'Where is my referral link?',
        a: 'Go to the Referrals page from the side menu. You will see your unique code and shareable link.',
      },
    ],
  },
  {
    category: 'Betting',
    icon: Trophy,
    color: 'text-orange-400',
    questions: [
      {
        q: 'What is double chance betting?',
        a: 'Double chance lets you bet on two outcomes at once: 1X (Home or Draw), X2 (Draw or Away), or 12 (Home or Away). You win if either outcome happens.',
      },
      {
        q: 'What is inverse betting?',
        a: 'Inverse betting (Games section) lets you bet AGAINST an outcome. You win if that outcome does NOT happen. Example: bet "Not Home" wins if the match ends in draw or away win.',
      },
      {
        q: 'What happens if a match is cancelled?',
        a: 'If a match is cancelled or postponed, all pending bets on that match are refunded to your balance.',
      },
    ],
  },
  {
    category: 'Security',
    icon: Shield,
    color: 'text-red-400',
    questions: [
      {
        q: 'Is my money safe?',
        a: 'All deposits are held in secure wallets. Withdrawals are processed manually by the admin team for security. Your password is hashed and never stored in plain text.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Wallet > Security to change your password. You will need your current password to set a new one.',
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const categoryNames: Record<string, string> = {
    'Getting Started': t.faq.gettingStarted,
    'WelcomeBonus': t.faq.welcomeBonus,
    'Withdrawals': t.faq.withdrawals,
    'Referrals': t.faq.referrals,
    'Betting': t.faq.betting,
    'Security': t.faq.security,
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
          <HelpCircle size={24} className="text-yellow-400"/>
          {t.faq.title}
        </h1>
        <p className="text-sm text-gray-500">{t.faq.subtitle}</p>
      </div>

      <div className="space-y-6">
        {faqData.map((category, catIdx) => (
          <motion.div
            key={category.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIdx * 0.1 }}
            className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
              <category.icon size={20} className={category.color}/>
              <h2 className="font-black text-white">{categoryNames[category.category] || category.category}</h2>
            </div>
            <div className="divide-y divide-white/5">
              {category.questions.map((item, qIdx) => {
                const key = `${catIdx}-${qIdx}`;
                const isOpen = openItems.has(key);
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="font-bold text-sm text-white pr-4">{item.q}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <Clock size={20} className="text-yellow-400"/>
          <h3 className="font-black text-white">{t.faq.stillNeedHelp}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          If you couldn't find an answer to your question, contact our support team.
        </p>
        <a
          href="/support"
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl text-sm font-bold hover:bg-yellow-500/30 transition-colors"
        >
          {t.faq.contactSupport}
        </a>
      </motion.div>
    </Layout>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, TrendingUp, Users, Target, ChevronRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Bets Pro',
      subtitle: 'Your Premium Betting Platform',
      content: 'Experience the thrill of sports betting with competitive odds, instant deposits, and lightning-fast withdrawals.',
      icon: Sparkles,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Claim Your Welcome Bonus',
      subtitle: 'Up to 50% on First Deposit',
      content: 'Deposit $100+ and get up to 50% bonus! The more you deposit, the bigger your bonus.',
      icon: Gift,
      gradient: 'from-yellow-500 to-orange-500',
      table: [
        { deposit: '$100+', bonus: '20%' },
        { deposit: '$200+', bonus: '30%' },
        { deposit: '$500+', bonus: '40%' },
        { deposit: '$1000+', bonus: '50%' },
      ],
    },
    {
      title: 'How to Claim',
      subtitle: 'Simple 3-Step Process',
      content: '',
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      requirements: [
        { icon: TrendingUp, text: 'Place bets totaling $30+' },
        { icon: Users, text: 'Invite 3 friends who deposit' },
        { icon: Gift, text: 'Claim your bonus!' },
      ],
    },
  ];

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const handleClose = async () => {
    try {
      await fetch('/api/user/welcome-seen', { method: 'POST' });
    } catch {
      // silent fail
    }
    onClose();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-50 bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10"
            >
              <X size={14} className="sm:w-4 sm:h-4"/>
            </button>

            <div className="relative">
              <div className={`h-24 sm:h-32 bg-gradient-to-br ${steps[step].gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    {(() => {
                      const IconComponent = steps[step].icon;
                      return <IconComponent size={40} className="text-white/90 sm:w-12 sm:h-12" />;
                    })()}
                  </motion.div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-lg sm:text-xl font-black text-white mb-1">{steps[step].title}</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">{steps[step].subtitle}</p>
                    {steps[step].content && (
                      <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">{steps[step].content}</p>
                    )}

                    {steps[step].table && (
                      <div className="bg-white/5 rounded-xl overflow-hidden mb-3 sm:mb-4">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-white/5">
                              <th className="py-1.5 sm:py-2 px-2 sm:px-3 text-left text-gray-400 font-bold">Deposit</th>
                              <th className="py-1.5 sm:py-2 px-2 sm:px-3 text-right text-gray-400 font-bold">Bonus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {steps[step].table.map((row, i) => (
                              <tr key={i} className="border-t border-white/5">
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-white font-bold">{row.deposit}</td>
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right text-green-400 font-black">{row.bonus}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {steps[step].requirements && (
                      <div className="space-y-2 sm:space-y-3">
                        {steps[step].requirements.map((req, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-2 sm:gap-3 bg-white/5 rounded-xl p-2.5 sm:p-3"
                          >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0">
                              <req.icon size={16} className="text-white/70 sm:w-[18px] sm:h-[18px]"/>
                            </div>
                            <span className="text-xs sm:text-sm text-white font-medium">{req.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-white' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500">{step + 1} of {steps.length}</span>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/10 text-white font-bold text-xs sm:text-sm hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className={`flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all ${
                      step === steps.length - 1
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                    }`}
                  >
                    {step === steps.length -1 ? 'Start Betting' : (
                      <>
                        Continue <ChevronRight size={14} className="sm:w-4 sm:h-4"/>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
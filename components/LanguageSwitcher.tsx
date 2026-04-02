'use client';

import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-bold"
      title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
    >
      <Globe size={12} />
      <span>{language === 'en' ? 'EN' : 'ES'}</span>
    </button>
  );
}
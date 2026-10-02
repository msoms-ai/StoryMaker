import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Dices, ArrowLeft, ArrowRight, BookOpen, Star, Compass, Wand2, ShieldCheck, HeartHandshake, PhoneCall, Info, Users, FileText, Layers, Mic } from 'lucide-react';

export default function LandingPage({ setCurrentView, setSelectedStoryId }) {
  const { lang, t } = useLanguage();
  const { settings, user } = useAuth();

  const currentSiteName = (typeof settings?.siteName === 'object' && settings.siteName !== null
    ? (settings.siteName[lang] || settings.siteName.ar || settings.siteName.en)
    : settings?.siteName) || t('appName');

  const currentSiteSubtitle = (typeof settings?.siteSubtitle === 'object' && settings.siteSubtitle !== null
    ? (settings.siteSubtitle[lang] || settings.siteSubtitle.ar || settings.siteSubtitle.en)
    : settings?.siteSubtitle) || t('appTagline');

  const [showDiceTooltip, setShowDiceTooltip] = useState(false);
  const [stats, setStats] = useState({ totalStories: 0, totalSlides: 0, totalUsers: 0 });

  useEffect(() => {
    fetch('/api/statistics')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.stats);
      })
      .catch(console.error);
  }, []);

  // Trigger random story from backend
  const handleRandomStory = async () => {
    try {
      const res = await fetch('/api/stories?random=true');
      const data = await res.json();
      if (data.success && data.story) {
        if (user) {
          await fetch(`/api/stories/${data.story.id}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentSlide: 0, completed: false, userId: user.id })
          });
        }
        setSelectedStoryId(data.story.id);
        setCurrentView('reader');
      } else {
        setCurrentView('categories');
      }
    } catch (err) {
      setCurrentView('categories');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between px-4 py-8 max-w-7xl mx-auto">
      
      {/* Central Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-6">
        
        {/* Main Headline */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-bold mb-6 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{currentSiteSubtitle}</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl leading-tight font-arabic mb-8">
          {lang === 'ar' ? (
            <>حكايات مصورة ومقروءة <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">بالذكاء الاصطناعي</span></>
          ) : (
            <>AI-Powered Illustrated & Voice <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">Interactive Stories</span></>
          )}
        </h2>

        {/* Flying Books Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
          <div className="absolute left-[15%]" style={{animation: 'floatUp 18s linear infinite 0s'}}><BookOpen className="w-12 h-12 text-slate-400" /></div>
          <div className="absolute left-[45%]" style={{animation: 'floatUp 22s linear infinite 5s'}}><BookOpen className="w-8 h-8 text-blue-300" /></div>
          <div className="absolute left-[75%]" style={{animation: 'floatUp 25s linear infinite 2s'}}><BookOpen className="w-16 h-16 text-emerald-200" /></div>
          <div className="absolute left-[90%]" style={{animation: 'floatUp 20s linear infinite 8s'}}><BookOpen className="w-10 h-10 text-amber-200" /></div>
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(100vh) rotate(0deg) scale(0.8); opacity: 0; }
              20% { opacity: 0.8; }
              80% { opacity: 0.8; }
              100% { transform: translateY(-20vh) rotate(360deg) scale(1.2); opacity: 0; }
            }
          `}</style>
        </div>

        {/* Action Buttons Row: Massive CTA + Secondary */}
        <div className="flex flex-col items-center justify-center gap-6 mt-12 relative z-10 w-full max-w-lg mx-auto">
          
          {/* Massive CTA */}
          <button
            onClick={() => setCurrentView('wizard')}
            className="group relative w-full py-6 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-2xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col items-center justify-center gap-2 overflow-hidden border-4 border-amber-300/30"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Wand2 className="w-10 h-10 animate-bounce" />
            <span className="relative z-10">{t('generateStory')}</span>
          </button>

          {/* Secondary Button */}
          <button
            onClick={handleRandomStory}
            className="group relative w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 border-2 border-indigo-400/40"
          >
            <Dices className="w-6 h-6 text-amber-300 group-hover:animate-spin" />
            <span>{t('diceTooltip')}</span>
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4 mb-16 max-w-6xl mx-auto w-full">
        <div className="glass-panel p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
          <Sparkles className="w-6 h-6 text-indigo-500 mb-1" />
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalAiGeneratedStories || 0}</div>
          <div className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'قصص الذكاء الاصطناعي' : 'AI Stories'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
          <FileText className="w-6 h-6 text-blue-500 mb-1" />
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalConvertedStories || 0}</div>
          <div className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'القصص المحولة' : 'Converted Stories'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
          <Layers className="w-6 h-6 text-amber-500 mb-1" />
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalSlides}</div>
          <div className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'إجمالي الشرائح' : 'Total Slides'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
          <Mic className="w-6 h-6 text-pink-500 mb-1" />
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalMinutesVoice || 0}</div>
          <div className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'دقائق صوتية' : 'Voice Minutes'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1 col-span-2 md:col-span-1">
          <Users className="w-6 h-6 text-emerald-500 mb-1" />
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</div>
          <div className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'المستخدمين' : 'Users'}</div>
        </div>
      </div>

      {/* Footer Navigation (4 separate links + Credit) */}
      <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">
          <button
            onClick={() => setCurrentView('about')}
            className="hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <Info className="w-4 h-4" />
            {t('footerAbout')}
          </button>
          <button
            onClick={() => setCurrentView('rules')}
            className="hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {t('footerRules')}
          </button>
          <button
            onClick={() => setCurrentView('feedback')}
            className="hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <HeartHandshake className="w-4 h-4" />
            {t('footerFeedback')}
          </button>
          <button
            onClick={() => setCurrentView('contact')}
            className="hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <PhoneCall className="w-4 h-4" />
            {t('footerContact')}
          </button>
        </div>

        {/* Required Credit Line */}
        <p className="text-xs text-slate-500 dark:text-slate-500 font-bold font-mono">
          {t('footerCredit')}
        </p>
      </footer>

    </div>
  );
}

import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Dices, ArrowLeft, ArrowRight, BookOpen, Star, Compass, Wand2, ShieldCheck, HeartHandshake, PhoneCall, Info } from 'lucide-react';

export default function LandingPage({ setCurrentView, setSelectedStoryId }) {
  const { lang, t } = useLanguage();
  const { settings } = useAuth();

  const currentSiteName = (typeof settings?.siteName === 'object' && settings.siteName !== null
    ? (settings.siteName[lang] || settings.siteName.ar || settings.siteName.en)
    : settings?.siteName) || t('appName');

  const currentSiteSubtitle = (typeof settings?.siteSubtitle === 'object' && settings.siteSubtitle !== null
    ? (settings.siteSubtitle[lang] || settings.siteSubtitle.ar || settings.siteSubtitle.en)
    : settings?.siteSubtitle) || t('appTagline');

  const [isOpenEasterEgg, setIsOpenEasterEgg] = useState(false);
  const [showDiceTooltip, setShowDiceTooltip] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const bookRef = useRef(null);

  // Mouse tilt illusion logic for the 3D book
  const handleMouseMove = (e) => {
    if (!bookRef.current || isOpenEasterEgg) return;
    const rect = bookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / rect.height) * -25,
      y: (x / rect.width) * 25
    });
  };

  const handleMouseLeave = () => {
    if (!isOpenEasterEgg) {
      setTilt({ x: 0, y: 0 });
    }
  };

  // Trigger random story from backend
  const handleRandomStory = async () => {
    try {
      const res = await fetch('/api/stories?random=true');
      const data = await res.json();
      if (data.success && data.story) {
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

        {/* 3D Hovering Book Component with Secret Easter Egg */}
        <div className="perspective-1000 my-8 relative flex items-center justify-center">
          <div
            ref={bookRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`book-container ${isOpenEasterEgg ? 'open-book' : ''}`}
            style={{
              transform: isOpenEasterEgg
                ? 'rotateY(-15deg) scale(1.05)'
                : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            }}
          >
            {/* Secret Easter Egg Ribbon / Bookmark */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpenEasterEgg(!isOpenEasterEgg);
              }}
              className="easter-egg-ribbon group flex flex-col items-center justify-end pb-2"
              title={t('easterEggHint')}
            >
              <span className="text-[9px] font-black text-white uppercase tracking-tighter opacity-90 group-hover:scale-110">
                msoms
              </span>
            </div>

            {/* Book Outer Cover */}
            <div className="book-cover border-2 border-indigo-400/30">
              <div className="flex justify-between items-center text-amber-300">
                <Sparkles className="w-6 h-6 animate-spin" />
                <span className="text-xs font-bold tracking-widest uppercase opacity-80">QISAS 2026</span>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/40">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white font-arabic">{currentSiteName}</h3>
                <p className="text-xs text-indigo-200 mt-1">قصص الأطفال المبتكرة</p>
              </div>

              <div className="text-center text-[10px] text-slate-300">
                <span>{lang === 'ar' ? 'انقر على الشريط لكشف السر' : 'Click ribbon to open secret'}</span>
              </div>
            </div>

            {/* Book Interior - Reveals msoms.ai when opened! */}
            <div className="book-inside">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl mb-3 shadow-lg animate-pulse">
                ai
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-900 font-arabic">
                {t('easterEggTitle')}
              </h4>
              <p className="text-xs text-slate-600 font-medium my-2">
                {t('easterEggSub')}
              </p>
              <div className="px-3 py-1.5 rounded-full bg-indigo-600 text-white font-black text-sm tracking-wider shadow-md">
                {t('easterEggBrand')}
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons Row: Creative Out of the Box Button + Hovering Dice */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          
          {/* Creative Out of the box button */}
          <button
            onClick={() => setCurrentView('wizard')}
            className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-lg shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Wand2 className="w-6 h-6 animate-bounce" />
            <span className="relative z-10">{t('generateStory')}</span>
            {lang === 'ar' ? <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>

          {/* Hovering Dice Button */}
          <div className="relative">
            <button
              onClick={handleRandomStory}
              onMouseEnter={() => setShowDiceTooltip(true)}
              onMouseLeave={() => setShowDiceTooltip(false)}
              className="floating-element p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 hover:scale-110 active:scale-90 transition-all duration-300 border-2 border-indigo-400/40"
              aria-label="Read a random story"
            >
              <Dices className="w-7 h-7 text-amber-300 animate-spin-slow" />
            </button>

            {/* Hover Tooltip: "Read a random story!" in EN / "فاجئني بقصة!" in AR */}
            {showDiceTooltip && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold shadow-xl border border-amber-500/30 animate-fade-in z-30">
                {t('diceTooltip')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            )}
          </div>

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

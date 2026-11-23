import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';
import { ArrowRight, ArrowLeft, Volume2, Pause, SkipForward, Maximize, AlertCircle, Play, CheckCircle2, User, Sparkles, Share2, Video, HelpCircle, Award, Mic, Compass, Palette, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EnhancedAudioPlayer from './EnhancedAudioPlayer';
import SoundscapePlayer from './SoundscapePlayer';
import { soundscapeManager } from '../utils/ambientSoundscapes';
import ShareStoryModal from './ShareStoryModal';
import StoryQuizModal from './StoryQuizModal';
import ReadingCoachModal from './ReadingCoachModal';
import BranchingChoiceModal from './BranchingChoiceModal';
import ColoringBookModal from './ColoringBookModal';
import VisualHotspotOverlay from './VisualHotspotOverlay';

export default function StoryReaderPage({ storyId, setCurrentView, setViewingUserId }) {
  const { lang, dir, t } = useLanguage();
  const { user, token, openAuthModal } = useAuth();
  
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showToastNotice, setShowToastNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isReadingCoachOpen, setIsReadingCoachOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isColoringModalOpen, setIsColoringModalOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [userBestQuizScore, setUserBestQuizScore] = useState(null);
  const [hasBranched, setHasBranched] = useState(false);
  
  const lastSlideTimeRef = useRef(Date.now());
  const maxReachedSlideRef = useRef(0);

  // Protected AI Feature Handlers (Require Login)
  const handleOpenBranchModal = () => {
    if (hasBranched || currentSlide?.isBranchChoice) {
      setToastMessage(lang === 'ar' ? 'تم اختيار مسار هذه المغامرة بالفعل' : 'An adventure path has already been chosen for this story');
      setShowToastNotice(true);
      setTimeout(() => setShowToastNotice(false), 3500);
      return;
    }
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      setToastMessage(lang === 'ar' ? 'يرجى تسجيل الدخول لتجربة مسارات القصة التفاعلية بالذكاء الاصطناعي' : 'Please sign in to experience AI interactive story branching');
      setShowToastNotice(true);
      setTimeout(() => setShowToastNotice(false), 4500);
      return;
    }
    setIsBranchModalOpen(true);
  };

  const handleOpenReadingCoach = () => {
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      setToastMessage(lang === 'ar' ? 'يرجى تسجيل الدخول للتدرب مع مرشد القراءة الصوتي الذكي' : 'Please sign in to practice with the AI Reading Coach');
      setShowToastNotice(true);
      setTimeout(() => setShowToastNotice(false), 4500);
      return;
    }
    setIsReadingCoachOpen(true);
  };

  // Stop ambient soundscape audio when reader unmounts
  useEffect(() => {
    return () => {
      soundscapeManager.stop();
    };
  }, []);

  // Fetch story data by storyId
  useEffect(() => {
    if (!storyId) return;
    const fetchUrl = `/api/stories/${storyId}${user ? `?userId=${user.id}` : ''}`;
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.story) {
          setStory(data.story);
          setHasBranched(Boolean(data.story?.hasBranched || data.story?.slides?.some(s => s.isBranchChoice)));
          const userProg = user ? data.story.userProgress?.[user.id] : null;
          const initialSlide = userProg?.currentSlide ?? data.story.readProgress?.currentSlide ?? 0;
          setCurrentSlideIdx(initialSlide);
          if (user && data.story.quizAttempts?.[user.id]) {
            setUserBestQuizScore(data.story.quizAttempts[user.id].highestScore);
          }
          maxReachedSlideRef.current = initialSlide;
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storyId]);

  // Handle slide change with speed-reading protection check
  const changeSlide = (newIdx) => {
    if (!story || newIdx < 0 || newIdx >= story.slides.length) return;

    const now = Date.now();
    const timeDelta = now - lastSlideTimeRef.current;
    lastSlideTimeRef.current = now;

    // Fast Reading Detection Check: If moving forward to an unread slide faster than 1.5s (1500ms)
    if (newIdx > currentSlideIdx && newIdx > maxReachedSlideRef.current && timeDelta < 1500) {
      setIsShaking(true);
      const warningText = lang === 'ar'
        ? 'هون عليك! إقرأ بتمعن و استمتع!'
        : 'Take it easy! Read carefully and enjoy!';
      setToastMessage(warningText);
      setShowToastNotice(true);

      setTimeout(() => setIsShaking(false), 700);
      setTimeout(() => setShowToastNotice(false), 3500);
      return;
    }

    if (newIdx > maxReachedSlideRef.current) {
      maxReachedSlideRef.current = newIdx;
    }

    setCurrentSlideIdx(newIdx);

    // Check completion condition (reached final slide)
    const isLastSlide = newIdx === story.slides.length - 1;
    if (isLastSlide) {
      triggerStarConfetti();
      saveProgress(newIdx, true);
    } else {
      saveProgress(newIdx, false);
    }
  };

  // Confetti effect on completion
  const triggerStarConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      shapes: ['star'],
      colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899']
    });
  };

  // Save progress back to server DB
  const saveProgress = (slideIndex, isCompleted) => {
    if (!story || !user) return;
    fetch(`/api/stories/${story.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentSlide: slideIndex, completed: isCompleted, userId: user.id })
    }).catch(console.error);
  };

  const handleBackToHome = () => {
    saveProgress(currentSlideIdx, currentSlideIdx === (story?.slides.length - 1));
    setCurrentView('landing');
  };

  const handleBranchChoiceSelected = (newSlide, chosenChoice, newSlides) => {
    if (!newSlide) return;
    setHasBranched(true);

    const validPrior = (story?.slides || []).slice(0, currentSlideIdx + 1);
    const updatedSlides = newSlides && Array.isArray(newSlides) && newSlides.length > 0
      ? newSlides
      : [...validPrior, newSlide];

    const targetIdx = currentSlideIdx + 1;

    setStory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: updatedSlides,
        slidesCount: updatedSlides.length,
        hasBranched: true
      };
    });

    // Advance to the new branched slide smoothly
    setTimeout(() => {
      maxReachedSlideRef.current = Math.max(maxReachedSlideRef.current, targetIdx);
      lastSlideTimeRef.current = 0;
      setCurrentSlideIdx(targetIdx);
      triggerStarConfetti();
    }, 350);
  };

  if (loading || !story) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <Sparkles className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  const currentSlide = story.slides[currentSlideIdx];
  const progressPercent = Math.round(((currentSlideIdx + 1) / story.slides.length) * 100);

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-90px)] flex flex-col justify-between ${isShaking ? 'shake-animation' : ''}`}>
      
      {/* Toast Notice for Speed Reading Shake Warning */}
      {showToastNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-2xl border-2 border-rose-300 flex items-center gap-3 animate-bounce">
          <AlertCircle className="w-6 h-6 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Reader Header: Top Left Back Button, Story Title in Center, and Actions */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800 relative">
        
        {/* Top Left Back Button (Compact icon below lg, full label on wide screens) */}
        <button
          onClick={handleBackToHome}
          className={`p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shrink-0 ${lang === 'ar' ? 'font-arabic' : ''}`}
          title={t('readerBackBtn')}
        >
          {lang === 'ar' ? <ArrowRight className="w-4 h-4 shrink-0" /> : <ArrowLeft className="w-4 h-4 shrink-0" />}
          <span className="hidden lg:inline">{t('readerBackBtn')}</span>
        </button>

        {/* Story Name & Author Visible in Middle (Fluidly occupies middle space without overlap) */}
        <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-2 mx-1 overflow-hidden">
          <h2 className="text-sm xs:text-base sm:text-lg font-black text-slate-900 dark:text-white font-story text-center truncate w-full max-w-full">
            {(typeof story.name === 'object' && story.name ? (story.name[lang] || story.name.ar || story.name.en) : story.name) || story.title || (lang === 'ar' ? 'قصة مصورة' : 'Story')}
          </h2>
          {story.authorName && (
            <div 
              onClick={() => {
                const id = story.authorId || story.userId || 'anonymous';
                if (setViewingUserId) setViewingUserId(id);
                setCurrentView('publicProfile');
              }}
              className="flex items-center justify-center gap-1 mt-0.5 text-[11px] sm:text-xs text-slate-500 hover:text-amber-500 hover:underline cursor-pointer transition-colors font-bold truncate max-w-full"
              title={story.authorName}
            >
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{story.authorName}</span>
            </div>
          )}
        </div>

        {/* Desktop Header Actions: Compact Vibrant Icon Dock (Never overlaps title) */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0">
          {/* 1. Coloring Studio & Activity Center */}
          <div className="relative group">
            <button
              onClick={() => setIsColoringModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all"
              aria-label={t('toolColoringTitle')}
              title={t('toolColoringTitle')}
            >
              <Palette className="w-4 h-4 text-amber-100" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolColoringTitle')}
            </div>
          </div>

          {/* 2. Choose Your Adventure Branch */}
          <div className="relative group">
            <button
              disabled={hasBranched || currentSlide?.isBranchChoice}
              onClick={handleOpenBranchModal}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all ${
                hasBranched || currentSlide?.isBranchChoice
                  ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white hover:scale-110 active:scale-95'
              }`}
              aria-label={hasBranched ? (lang === 'ar' ? 'المسار محدد' : 'Path Chosen') : t('toolBranchTitle')}
              title={hasBranched ? (lang === 'ar' ? 'تم اختيار مسار هذه المغامرة بالفعل' : 'Path already chosen') : t('toolBranchTitle')}
            >
              <Compass className="w-4 h-4 text-amber-100" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolBranchTitle')}
            </div>
          </div>

          {/* 3. AI Reading Coach */}
          <div className="relative group">
            <button
              onClick={handleOpenReadingCoach}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all"
              aria-label={t('toolCoachTitle')}
              title={t('toolCoachTitle')}
            >
              <Mic className="w-4 h-4 text-emerald-100" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolCoachTitle')}
            </div>
          </div>

          {/* 4. Story Quiz */}
          <div className="relative group">
            <button
              onClick={() => setIsQuizModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all relative"
              aria-label={t('toolQuizTitle')}
              title={t('toolQuizTitle')}
            >
              <HelpCircle className="w-4 h-4 text-purple-100" />
              {userBestQuizScore !== null && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800" />
              )}
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolQuizTitle')}
            </div>
          </div>

          {/* 5. Motion Video */}
          <div className="relative group">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all"
              aria-label={t('toolVideoTitle')}
              title={t('toolVideoTitle')}
            >
              <Video className="w-4 h-4 text-rose-100" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolVideoTitle')}
            </div>
          </div>

          {/* 6. Share & Landscape PDF */}
          <div className="relative group">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all"
              aria-label={t('toolShareTitle')}
              title={t('toolShareTitle')}
            >
              <Share2 className="w-4 h-4 text-amber-100" />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] font-bold shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 transform -translate-y-1 group-hover:translate-y-0">
              {t('toolShareTitle')}
            </div>
          </div>
        </div>

        {/* Mobile Header Actions (Visible on mobile/tablet < md screens) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0 relative">
          {/* Quick Share Icon Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 active:scale-95 transition-all"
            title={lang === 'ar' ? 'مشاركة وطباعة PDF' : 'Share & PDF'}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Interactive Tools Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs shadow-md flex items-center gap-1 active:scale-95 transition-all"
              title={t('storyToolsDropdownTitle')}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span>{t('storyToolsMenuBtn')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile Dropdown Backdrop */}
            {isToolsDropdownOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                onClick={() => setIsToolsDropdownOpen(false)}
              />
            )}

            {/* Mobile Dropdown Menu Card */}
            {isToolsDropdownOpen && (
              <div
                className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 z-50 w-72 xs:w-80 rounded-3xl glass-panel bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 animate-scale-in`}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('storyToolsDropdownTitle')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black">
                    6 {lang === 'ar' ? 'ميزات' : 'tools'}
                  </span>
                </div>

                {/* 1. Coloring Studio */}
                <button
                  onClick={() => { setIsToolsDropdownOpen(false); setIsColoringModalOpen(true); }}
                  className={`w-full p-2.5 rounded-2xl hover:bg-amber-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolColoringTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolColoringDesc')}
                    </div>
                  </div>
                </button>

                {/* 2. Choose Your Adventure Branch */}
                <button
                  disabled={hasBranched || currentSlide?.isBranchChoice}
                  onClick={() => {
                    if (hasBranched || currentSlide?.isBranchChoice) return;
                    setIsToolsDropdownOpen(false);
                    handleOpenBranchModal();
                  }}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-colors ${
                    hasBranched || currentSlide?.isBranchChoice
                      ? 'opacity-50 cursor-not-allowed text-slate-400'
                      : 'hover:bg-orange-500/10 text-slate-700 dark:text-slate-200'
                  } ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolBranchTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolBranchDesc')}
                    </div>
                  </div>
                </button>

                {/* 3. AI Reading Coach */}
                <button
                  onClick={() => { setIsToolsDropdownOpen(false); handleOpenReadingCoach(); }}
                  className={`w-full p-2.5 rounded-2xl hover:bg-emerald-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolCoachTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolCoachDesc')}
                    </div>
                  </div>
                </button>

                {/* 4. Motion Video */}
                <button
                  onClick={() => { setIsToolsDropdownOpen(false); setIsShareModalOpen(true); }}
                  className={`w-full p-2.5 rounded-2xl hover:bg-indigo-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolVideoTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolVideoDesc')}
                    </div>
                  </div>
                </button>

                {/* 5. Story Quiz */}
                <button
                  onClick={() => { setIsToolsDropdownOpen(false); setIsQuizModalOpen(true); }}
                  className={`w-full p-2.5 rounded-2xl hover:bg-purple-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolQuizTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolQuizDesc')}
                    </div>
                  </div>
                </button>

                {/* 6. Share & Landscape PDF */}
                <button
                  onClick={() => { setIsToolsDropdownOpen(false); setIsShareModalOpen(true); }}
                  className={`w-full p-2.5 rounded-2xl hover:bg-amber-500/10 text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {t('toolShareTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {t('toolShareDesc')}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Quick-Actions Dock: Centered Compact Icon Dock */}
      <div className="md:hidden flex items-center justify-center py-1 -mt-1 mb-3 px-2">
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          {/* 1. Coloring */}
          <button
            onClick={() => setIsColoringModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
            aria-label={t('toolColoringTitle')}
            title={t('toolColoringTitle')}
          >
            <Palette className="w-4 h-4 text-amber-100" />
          </button>

          {/* 2. Branch */}
          <button
            disabled={hasBranched || currentSlide?.isBranchChoice}
            onClick={handleOpenBranchModal}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-transform ${
              hasBranched || currentSlide?.isBranchChoice
                ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white active:scale-90'
            }`}
            aria-label={t('toolBranchTitle')}
            title={hasBranched ? (lang === 'ar' ? 'تم اختيار مسار هذه المغامرة بالفعل' : 'Path already chosen') : t('toolBranchTitle')}
          >
            <Compass className="w-4 h-4 text-amber-100" />
          </button>

          {/* 3. Coach */}
          <button
            onClick={handleOpenReadingCoach}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
            aria-label={t('toolCoachTitle')}
            title={t('toolCoachTitle')}
          >
            <Mic className="w-4 h-4 text-emerald-100" />
          </button>

          {/* 4. Quiz */}
          <button
            onClick={() => setIsQuizModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform relative"
            aria-label={t('toolQuizTitle')}
            title={t('toolQuizTitle')}
          >
            <HelpCircle className="w-4 h-4 text-purple-100" />
            {userBestQuizScore !== null && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800" />
            )}
          </button>

          {/* 5. Video */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
            aria-label={t('toolVideoTitle')}
            title={t('toolVideoTitle')}
          >
            <Video className="w-4 h-4 text-rose-100" />
          </button>

          {/* 6. Share & PDF */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
            aria-label={t('toolShareTitle')}
            title={t('toolShareTitle')}
          >
            <Share2 className="w-4 h-4 text-amber-100" />
          </button>
        </div>
      </div>

      {/* Main Middle Slide Container */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 space-y-6">
        
        {/* Slide Image Box */}
        <div className="w-full max-w-2xl h-72 sm:h-96 rounded-3xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center p-3 relative group">
          <img
            src={currentSlide.imageFile}
            alt={currentSlide.title}
            className="w-full h-full object-contain rounded-2xl"
          />

          {/* Interactive Visual Vocabulary Hotspots Overlay */}
          <VisualHotspotOverlay
            storyId={story?.id}
            slideIdx={currentSlideIdx}
            slide={currentSlide}
            lang={lang}
          />

          {/* Quick Floating Color Slide Button */}
          <button
            onClick={() => setIsColoringModalOpen(true)}
            className={`absolute top-3 ${dir === 'rtl' ? 'left-3' : 'right-3'} px-2.5 py-1.5 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white text-[11px] sm:text-xs font-black backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 z-10 active:scale-95`}
            title={lang === 'ar' ? 'لوّن هذا المشهد في المرسم' : 'Color this scene'}
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xs:inline sm:inline">{lang === 'ar' ? 'لوّن المشهد' : 'Color Scene'}</span>
          </button>

          {/* Slide Navigation Overlay Buttons */}
          <button
            disabled={currentSlideIdx === 0}
            onClick={() => changeSlide(currentSlideIdx - 1)}
            className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white disabled:opacity-20 transition-all backdrop-blur-md z-10`}
          >
            {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>

          <button
            disabled={currentSlideIdx === story.slides.length - 1}
            onClick={() => changeSlide(currentSlideIdx + 1)}
            className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white disabled:opacity-20 transition-all backdrop-blur-md z-10`}
          >
            {dir === 'rtl' ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
          </button>
        </div>

        {/* Enhanced Audio Player Controls & Real-Time Spoken Word Highlighting */}
        <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl space-y-4 shadow-lg border border-slate-200/60 dark:border-slate-800/60 font-story">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-story truncate max-w-[200px] sm:max-w-none">
              {currentSlide.title}
            </h3>

            <button
              onClick={() => setIsReadingCoachOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shrink-0"
              title={lang === 'ar' ? 'تدرب على قراءة هذا المشهد بصوتك' : 'Practice reading this scene aloud'}
            >
              <Mic className="w-3.5 h-3.5 text-emerald-100 animate-pulse" />
              <span>{t('readingCoachLaunchBtn') || (lang === 'ar' ? 'مرشد القراءة 🎙️' : 'Reading Coach 🎙️')}</span>
            </button>
          </div>

          <EnhancedAudioPlayer
            audioUrl={currentSlide.voiceFile}
            text={currentSlide.text}
            lang={lang}
          />

          {/* Ambient Soundscapes & Atmospheric Foley Audio Player */}
          <SoundscapePlayer
            storyCategory={story?.category || story?.theme || ''}
            className="mt-2"
          />

          {/* Choose-Your-Own-Adventure Branching Story Prompt */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {currentSlide.isBranchChoice ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                  <span>{lang === 'ar' ? `مسار مُختار: ${currentSlide.choiceTitle || 'مغامرة فرعية'}` : `Chosen Path: ${currentSlide.choiceTitle || 'Branched Adventure'}`}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{lang === 'ar' ? 'ماذا سيفعل البطل الآن؟ اختر مسار المغامرة!' : 'What will the hero do next? Choose the adventure!'}</span>
                </span>
              )}
            </div>

            <button
              disabled={hasBranched || currentSlide?.isBranchChoice}
              onClick={handleOpenBranchModal}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                hasBranched || currentSlide?.isBranchChoice
                  ? 'bg-slate-700/60 text-slate-300 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 hover:shadow-amber-500/25 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
              title={hasBranched || currentSlide?.isBranchChoice
                ? (lang === 'ar' ? 'تم اختيار مسار هذه المغامرة بالفعل' : 'Path already chosen')
                : (lang === 'ar' ? 'اختر مسارك (مغامرة تفاعلية Choose-Your-Own-Adventure)' : 'Choose Your Adventure Branch')}
            >
              <Compass className="w-4 h-4" />
              <span>
                {hasBranched || currentSlide?.isBranchChoice
                  ? (lang === 'ar' ? 'المسار محدد ✓' : 'Path Chosen ✓')
                  : (lang === 'ar' ? 'اختر مسارك 🌿' : 'Branch Path 🌿')}
              </span>
            </button>
          </div>
        </div>

        {/* Story Quiz CTA Card - Visible only on the Last Slide */}
        {currentSlideIdx === story.slides.length - 1 && (
          <div className="w-full max-w-2xl p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-rose-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 backdrop-blur-md shadow-xl text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-story">
                {t('startQuizCtaTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold max-w-lg mx-auto leading-relaxed">
                {t('startQuizCtaSub')}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-500/20">
                📖 {t('quizPillStory')}
              </span>
              <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-black border border-indigo-500/20">
                ✍️ {t('quizPillGrammar')}
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-500/20">
                💡 {t('quizPillMoral')}
              </span>
              <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-500/20">
                🔍 {t('quizPillVocab')}
              </span>
            </div>

            {/* Start Button & Past Score */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsQuizModalOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm sm:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <HelpCircle className="w-5 h-5 text-amber-200" />
                <span>{userBestQuizScore !== null ? t('retakeQuizBtn') : t('startQuizBtn')}</span>
              </button>

              {userBestQuizScore !== null && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-black">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>{t('previousScoreLabel')} {userBestQuizScore}/10</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Reader Footer Controls & Status */}
      <div className={`mt-6 space-y-3 ${lang === 'ar' ? 'font-arabic' : ''}`}>
        
        {/* Completion Progress Status Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>{t('completionBar')}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Slide Counter Footer */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 pt-2">
          <span>
            {t('slideCounter').replace('{x}', currentSlideIdx + 1).replace('{y}', story.slides.length)}
          </span>

          {currentSlideIdx === story.slides.length - 1 && (
            <span className="text-emerald-500 font-black flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {t('storyCompletedConfetti')}
            </span>
          )}
        </div>

      </div>

      {/* Share Story & Landscape PDF Modal */}
      <ShareStoryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        story={story}
        lang={lang}
      />

      {/* Typeform Story Quiz Modal */}
      <StoryQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        story={story}
        onRetakeSuccess={(score) => setUserBestQuizScore((prev) => Math.max(prev || 0, score))}
      />

      {/* AI Reading Coach & Pronunciation Tutor Modal */}
      <ReadingCoachModal
        isOpen={isReadingCoachOpen}
        onClose={() => setIsReadingCoachOpen(false)}
        slideText={currentSlide?.text || ''}
        slideTitle={currentSlide?.title || ''}
        slideVoiceUrl={currentSlide?.voiceFile || ''}
        storyTitle={story?.title || ''}
      />

      {/* Choose-Your-Own-Adventure Branching Modal */}
      <BranchingChoiceModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        story={story}
        currentSlideIdx={currentSlideIdx}
        onChoiceSelected={handleBranchChoiceSelected}
        lang={lang}
      />

      {/* Interactive Coloring Studio & Activity Center Modal */}
      <ColoringBookModal
        isOpen={isColoringModalOpen}
        onClose={() => setIsColoringModalOpen(false)}
        story={story}
        initialSlideIdx={currentSlideIdx}
        lang={lang}
      />

    </div>
  );
}

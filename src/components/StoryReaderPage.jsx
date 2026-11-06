import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';
import { ArrowRight, ArrowLeft, Volume2, Pause, SkipForward, Maximize, AlertCircle, Play, CheckCircle2, User, Sparkles, Share2, Video, HelpCircle, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EnhancedAudioPlayer from './EnhancedAudioPlayer';
import ShareStoryModal from './ShareStoryModal';
import StoryQuizModal from './StoryQuizModal';

export default function StoryReaderPage({ storyId, setCurrentView, setViewingUserId }) {
  const { lang, dir, t } = useLanguage();
  const { user } = useAuth();
  
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showToastNotice, setShowToastNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [userBestQuizScore, setUserBestQuizScore] = useState(null);
  
  const lastSlideTimeRef = useRef(Date.now());
  const maxReachedSlideRef = useRef(0);

  // Fetch story data by storyId
  useEffect(() => {
    if (!storyId) return;
    const fetchUrl = `/api/stories/${storyId}${user ? `?userId=${user.id}` : ''}`;
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.story) {
          setStory(data.story);
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

      {/* Reader Header: Top Left Back Button & Story Title in Middle Top */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        
        {/* Top Left Back Button */}
        <button
          onClick={handleBackToHome}
          className={`px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors flex items-center gap-2 ${lang === 'ar' ? 'font-arabic' : ''}`}
        >
          {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t('readerBackBtn')}</span>
        </button>

        {/* Story Name & Author Visible in Middle Top */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-story text-center truncate max-w-md">
            {(typeof story.name === 'object' && story.name ? (story.name[lang] || story.name.ar || story.name.en) : story.name) || story.title || (lang === 'ar' ? 'قصة مصورة' : 'Story')}
          </h2>
          {story.authorName && (
            <div 
              onClick={() => {
                const id = story.authorId || story.userId || 'anonymous';
                if (setViewingUserId) setViewingUserId(id);
                setCurrentView('publicProfile');
              }}
              className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 hover:text-amber-500 hover:underline cursor-pointer transition-colors font-bold"
              title={story.authorName}
            >
              <User className="w-4 h-4" />
              <span>{story.authorName}</span>
            </div>
          )}
        </div>

        {/* Top Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Video Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-1.5 ${lang === 'ar' ? 'font-arabic' : ''}`}
            title={lang === 'ar' ? 'مشاهدة وتحميل فيديو القصة (MP4)' : 'Watch & Download Story Video (MP4)'}
          >
            <Video className="w-4 h-4" />
            <span>{lang === 'ar' ? 'فيديو' : 'Video'}</span>
          </button>

          {/* Share & PDF Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className={`px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 ${lang === 'ar' ? 'font-arabic' : ''}`}
            title={lang === 'ar' ? 'مشاركة أو تحميل القصة كـ PDF' : 'Share or Download Story as PDF'}
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
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

          {/* Slide Navigation Overlay Buttons */}
          <button
            disabled={currentSlideIdx === 0}
            onClick={() => changeSlide(currentSlideIdx - 1)}
            className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white disabled:opacity-20 transition-all backdrop-blur-md`}
          >
            {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>

          <button
            disabled={currentSlideIdx === story.slides.length - 1}
            onClick={() => changeSlide(currentSlideIdx + 1)}
            className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} p-3 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white disabled:opacity-20 transition-all backdrop-blur-md`}
          >
            {dir === 'rtl' ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
          </button>
        </div>

        {/* Enhanced Audio Player Controls & Real-Time Spoken Word Highlighting */}
        <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl space-y-4 shadow-lg border border-slate-200/60 dark:border-slate-800/60 font-story">
          <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 font-story">
            {currentSlide.title}
          </h3>

          <EnhancedAudioPlayer
            audioUrl={currentSlide.voiceFile}
            text={currentSlide.text}
            lang={lang}
          />
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

    </div>
  );
}

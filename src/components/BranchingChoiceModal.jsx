import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Map,
  Key,
  Sparkles,
  Footprints,
  Feather,
  Flame,
  Shield,
  DoorOpen,
  TreePine,
  Mountain,
  Search,
  Eye,
  Heart,
  Wand2,
  Star,
  Crown,
  Gem,
  Bird,
  Zap,
  Lightbulb,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  HelpCircle,
  Sparkle
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Icon dictionary mapping backend icon names to Lucide components
const ICON_COMPONENTS = {
  Compass,
  Map,
  Key,
  Sparkles,
  Footprints,
  Feather,
  Flame,
  Shield,
  DoorOpen,
  TreePine,
  Mountain,
  Search,
  Eye,
  Heart,
  Wand2,
  Star,
  Crown,
  Gem,
  Bird,
  Zap,
  Lightbulb
};

function renderChoiceIcon(iconName, className = 'w-10 h-10') {
  const IconComponent = ICON_COMPONENTS[iconName] || Sparkles;
  return <IconComponent className={className} />;
}

// Synthesized Web Audio Sound Effects (Zero external audio file dependencies)
class WebAudioEffects {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft hover pop
  playHover() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  // Choice selected chime
  playSelect() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25]; // C5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch (e) {}
  }

  // Confirm choice adventure fanfare
  playConfirm() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }
}

const sfx = new WebAudioEffects();

export default function BranchingChoiceModal({
  isOpen,
  onClose,
  story,
  currentSlideIdx = 0,
  onChoiceSelected,
  lang = 'ar'
}) {
  const { token, openAuthModal } = useAuth();
  const isArabic = lang === 'ar';
  const isRtl = isArabic;

  const [requiresAuth, setRequiresAuth] = useState(false);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [choices, setChoices] = useState([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const timerRef = useRef(null);

  // Fetch choices when modal opens
  useEffect(() => {
    if (!isOpen || !story) return;

    if (!token) {
      setRequiresAuth(true);
      setLoadingChoices(false);
      return;
    }

    setRequiresAuth(false);
    setLoadingChoices(true);
    setSelectedChoiceId(null);
    setErrorMessage('');
    setTimeLeft(30);
    setIsGeneratingScene(false);

    const currentSlide = story.slides?.[currentSlideIdx] || null;
    const storyTitle = (typeof story.name === 'object' && story.name
      ? (story.name[lang] || story.name.ar || story.name.en)
      : story.name) || story.title || '';

    fetch(`/api/stories/${story.id}/branches/generate-choices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        slideIndex: currentSlideIdx,
        storyTitle,
        currentSlide,
        slides: story.slides,
        lang
      })
    })
      .then((res) => {
        if (res.status === 401) {
          setRequiresAuth(true);
          setLoadingChoices(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.requireAuth) {
          setRequiresAuth(true);
          setLoadingChoices(false);
          return;
        }
        if (data.success && Array.isArray(data.choices) && data.choices.length >= 2) {
          setChoices(data.choices);
        } else {
          // Dynamic contextual fallback based on the specific current slide
          const currentText = (currentSlide?.text || currentSlide?.title || '').trim();
          const snippet = currentText ? currentText.slice(0, 32) : '';
          setChoices([
            {
              id: 'a',
              titleAr: snippet ? `متابعة استكشاف (${snippet}...)` : 'خوض المغامرة الجريئة',
              titleEn: 'Bold Adventure Path',
              descriptionAr: 'الانطلاق بشجاعة لمواجهة ما سيحدث بعد ذلك.',
              descriptionEn: 'Embark on a bold new path full of discoveries.',
              iconName: 'Compass'
            },
            {
              id: 'b',
              titleAr: snippet ? `التفكير بحكمة في (${snippet}...)` : 'اتباع الدليل الحكيم',
              titleEn: 'Wise Guidance Path',
              descriptionAr: 'التأني والبحث عن إشارات ذكية ومساعدة الأصدقاء.',
              descriptionEn: 'Search for clever clues and guidance.',
              iconName: 'Lightbulb'
            }
          ]);
        }
        setLoadingChoices(false);
      })
      .catch((err) => {
        console.warn('Branch choices request notice:', err);
        setLoadingChoices(false);
      });
  }, [isOpen, story, currentSlideIdx, lang, token]);

  // Decision Timer Countdown
  useEffect(() => {
    if (!isOpen || loadingChoices || isGeneratingScene) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, loadingChoices, isGeneratingScene]);

  if (!isOpen) return null;

  const handleCardClick = (choiceId) => {
    if (isGeneratingScene) return;
    setSelectedChoiceId(choiceId);
    if (isSoundEnabled) {
      sfx.playSelect();
    }
  };

  const handleCardHover = () => {
    if (isSoundEnabled && !isGeneratingScene) {
      sfx.playHover();
    }
  };

  const handleConfirmChoice = async () => {
    if (!selectedChoiceId || isGeneratingScene) return;

    const chosenChoice = choices.find((c) => c.id === selectedChoiceId) || choices[0];

    if (isSoundEnabled) {
      sfx.playConfirm();
    }

    setIsGeneratingScene(true);
    setErrorMessage('');

    try {
      const storyTitle = (typeof story.name === 'object' && story.name
        ? (story.name[lang] || story.name.ar || story.name.en)
        : story.name) || story.title || '';

      const res = await fetch(`/api/stories/${story.id}/branches/select-choice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          choice: chosenChoice,
          choiceId: chosenChoice.id,
          slideIndex: currentSlideIdx,
          storyTitle,
          slides: story.slides,
          folderName: story.folderName,
          lang
        })
      });

      const data = await res.json();

      if (data.success && data.newSlide) {
        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6']
          });
        } catch (e) {}

        // Notify parent reader
        if (onChoiceSelected) {
          onChoiceSelected(data.newSlide, chosenChoice);
        }

        setTimeout(() => {
          setIsGeneratingScene(false);
          onClose();
        }, 600);
      } else {
        throw new Error(data.message || 'Failed to append branch scene');
      }
    } catch (err) {
      console.error('[Branch Modal Error]:', err);
      setErrorMessage(isArabic ? 'حدث خطأ أثناء نسج المشهد الجديد، يرجى المحاولة ثانية.' : 'Failed to generate branch scene. Please try again.');
      setIsGeneratingScene(false);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/30 text-white shadow-2xl p-6 sm:p-8 flex flex-col justify-between font-story">
        
        {/* Top Header: Title, Sound Toggle & Close Button */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isArabic ? 'اختر مسارك' : 'Choose Your Path'}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {isArabic ? 'مغامرة تفاعلية' : 'Interactive Adventure'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                {isArabic ? 'ماذا سيفعل البطل الآن؟' : 'What does the hero do next?'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Mute/Unmute Toggle */}
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
              title={isSoundEnabled ? (isArabic ? 'كتم المؤثرات الصوتية' : 'Mute Sound') : (isArabic ? 'تفعيل المؤثرات الصوتية' : 'Enable Sound')}
            >
              {isSoundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Close Button */}
            {!isGeneratingScene && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors"
                title={isArabic ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Gamified Decision Timer Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 mb-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300">
            <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
            <span>
              {isArabic ? 'مؤقت اتخاذ القرار:' : 'Decision Time:'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-44 h-2.5 rounded-full bg-slate-700/80 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 10 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                }`}
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
            <span className={`text-xs sm:text-sm font-black min-w-[2.5rem] text-center ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Main Content: Requires Auth vs Loading State vs 2 Cards */}
        {requiresAuth ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg text-amber-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl sm:text-2xl font-black text-amber-300">
                {isArabic ? 'سجّل دخولك لمتابعة المغامرة التفاعلية!' : 'Sign In to Unlock Interactive Branching!'}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isArabic
                  ? 'ميزة "اختر مسارك" تستخدم الذكاء الاصطناعي لنسج مسارات جديدة وأصوات وصور فريدة لكل قارئ. يرجى تسجيل الدخول مجاناً للبدء.'
                  : 'The "Choose Your Path" feature uses generative AI to weave custom scenes, voices, and artwork. Please log in for free to start.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  onClose();
                  if (openAuthModal) openAuthModal('login');
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm shadow-xl shadow-amber-500/20 transition-all transform hover:scale-105"
              >
                {isArabic ? 'تسجيل الدخول / إنشاء حساب مجاني' : 'Log In / Create Free Account'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
              >
                {isArabic ? 'متابعة القراءة العادية' : 'Continue Standard Reading'}
              </button>
            </div>
          </div>
        ) : loadingChoices ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <Sparkles className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-200">
                {isArabic ? 'جاري استشراف مسارات المغامرة بالذكاء الاصطناعي...' : 'Consulting the Story AI for Narrative Paths...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {isArabic ? 'نبتكر خيارين مشوقين ومتناقضين ليختار بطلك مساره!' : 'Formulating 2 contrasting exciting paths for your hero!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 2 Large Illustrated Choice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Card A: Bold / Exploratory Path */}
              {choices[0] && (
                <div
                  onClick={() => handleCardClick(choices[0].id)}
                  onMouseEnter={handleCardHover}
                  className={`group relative p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-300 border-2 select-none flex flex-col justify-between ${
                    selectedChoiceId === choices[0].id
                      ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-orange-950/60 border-amber-400 shadow-2xl shadow-amber-500/20 scale-[1.02] ring-4 ring-amber-400/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/80 hover:border-amber-400/60 hover:-translate-y-1 hover:shadow-xl'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isArabic ? 'الخيار (أ) • مسار الشجاعة' : 'Option A • Path of Courage'}</span>
                    </span>

                    {/* Selected Check Ring */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      selectedChoiceId === choices[0].id
                        ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md shadow-amber-500/40'
                        : 'border-slate-600 bg-slate-800/50 text-transparent'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 fill-current" />
                    </div>
                  </div>

                  {/* Icon & Title */}
                  <div className="space-y-4 my-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      {renderChoiceIcon(choices[0].iconName, 'w-8 h-8')}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                        {isArabic ? choices[0].titleAr : choices[0].titleEn}
                      </h3>
                      <p className="text-xs text-amber-200/60 font-medium">
                        {isArabic ? choices[0].titleEn : choices[0].titleAr}
                      </p>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {isArabic ? choices[0].descriptionAr : choices[0].descriptionEn}
                    </p>
                  </div>

                  {/* Bottom Visual Tag */}
                  <div className="pt-4 mt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-amber-400/90 font-bold">
                    <span>{isArabic ? '✨ اكتشاف وأسرار جديدة' : '✨ Discovery & New Secrets'}</span>
                    <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      {isArabic ? '←' : '→'}
                    </span>
                  </div>
                </div>
              )}

              {/* Card B: Clever / Magical / Wise Path */}
              {choices[1] && (
                <div
                  onClick={() => handleCardClick(choices[1].id)}
                  onMouseEnter={handleCardHover}
                  className={`group relative p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-300 border-2 select-none flex flex-col justify-between ${
                    selectedChoiceId === choices[1].id
                      ? 'bg-gradient-to-br from-cyan-950/60 via-slate-900 to-indigo-950/60 border-cyan-400 shadow-2xl shadow-cyan-500/20 scale-[1.02] ring-4 ring-cyan-400/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/80 hover:border-cyan-400/60 hover:-translate-y-1 hover:shadow-xl'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isArabic ? 'الخيار (ب) • مسار الحكمة' : 'Option B • Path of Wisdom'}</span>
                    </span>

                    {/* Selected Check Ring */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      selectedChoiceId === choices[1].id
                        ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-md shadow-cyan-500/40'
                        : 'border-slate-600 bg-slate-800/50 text-transparent'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 fill-current" />
                    </div>
                  </div>

                  {/* Icon & Title */}
                  <div className="space-y-4 my-2">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                      {renderChoiceIcon(choices[1].iconName, 'w-8 h-8')}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                        {isArabic ? choices[1].titleAr : choices[1].titleEn}
                      </h3>
                      <p className="text-xs text-cyan-200/60 font-medium">
                        {isArabic ? choices[1].titleEn : choices[1].titleAr}
                      </p>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {isArabic ? choices[1].descriptionAr : choices[1].descriptionEn}
                    </p>
                  </div>

                  {/* Bottom Visual Tag */}
                  <div className="pt-4 mt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400/90 font-bold">
                    <span>{isArabic ? '🔮 حل الألغاز وحكمة هادئة' : '🔮 Puzzle Solving & Wisdom'}</span>
                    <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      {isArabic ? '←' : '→'}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Error Message Notice if any */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-bold text-center">
                {errorMessage}
              </div>
            )}

            {/* Bottom Action Footer: Confirm Choice Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-medium text-center sm:text-start">
                {selectedChoiceId
                  ? (isArabic ? '✨ تم اختيار المسار! اضغط الزر بالأسفل لنسج المشهد الجديد.' : '✨ Path selected! Click below to weave the new scene.')
                  : (isArabic ? '👈 انقر على إحدى البطاقتين لتحديد مصير البطل في القصة.' : '👈 Click on either card above to decide the hero\'s fate.')}
              </div>

              <button
                disabled={!selectedChoiceId || isGeneratingScene}
                onClick={handleConfirmChoice}
                className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                  selectedChoiceId && !isGeneratingScene
                    ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-amber-500/30 hover:scale-105 active:scale-95 animate-pulse cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isGeneratingScene ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-200" />
                    <span>{isArabic ? 'جاري نسج المشهد الجديد...' : 'Weaving New Scene...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>{isArabic ? 'اختر مسارك وتأكيد المغامرة' : 'Choose Your Path & Confirm'}</span>
                    {isArabic ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  BookOpen, 
  Award, 
  HelpCircle, 
  Lightbulb, 
  FileText, 
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function StoryQuizModal({ isOpen, onClose, story, onRetakeSuccess }) {
  const { lang, dir, t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionIdx]: selectedOptionIdx }
  const [isAnswered, setIsAnswered] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Fetch 10 randomized quiz questions
  const loadQuiz = useCallback(() => {
    if (!story?.id) return;
    setLoading(true);
    setLoadError(null);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsAnswered(false);
    setIsQuizComplete(false);
    setFinalScore(0);
    setShowReview(false);

    fetch(`/api/stories/${story.id}/quiz`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load quiz');
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        } else {
          throw new Error('No questions received');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Quiz loading failed:', err);
        setLoadError(err.message);
        setLoading(false);
      });
  }, [story?.id]);

  useEffect(() => {
    if (isOpen) {
      loadQuiz();
    }
  }, [isOpen, loadQuiz]);

  const currentQ = questions[currentIndex];
  const totalCount = questions.length || 10;
  const progressPercent = Math.round(((currentIndex + (isAnswered ? 1 : 0)) / totalCount) * 100);

  // Trigger celebration confetti
  const triggerCelebration = useCallback(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      shapes: ['star', 'circle'],
      colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6']
    });
  }, []);

  // Handle Option Selection
  const handleSelectOption = (optionIndex) => {
    if (isAnswered) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
    setIsAnswered(true);

    // If answer is correct, soft celebratory micro-confetti
    if (optionIndex === currentQ.correctIndex) {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#10B981', '#34D399', '#6EE7B7']
      });
    }
  };

  // Move to Next Question or Finalize
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
    } else {
      // Completed all questions
      let score = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) {
          score += 1;
        }
      });
      setFinalScore(score);
      setIsQuizComplete(true);
      triggerCelebration();

      // Submit score to backend
      fetch(`/api/stories/${story.id}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          score,
          totalQuestions: questions.length,
          answers: selectedAnswers
        })
      }).catch(console.error);

      if (onRetakeSuccess) {
        onRetakeSuccess(score);
      }
    }
  };

  // Keyboard navigation support: 1-4, A-D, Enter
  useEffect(() => {
    if (!isOpen || loading || isQuizComplete || !currentQ) return;

    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      if (!isAnswered) {
        if (key === '1' || key === 'A' || key === 'أ') handleSelectOption(0);
        else if (key === '2' || key === 'B' || key === 'ب') handleSelectOption(1);
        else if (key === '3' || key === 'C' || key === 'ج') handleSelectOption(2);
        else if (key === '4' || key === 'D' || key === 'د') handleSelectOption(3);
      } else {
        if (key === 'ENTER' || key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, isQuizComplete, isAnswered, currentQ, handleNext]);

  if (!isOpen) return null;

  // Category Pill metadata
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'grammar':
        return {
          label: t('quizPillGrammar'),
          color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: <FileText className="w-3.5 h-3.5" />
        };
      case 'moral':
        return {
          label: t('quizPillMoral'),
          color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: <Lightbulb className="w-3.5 h-3.5" />
        };
      case 'vocabulary':
        return {
          label: t('quizPillVocab'),
          color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: <Bookmark className="w-3.5 h-3.5" />
        };
      case 'story':
      default:
        return {
          label: t('quizPillStory'),
          color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <BookOpen className="w-3.5 h-3.5" />
        };
    }
  };

  // Performance tier metadata
  const getTierMeta = (score) => {
    if (score === 10) {
      return {
        title: t('quizTierLegendary'),
        color: 'from-amber-400 to-amber-600',
        badge: '🏆',
        stars: 5
      };
    }
    if (score >= 8) {
      return {
        title: t('quizTierMaster'),
        color: 'from-emerald-400 to-teal-600',
        badge: '🌟',
        stars: 5
      };
    }
    if (score >= 6) {
      return {
        title: t('quizTierGood'),
        color: 'from-blue-400 to-indigo-600',
        badge: '👏',
        stars: 4
      };
    }
    return {
      title: t('quizTierKeepTrying'),
      color: 'from-purple-400 to-rose-500',
      badge: '🌱',
      stars: 3
    };
  };

  // Category breakdown calculation
  const getCategoryBreakdown = () => {
    const stats = {
      story: { total: 0, correct: 0, label: t('quizPillStory') },
      grammar: { total: 0, correct: 0, label: t('quizPillGrammar') },
      moral: { total: 0, correct: 0, label: t('quizPillMoral') },
      vocabulary: { total: 0, correct: 0, label: t('quizPillVocab') }
    };

    questions.forEach((q, idx) => {
      const cat = stats[q.category] ? q.category : 'story';
      stats[cat].total += 1;
      if (selectedAnswers[idx] === q.correctIndex) {
        stats[cat].correct += 1;
      }
    });

    return Object.entries(stats).filter(([_, s]) => s.total > 0);
  };

  const handleClose = () => {
    if (!isQuizComplete && Object.keys(selectedAnswers).length > 0) {
      if (window.confirm(t('quizCloseConfirm'))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      
      {/* Typeform Modal Container */}
      <div 
        dir={dir}
        className="w-full max-w-3xl min-h-[580px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden relative"
      >
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-6 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          
          {/* Story Badge & Question Tracker */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
              {t('quizModalTitle')}
            </span>

            {!loading && !isQuizComplete && (
              <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                {t('quizQuestionProgress').replace('{x}', currentIndex + 1).replace('{y}', totalCount)}
              </span>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar (Visible during questions) */}
        {!loading && !isQuizComplete && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center max-w-sm animate-pulse">
              {t('quizLoadingText')}
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <p className="text-sm font-bold text-rose-500 text-center">{loadError}</p>
            <button
              onClick={loadQuiz}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('retakeQuizBtn')}</span>
            </button>
          </div>
        )}

        {/* Active Typeform Question View */}
        {!loading && !loadError && !isQuizComplete && currentQ && (
          <div className="flex-1 p-5 sm:p-8 flex flex-col justify-between space-y-6">
            
            {/* Question Header & Category Pill */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {(() => {
                  const meta = getCategoryMeta(currentQ.category);
                  return (
                    <div className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${meta.color}`}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </div>
                  );
                })()}

                <span className="text-xs font-mono font-bold text-slate-400">
                  {String(currentIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
                </span>
              </div>

              {/* Main Question Text */}
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed font-story">
                {currentQ.question}
              </h3>
            </div>

            {/* 4 Multiple Choice Options (Typeform Cards) */}
            <div className="grid grid-cols-1 gap-3 sm:gap-3.5 my-2">
              {currentQ.options.map((optionText, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const isCorrect = optIdx === currentQ.correctIndex;
                const letterTag = ['A', 'B', 'C', 'D'][optIdx];

                let optionStyles = 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-slate-800 dark:text-slate-200';

                if (isAnswered) {
                  if (isCorrect) {
                    optionStyles = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-md';
                  } else if (isSelected && !isCorrect) {
                    optionStyles = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                  } else {
                    optionStyles = 'opacity-40 border-slate-200 dark:border-slate-800';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 text-start font-story group ${optionStyles}`}
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      {/* Key badge e.g. A, B, C, D */}
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                        isAnswered && isCorrect
                          ? 'bg-emerald-500 text-white'
                          : isAnswered && isSelected && !isCorrect
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-amber-500 group-hover:text-white'
                      }`}>
                        {letterTag}
                      </span>
                      <span className="text-sm sm:text-base leading-snug">{optionText}</span>
                    </div>

                    {/* Result Icon on Answer */}
                    {isAnswered && (
                      <div className="shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-scale-in" />
                        ) : isSelected ? (
                          <XCircle className="w-6 h-6 text-rose-500 animate-scale-in" />
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Card & Next Action */}
            <div className="pt-2">
              {isAnswered ? (
                <div className="space-y-4 animate-fade-in">
                  {currentQ.explanation && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-start gap-2.5">
                      <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-black text-amber-700 dark:text-amber-400 mb-0.5">
                          {t('quizExplanationTitle')}
                        </span>
                        <span>{currentQ.explanation}</span>
                      </div>
                    </div>
                  )}

                  {/* Next / Finish Button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>
                        {currentIndex === questions.length - 1 ? t('quizFinishBtn') : t('quizNextBtn')}
                      </span>
                      {dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold pt-2">
                  <span>{t('quizKeyboardHint')}</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Final Results & Score Screen */}
        {!loading && !loadError && isQuizComplete && (
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            
            <div className="space-y-6">
              
              {/* Score Header */}
              {(() => {
                const tier = getTierMeta(finalScore);
                return (
                  <div className="text-center space-y-3">
                    <div className="text-5xl">{tier.badge}</div>
                    
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-story">
                        {tier.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">
                        {t('quizScoreTitle')}
                      </p>
                    </div>

                    {/* Giant Score Badge out of 10 */}
                    <div className="inline-flex items-baseline gap-2 px-6 py-3 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                      <span className="text-4xl sm:text-5xl font-black text-amber-500 font-mono">
                        {finalScore}
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-slate-400">
                        / {totalCount}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        ({Math.round((finalScore / totalCount) * 100)}%)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Category Breakdown Badges */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  {t('quizCategoryBreakdown')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {getCategoryBreakdown().map(([key, stat]) => (
                    <div key={key} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <span className="text-xs font-bold text-slate-500 block truncate">
                        {stat.label}
                      </span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">
                        {stat.correct} / {stat.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Accordion Toggle */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>{t('quizReviewTitle')}</span>
                  </span>
                  {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showReview && (
                  <div className="p-4 space-y-4 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {questions.map((q, idx) => {
                      const userChoice = selectedAnswers[idx];
                      const isCorrect = userChoice === q.correctIndex;

                      return (
                        <div key={idx} className="pt-3 first:pt-0 space-y-1.5 text-xs sm:text-sm">
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {idx + 1}. {q.question}
                            </span>
                          </div>

                          <div className="ms-6 space-y-0.5 text-xs">
                            <p className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              <span className="font-bold">{t('quizReviewYourAnswer')} </span>
                              {userChoice !== undefined ? q.options[userChoice] : '-'}
                            </p>
                            {!isCorrect && (
                              <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                                <span>{t('quizReviewCorrectAnswer')} </span>
                                {q.options[q.correctIndex]}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Final Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={loadQuiz}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('retakeQuizBtn')}</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t('quizBackToStory')}</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Mic,
  Square,
  Sparkles,
  Star,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Headphones,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Flame,
  AudioWaveform as WaveformIcon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  AudioRecorder,
  evaluateReading,
  speakReferenceText,
  stopReferenceText,
  isAudioRecordingSupported
} from '../utils/readingCoachService';

export default function ReadingCoachModal({
  isOpen,
  onClose,
  slideText = '',
  slideTitle = '',
  slideVoiceUrl = '',
  storyTitle = ''
}) {
  const { lang, dir, t } = useLanguage();
  const { token } = useAuth();

  // Recording & Evaluation States
  const [recorderState, setRecorderState] = useState('idle'); // 'idle' | 'recording' | 'evaluating' | 'evaluated'
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [selectedWordInfo, setSelectedWordInfo] = useState(null);

  const recorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedAudioRef = useRef(null);
  const referenceAudioRef = useRef(null);

  // Clean text and split words
  const rawWords = (slideText || '').trim().split(/\s+/).filter((w) => w.length > 0);

  // Reset state when modal opens or slide changes
  const resetAll = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      recordedAudioRef.current = null;
    }
    if (referenceAudioRef.current) {
      referenceAudioRef.current.pause();
      referenceAudioRef.current = null;
    }
    stopReferenceText();

    setRecorderState('idle');
    setRecordSeconds(0);
    setAudioLevel(0);
    setEvaluation(null);
    setErrorMessage(null);
    setRecordedAudioUrl(null);
    setIsPlayingRecorded(false);
    setIsPlayingReference(false);
    setSelectedWordInfo(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetAll();
    } else {
      resetAll();
    }
    return () => resetAll();
  }, [isOpen, slideText, resetAll]);

  // Handle Confetti Celebration on completion
  const triggerCelebration = useCallback((score) => {
    const starCount = score >= 85 ? 3 : score >= 65 ? 2 : 1;
    confetti({
      particleCount: starCount === 3 ? 120 : starCount === 2 ? 70 : 40,
      spread: 80,
      origin: { y: 0.5 },
      shapes: ['star', 'circle'],
      colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6']
    });
  }, []);

  // Start Voice Recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    if (!isAudioRecordingSupported()) {
      setErrorMessage(t('readingCoachMicPermissionError') || 'Microphone is not supported in this browser.');
      return;
    }

    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      setRecorderState('recording');
      setRecordSeconds(0);

      await recorder.start({
        onAudioLevel: (lvl) => setAudioLevel(lvl)
      });

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 60) {
            // Auto stop at 60 seconds
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setRecorderState('idle');
      setErrorMessage(t('readingCoachMicPermissionError') || 'Please allow microphone access.');
    }
  };

  // Stop Recording & Send for Evaluation
  const handleStopRecording = async () => {
    if (!recorderRef.current || recorderState !== 'recording') return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setRecorderState('evaluating');
    setAudioLevel(0);

    try {
      const { blob, base64, dataUrl, mimeType } = await recorderRef.current.stop();
      recorderRef.current = null;
      setRecordedAudioUrl(dataUrl);

      // Call reading evaluation service
      const result = await evaluateReading({
        audioBase64: base64,
        mimeType,
        expectedText: slideText,
        lang,
        token
      });

      setEvaluation(result);
      setRecorderState('evaluated');
      triggerCelebration(result.fluencyScore || 85);
    } catch (err) {
      console.error('Evaluation failed:', err);
      setErrorMessage(err.message || 'Error evaluating audio.');
      setRecorderState('idle');
    }
  };

  // Listen to Reference Audio (story voice file or Web Speech API)
  const togglePlayReference = () => {
    if (isPlayingReference) {
      if (referenceAudioRef.current) {
        referenceAudioRef.current.pause();
        referenceAudioRef.current.currentTime = 0;
      }
      stopReferenceText();
      setIsPlayingReference(false);
      return;
    }

    // Stop recorded playback if active
    if (isPlayingRecorded && recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      setIsPlayingRecorded(false);
    }

    if (slideVoiceUrl) {
      const audio = new Audio(slideVoiceUrl);
      referenceAudioRef.current = audio;
      setIsPlayingReference(true);
      audio.onended = () => setIsPlayingReference(false);
      audio.onerror = () => {
        // Fallback to speech synthesis if audio file fails
        speakReferenceText(slideText, lang).then(() => setIsPlayingReference(false));
      };
      audio.play().catch(() => {
        speakReferenceText(slideText, lang).then(() => setIsPlayingReference(false));
      });
    } else {
      setIsPlayingReference(true);
      speakReferenceText(slideText, lang).then(() => {
        setIsPlayingReference(false);
      });
    }
  };

  // Listen to Child's Recorded Voice
  const togglePlayRecorded = () => {
    if (!recordedAudioUrl) return;

    if (isPlayingRecorded) {
      if (recordedAudioRef.current) {
        recordedAudioRef.current.pause();
        recordedAudioRef.current.currentTime = 0;
      }
      setIsPlayingRecorded(false);
      return;
    }

    // Stop reference playback if active
    if (isPlayingReference) {
      if (referenceAudioRef.current) referenceAudioRef.current.pause();
      stopReferenceText();
      setIsPlayingReference(false);
    }

    const audio = new Audio(recordedAudioUrl);
    recordedAudioRef.current = audio;
    setIsPlayingRecorded(true);
    audio.onended = () => setIsPlayingRecorded(false);
    audio.play().catch(() => setIsPlayingRecorded(false));
  };

  // Speak single word on click
  const handleSpeakSingleWord = (word) => {
    const clean = word.replace(/[.,!?;:«»"'`()[\]{}<>\-_—*~]/gu, '');
    speakReferenceText(clean, lang);
  };

  if (!isOpen) return null;

  // Compute stars
  const score = evaluation?.fluencyScore || 0;
  const starsCount = score >= 85 ? 3 : score >= 65 ? 2 : 1;

  // Format timer MM:SS
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in"
      dir={dir}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto font-story transition-all">
        {/* Colorful top accent gradient bar */}
        <div className="h-2.5 w-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/25">
                <Mic className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {t('readingCoachTitle') || 'مرشد القراءة ومعلم النطق الذكي 🎙️'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('readingCoachSub') || 'اقرأ بصوتك الجميل وسيقوم المرشد الذكي بمساعدتك على تحسين النطق وتقديم النجوم!'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Error Notice */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Slide Title Badge */}
          {slideTitle && (
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {slideTitle}
              </span>
              <span className="text-xs text-slate-400">
                {rawWords.length} {lang === 'ar' ? 'كلمات' : 'words'}
              </span>
            </div>
          )}

          {/* Reading Slide Passage Box */}
          <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border-2 border-slate-200/70 dark:border-slate-700/60 shadow-inner">
            {/* Pronunciation Reference audio button in top corner */}
            <div className={`absolute top-3 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}>
              <button
                onClick={togglePlayReference}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isPlayingReference
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-600/50 hover:bg-amber-50 dark:hover:bg-slate-700'
                }`}
                title="Listen to reference pronunciation"
              >
                {isPlayingReference ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isPlayingReference ? (lang === 'ar' ? 'إيقاف' : 'Stop') : (t('readingCoachListenOriginal') || 'استمع للنطق 🎧')}</span>
              </button>
            </div>

            {/* Slide Text Content */}
            <div className="pt-4 text-center leading-loose">
              {/* Evaluated Interactive Highlighting */}
              {recorderState === 'evaluated' && evaluation?.words ? (
                <div className="flex flex-wrap items-center justify-center gap-2 text-lg sm:text-2xl font-bold">
                  {evaluation.words.map((item, idx) => {
                    const isSelected = selectedWordInfo?.word === item.word;
                    let style = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    let indicator = null;

                    if (item.status === 'correct') {
                      style = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-400/60 shadow-sm';
                    } else if (item.status === 'mispronounced') {
                      style = 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-500 shadow-md ring-2 ring-amber-400/20';
                    } else if (item.status === 'skipped') {
                      style = 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-dashed border-slate-400 dark:border-slate-600 line-through opacity-70';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedWordInfo(item);
                          handleSpeakSingleWord(item.word);
                        }}
                        className={`group relative px-2.5 py-1 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${style} ${
                          isSelected ? 'ring-4 ring-indigo-500/40 scale-105' : ''
                        }`}
                        title={item.feedback || item.status}
                      >
                        <span>{item.word}</span>
                        {item.status === 'mispronounced' && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-black shadow">
                            !
                          </span>
                        )}
                        {item.status === 'correct' && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Plain Text during Idle or Recording */
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed tracking-wide">
                  {slideText}
                </p>
              )}
            </div>

            {/* Word Status Legend (Evaluated View) */}
            {recorderState === 'evaluated' && (
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  {t('readingCoachLegendCorrect') || 'نطق صحيح ومتقن'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  {t('readingCoachLegendMispronounced') || 'يحتاج تدريب'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                  {t('readingCoachLegendSkipped') || 'تم تخطيه'}
                </span>
              </div>
            )}
          </div>

          {/* Detailed Selected Word Tooltip/Card */}
          {selectedWordInfo && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-scale-in">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-amber-800 dark:text-amber-300 px-3 py-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800">
                  {selectedWordInfo.word}
                </span>
                <div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {t('readingCoachWordTip') || 'نصيحة النطق:'}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {selectedWordInfo.feedback ||
                      (selectedWordInfo.status === 'correct'
                        ? (lang === 'ar' ? 'نطق ممتاز ومتقن! أحسنت' : 'Pronounced clearly and accurately!')
                        : (lang === 'ar' ? 'تأنَّ في نطق الحروف بهدوء' : 'Speak clearly and take your time'))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSpeakSingleWord(selectedWordInfo.word)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition-all hover:scale-105"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'استمع للكلمة' : 'Listen Word'}</span>
              </button>
            </div>
          )}

          {/* Celebratory 3-Stars & Fluency Score Board */}
          {recorderState === 'evaluated' && evaluation && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-indigo-500/10 to-rose-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 text-center space-y-4 animate-scale-in">
              {/* 3 Stars Container */}
              <div className="flex items-center justify-center gap-3 py-1">
                {[1, 2, 3].map((starNum) => {
                  const isEarned = starNum <= starsCount;
                  return (
                    <div
                      key={starNum}
                      className={`relative transition-all duration-500 transform ${
                        isEarned
                          ? 'scale-110 rotate-0 text-amber-400 filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)]'
                          : 'scale-90 text-slate-300 dark:text-slate-700 opacity-40'
                      }`}
                    >
                      <Star
                        className="w-12 h-12 sm:w-14 sm:h-14 fill-current transition-transform duration-300 hover:rotate-12"
                      />
                      {isEarned && (
                        <Sparkles className="w-4 h-4 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fluency Score Counter */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-black border border-amber-400/40">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>{t('readingCoachFluencyScore') || 'درجة الطلاقة والقراءة'}: {score}%</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {score >= 85
                    ? (t('readingCoachPraiseHigh') || 'ممتاز جداً! بطل القراءة الصاعد 🌟🌟🌟')
                    : score >= 65
                    ? (t('readingCoachPraiseMedium') || 'أداء رائع ومحاولة ممتازة! استمر في التمرين 🌟🌟')
                    : (t('readingCoachPraisePractice') || 'محاولة طيبة! تدرب أكثر لتنال النجوم الثلاثة 🌟')}
                </h3>
                {evaluation.overallFeedback && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto font-medium leading-relaxed">
                    "{evaluation.overallFeedback}"
                  </p>
                )}
              </div>

              {/* Action Buttons: Try Again & Listen to Child's voice */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={resetAll}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('readingCoachTryAgain') || 'إعادة المحاولة 🔄'}</span>
                </button>

                {recordedAudioUrl && (
                  <button
                    onClick={togglePlayRecorded}
                    className={`px-5 py-2.5 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                      isPlayingRecorded
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700'
                    }`}
                  >
                    {isPlayingRecorded ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{t('readingCoachListenYours') || 'استمع لتسجيلك 🔊'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recording / Idle Controls & Live Waveform */}
          {recorderState !== 'evaluated' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-3">
              {/* Live Audio Waveform / Pulsing Equalizer Bars */}
              {recorderState === 'recording' && (
                <div className="flex items-center justify-center gap-1.5 h-12 px-6 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  {[...Array(9)].map((_, i) => {
                    // Calculate responsive dynamic height using audioLevel and offset
                    const factor = Math.sin((i / 8) * Math.PI);
                    const dynamicHeight = Math.max(8, Math.min(42, (audioLevel * 0.45 * factor) + (Math.random() * 8)));
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-rose-500 transition-all duration-75"
                        style={{ height: `${dynamicHeight}px` }}
                      />
                    );
                  })}
                  <span className="mx-2 text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatTimer(recordSeconds)}
                  </span>
                </div>
              )}

              {/* Main Record / Stop Action Button */}
              {recorderState === 'idle' && (
                <button
                  onClick={handleStartRecording}
                  className="px-8 py-4 rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-base sm:text-lg shadow-xl shadow-rose-500/25 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <span>{t('readingCoachStartRecord') || 'اضغط للتسجيل وابدأ القراءة 🎙️'}</span>
                </button>
              )}

              {recorderState === 'recording' && (
                <button
                  onClick={handleStopRecording}
                  className="px-8 py-4 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base sm:text-lg shadow-xl shadow-rose-600/30 flex items-center gap-3 animate-pulse transition-all hover:scale-105 active:scale-95"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>{t('readingCoachStopRecord') || 'إنهاء التسجيل والتقييم ⏹️'}</span>
                </button>
              )}

              {recorderState === 'evaluating' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 animate-pulse text-center">
                    {t('readingCoachEvaluating') || 'جاري تحليل نطقك وقراءتك بواسطة الذكاء الاصطناعي... ✨'}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-sm">
                {recorderState === 'recording'
                  ? (t('readingCoachRecording') || 'جاري الاستماع إليك... اقرأ بطلاقة ووضوح! 🔴')
                  : (lang === 'ar' ? 'تأكد من الجلوس في مكان هادئ وتحدث بصوت واضح ومريح.' : 'Find a quiet spot and read aloud at a comfortable, natural pace.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

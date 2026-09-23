import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

/**
 * Enhanced Single 1-Button Compact Audio Player Component
 * Features:
 * 1. Play/Pause button positioned at the TOP LEFT of the written story paragraph.
 * 2. Displays ONLY the total length of the voice file (e.g. 0:18).
 * 3. Red circular progress line filling the button border (0% to 100%) as audio plays.
 * 4. Toggles between Play and Pause icons.
 * 5. Real-time spoken word karaoke bold highlighting.
 */
export default function EnhancedAudioPlayer({ audioUrl, text, lang = 'ar', onEnded }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  const audioRef = useRef(null);
  const utteranceRef = useRef(null);

  // Split text into individual words for real-time highlighting
  const words = (text || '').trim().split(/\s+/).filter(w => w.length > 0);

  useEffect(() => {
    stopAudio();
    setCurrentTime(0);
    setDuration(0);
    setActiveWordIndex(-1);

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const updateDuration = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };

      audio.onloadedmetadata = updateDuration;
      audio.ondurationchange = updateDuration;
      audio.oncanplay = updateDuration;

      // Fallback: Exact WAV Duration calculation from byte length (Gemini TTS 24kHz Mono = 48000 bytes/sec)
      fetch(audioUrl, { method: 'HEAD' })
        .then(res => {
          const contentLength = res.headers.get('content-length');
          if (contentLength && parseInt(contentLength, 10) > 44) {
            const bytes = parseInt(contentLength, 10);
            const calculatedSecs = (bytes - 44) / 48000;
            if (calculatedSecs > 0) {
              setDuration(prev => (prev > 0 ? prev : calculatedSecs));
            }
          }
        })
        .catch(() => {});

      audio.onplay = () => setIsPlaying(true);
      audio.onplaying = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);

      audio.onended = () => {
        setIsPlaying(false);
        setActiveWordIndex(-1);
        setCurrentTime(0);
        if (onEnded) onEnded();
      };
    }

    return () => {
      stopAudio();
    };
  }, [audioUrl, text]);

  // Use requestAnimationFrame for buttery smooth UI updates (bypasses mobile throttled ontimeupdate)
  useEffect(() => {
    let animationFrameId;

    const updateLoop = () => {
      if (audioRef.current && isPlaying) {
        const audio = audioRef.current;
        const cur = audio.currentTime;
        setCurrentTime(cur);

        // Safari often returns Infinity for audio.duration. Safe fallback:
        let dur = (audio.duration && isFinite(audio.duration)) ? audio.duration : duration;
        if (!dur || dur <= 0) dur = Math.max(1, words.length / 2.5); // Fallback estimate

        if (words.length > 0) {
          const ratio = Math.min(cur / dur, 0.999);
          const wordIdx = Math.floor(ratio * words.length);
          setActiveWordIndex(wordIdx);
        }
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateLoop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, duration, words.length]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          speakFallback(currentTime);
        });
      } else {
        speakFallback(currentTime);
      }
    }
  };

  const speakFallback = (startFromTime = 0) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    let startWordIdx = 0;
    if (duration > 0 && words.length > 0) {
      startWordIdx = Math.floor((startFromTime / duration) * words.length);
    }

    const remainingText = words.slice(startWordIdx).join(' ');
    if (!remainingText) return;

    const utterance = new SpeechSynthesisUtterance(remainingText);
    utteranceRef.current = utterance;
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';

    utterance.onstart = () => setIsPlaying(true);
    utterance.onpause = () => setIsPlaying(false);
    utterance.onresume = () => setIsPlaying(true);

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const remainingWords = remainingText.substring(0, charIdx).split(/\s+/).filter(w => w.length > 0);
        setActiveWordIndex(startWordIdx + remainingWords.length);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
      if (onEnded) onEnded();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
    };

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs <= 0 || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // SVG Circular Red Line Progress Parameters (Radius r = 18 -> Circumference C ≈ 113.097)
  const radius = 18;
  const circumference = 2 * Math.PI * radius; // 113.097
  const activeDuration = (duration && isFinite(duration) && duration > 0) ? duration : (audioRef.current?.duration || 0);
  const progressRatio = (activeDuration > 0) ? Math.min(Math.max(currentTime / activeDuration, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="w-full font-story relative">
      
      {/* Story Paragraph Box with Top Left Voice Playback Control */}
      <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white leading-relaxed text-lg sm:text-xl font-medium relative pt-16 sm:pt-6 sm:pl-28 min-h-[110px] shadow-sm font-story">
        
        {/* Play/Pause Button & Total Duration Badge Positioned at TOP LEFT */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-full shadow-lg border border-slate-800 backdrop-blur-md">
          
          {/* Total Length of Voice File Only (e.g. 0:18) */}
          <span className="text-xs font-mono font-bold text-amber-400 pl-1">
            {formatTime(activeDuration)}
          </span>

          {/* Single Circular Play/Pause Button with Red Progress Border Ring */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            
            {/* SVG Circular Progress Ring */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44">
              {/* Background Track Circle */}
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="3.5"
              />
              {/* Red Line Progress Fill Ring */}
              <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                stroke="#EF4444"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
                className="transition-all duration-150 ease-linear"
              />
            </svg>

            {/* Center Circular Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-amber-600 to-indigo-600 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-md transition-all z-10"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل السرد الصوتي'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current text-white" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current text-white ml-0.5" />
              )}
            </button>

          </div>

        </div>

        {/* Real-time Spoken Word Karaoke Highlighting Text */}
        <div className="flex flex-wrap items-center gap-1.5">
          {words.map((word, idx) => {
            const isSpoken = idx === activeWordIndex;
            return (
              <span
                key={idx}
                className={`transition-all duration-200 rounded-lg px-1.5 py-0.5 ${
                  isSpoken
                    ? 'font-black text-amber-600 dark:text-amber-300 bg-amber-500/30 ring-2 ring-amber-500 scale-110 shadow-md'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>

      </div>

    </div>
  );
}

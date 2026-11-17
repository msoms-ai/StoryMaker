import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  X,
  Eye,
  EyeOff,
  Feather,
  Wind,
  Footprints,
  Bell,
  TreePine,
  Droplets,
  HelpCircle,
  VolumeX,
  Check
} from 'lucide-react';

/**
 * Procedural Web Audio API sound effect generator for vocabulary hotspots.
 * Plays a pleasant, magical chime / nature sound with zero external assets or latency.
 */
function playChimeSound(soundType = 'sparkle') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (soundType === 'bird') {
      // Gentle cheerful bird chirping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      osc.frequency.exponentialRampToValueAtTime(2600, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(2100, now + 0.14);
      gain.setValueAtTime(0.18, now);
      gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (soundType === 'wind') {
      // Soft gentle air chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.setValueAtTime(0.14, now);
      gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (soundType === 'footstep') {
      // Soft marimba tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.12);
      gain.setValueAtTime(0.2, now);
      gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (soundType === 'nature' || soundType === 'water') {
      // Warm marimba drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.setValueAtTime(0.18, now);
      gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Celestial sparkle chime (C6 - E6 - G6 arpeggio)
      const freqs = [1046.5, 1318.51, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.setValueAtTime(0, now + idx * 0.05);
        gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.02);
        gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.42);
      });
    }
  } catch (err) {
    console.warn('[Hotspot Audio Chime]', err);
  }
}

/**
 * Helper to render sound type icons
 */
function renderSoundIcon(soundType) {
  switch (soundType) {
    case 'bird':
      return <Feather className="w-3.5 h-3.5" />;
    case 'wind':
      return <Wind className="w-3.5 h-3.5" />;
    case 'footstep':
      return <Footprints className="w-3.5 h-3.5" />;
    case 'bell':
      return <Bell className="w-3.5 h-3.5" />;
    case 'nature':
      return <TreePine className="w-3.5 h-3.5" />;
    case 'water':
      return <Droplets className="w-3.5 h-3.5" />;
    default:
      return <Sparkles className="w-3.5 h-3.5" />;
  }
}

/**
 * VisualHotspotOverlay Component
 *
 * Renders interactive visual vocabulary hotspot pins over a story slide image.
 * Clicking a pin plays a pleasant audio chime, reveals full Arabic & English
 * vocabulary cards with diacritics/tashkeel, and enables speech pronunciation.
 */
export default function VisualHotspotOverlay({
  storyId,
  slideIdx,
  slide,
  lang = 'ar'
}) {
  const [hotspots, setHotspots] = useState(slide?.hotspots || []);
  const [loading, setLoading] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);

  const containerRef = useRef(null);

  // Fetch or retrieve cached hotspots when slide changes
  useEffect(() => {
    setActiveHotspotId(null);

    // If slide already has hotspots in memory, use them immediately
    if (slide?.hotspots && Array.isArray(slide.hotspots) && slide.hotspots.length > 0) {
      setHotspots(slide.hotspots);
      return;
    }

    if (!storyId || slideIdx === undefined || slideIdx === null) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/stories/${storyId}/slides/${slideIdx}/hotspots`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.hotspots)) {
          setHotspots(data.hotspots);
          // Update the slide object in memory if possible
          if (slide) {
            slide.hotspots = data.hotspots;
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[VisualHotspotOverlay] Error fetching hotspots:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [storyId, slideIdx, slide]);

  // Speech pronunciation helper using Web Speech API
  const speakWord = (text, speechLang = 'ar', id = null) => {
    if (!('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang === 'ar' ? 'ar-SA' : 'en-US';
      utterance.rate = 0.85; // Slightly slower, crystal-clear child tempo
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      if (speechLang === 'ar') {
        const arVoice = voices.find(
          (v) => v.lang.startsWith('ar') || v.lang.includes('ar_') || v.lang.includes('ar-')
        );
        if (arVoice) utterance.voice = arVoice;
      } else {
        const enVoice = voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      }

      if (id) {
        setSpeakingId(`${id}_${speechLang}`);
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Hotspot Speech Error]:', err);
      setSpeakingId(null);
    }
  };

  // Hotspot Pin Click Handler
  const handlePinClick = (e, spot) => {
    e.stopPropagation();
    playChimeSound(spot.soundType);

    if (activeHotspotId === spot.id) {
      setActiveHotspotId(null);
    } else {
      setActiveHotspotId(spot.id);
      // Auto-pronounce Arabic word with correct diacritics
      speakWord(spot.nameAr || spot.nameEn, 'ar', spot.id);
    }
  };

  // Close active popover when clicking overlay background
  const handleBackgroundClick = () => {
    if (activeHotspotId) {
      setActiveHotspotId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl select-none"
    >
      {/* Top Controls: Toggle Vocabulary Hotspots Button & Counter */}
      <div className={`absolute top-3 ${lang === 'ar' ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} z-30 flex items-center gap-2 pointer-events-auto`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all duration-200 border ${
            isVisible
              ? 'bg-amber-500/90 hover:bg-amber-600 text-white border-amber-300/40 shadow-amber-500/20'
              : 'bg-slate-900/60 hover:bg-slate-900/80 text-slate-200 border-white/20'
          }`}
          title={lang === 'ar' ? 'إظهار / إخفاء المفردات البصرية التفاعلية' : 'Toggle Visual Vocabulary Hotspots'}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>
            {lang === 'ar' ? 'المفردات البصرية' : 'Vocabulary'}
            {hotspots.length > 0 && ` (${hotspots.length})`}
          </span>
          {loading && (
            <Sparkles className="w-3 h-3 text-amber-200 animate-spin ml-0.5" />
          )}
        </button>
      </div>

      {/* Render Hotspot Pins & Popovers when visible */}
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none">
          {hotspots.map((spot, idx) => {
            const box = spot.box2d || [500, 500, 600, 600];
            const [ymin, xmin, ymax, xmax] = box;

            // Compute center normalized coordinates [0..100%]
            const yCenter = (ymin !== undefined && ymax !== undefined)
              ? (ymin + ymax) / 20
              : (ymin || 500) / 10;
            const xCenter = (xmin !== undefined && xmax !== undefined)
              ? (xmin + xmax) / 20
              : (xmin || 500) / 10;

            // Clamp coordinates safely inside the slide boundary
            const clampedY = Math.max(12, Math.min(88, yCenter));
            const clampedX = Math.max(12, Math.min(88, xCenter));

            const isActive = activeHotspotId === spot.id;
            const isSpeakingAr = speakingId === `${spot.id}_ar`;
            const isSpeakingEn = speakingId === `${spot.id}_en`;

            // Smart Popover Positioning relative to the pin
            const popoverAbove = clampedY > 52;
            const popoverRightAlign = clampedX > 60;

            return (
              <div
                key={spot.id || `spot_${idx}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300"
                style={{ top: `${clampedY}%`, left: `${clampedX}%` }}
              >
                {/* Hotspot Interactive Pin */}
                <div className="relative group/pin pointer-events-auto">
                  {/* Outer Pulsing Radar Ring */}
                  <span className="absolute -inset-2 rounded-full bg-amber-400/35 animate-ping pointer-events-none" />

                  {/* Glowing Glow Backdrop */}
                  <span
                    className={`absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 blur-sm transition-opacity duration-300 ${
                      isActive ? 'opacity-100 scale-125' : 'opacity-65 group-hover/pin:opacity-95'
                    }`}
                  />

                  {/* Center Dot Button */}
                  <button
                    onClick={(e) => handlePinClick(e, spot)}
                    aria-label={spot.nameAr || spot.nameEn}
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 border-2 ${
                      isActive
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 scale-125 border-white shadow-amber-500/50'
                        : 'bg-gradient-to-tr from-amber-500 to-indigo-600 hover:scale-115 border-white/90 shadow-slate-900/40'
                    }`}
                  >
                    {renderSoundIcon(spot.soundType)}
                  </button>

                  {/* Subtle Floating Label on Pin Hover */}
                  {!isActive && (
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold shadow-lg border border-white/10 ${
                        lang === 'ar' ? 'font-arabic' : ''
                      }`}
                    >
                      {spot.nameAr || spot.nameEn}
                    </div>
                  )}
                </div>

                {/* Animated Popover Badge Card */}
                {isActive && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-40 pointer-events-auto w-64 sm:w-72 p-4 rounded-2xl glass-panel shadow-2xl border-2 border-amber-400/60 dark:border-amber-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 ${
                      popoverAbove ? 'bottom-full mb-3' : 'top-full mt-3'
                    } ${
                      popoverRightAlign ? 'right-0' : 'left-0 sm:-left-8'
                    }`}
                  >
                    {/* Popover Header: Category & Close Button */}
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-black">
                        {renderSoundIcon(spot.soundType)}
                        <span className="capitalize">{spot.soundType || 'Word'}</span>
                      </div>

                      <button
                        onClick={() => setActiveHotspotId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={lang === 'ar' ? 'إغلاق' : 'Close'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Arabic Vocabulary Word with Full Vocalization / Diacritics */}
                    <div className="text-center py-1">
                      <h4
                        className="text-2xl font-black text-amber-600 dark:text-amber-400 font-arabic leading-snug tracking-wide select-text"
                        dir="rtl"
                      >
                        {spot.nameAr}
                      </h4>

                      {/* English Meaning */}
                      {spot.nameEn && (
                        <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-0.5 select-text">
                          {spot.nameEn}
                        </p>
                      )}

                      {/* Friendly Child Explanation Sentence */}
                      {spot.description && (
                        <p
                          className={`text-xs text-slate-500 dark:text-slate-400 mt-2 px-1 leading-relaxed ${
                            lang === 'ar' ? 'font-arabic text-right' : 'text-left'
                          }`}
                        >
                          {spot.description}
                        </p>
                      )}
                    </div>

                    {/* Audio Pronunciation Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center gap-2">
                      {/* Arabic Pronounce Button */}
                      <button
                        onClick={() => speakWord(spot.nameAr, 'ar', spot.id)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 ${
                          isSpeakingAr
                            ? 'bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:scale-102 active:scale-98'
                        } font-arabic`}
                        title={lang === 'ar' ? 'استمع للنطق الصحيح بالعربية' : 'Pronounce in Arabic'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'نطق الكلمة' : 'Pronounce'}</span>
                      </button>

                      {/* English Pronounce Button */}
                      {spot.nameEn && (
                        <button
                          onClick={() => speakWord(spot.nameEn, 'en', spot.id)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all duration-200 border ${
                            isSpeakingEn
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 animate-pulse border-indigo-600'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Listen in English"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>EN</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

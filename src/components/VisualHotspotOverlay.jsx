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

  // Handle ESC key to dismiss active hotspot card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeHotspotId) {
        setActiveHotspotId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHotspotId]);

  // Compute normalized coordinates for a spot [0..100%]
  const getSpotCoords = (spot) => {
    if (!spot) return { clampedX: 50, clampedY: 50 };
    const box = spot.box2d || [500, 500, 600, 600];
    const [ymin, xmin, ymax, xmax] = box;
    const yCenter = (ymin !== undefined && ymax !== undefined)
      ? (ymin + ymax) / 20
      : (ymin || 500) / 10;
    const xCenter = (xmin !== undefined && xmax !== undefined)
      ? (xmin + xmax) / 20
      : (xmin || 500) / 10;
    return {
      clampedY: Math.max(12, Math.min(88, yCenter)),
      clampedX: Math.max(12, Math.min(88, xCenter))
    };
  };

  // Active hotspot object and coordinates
  const activeSpot = hotspots.find((s) => s.id === activeHotspotId) || null;
  const activeCoords = activeSpot ? getSpotCoords(activeSpot) : null;
  // If pin is on the right half, position card on the left; otherwise on the right
  const cardOnLeft = activeCoords ? activeCoords.clampedX >= 50 : (lang === 'ar');
  // If pin is near bottom (> 60%), position card near top; otherwise near bottom
  const cardOnTop = activeCoords ? activeCoords.clampedY > 60 : false;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-2xl select-none"
    >
      {/* Top Controls: Toggle Vocabulary Hotspots Button & Counter */}
      <div className={`absolute top-3 ${lang === 'ar' ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} z-40 flex items-center gap-2 pointer-events-auto`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(!isVisible);
            if (isVisible) setActiveHotspotId(null);
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

      {/* Render Hotspot Pins & Active Popover when visible */}
      {isVisible && (
        <>
          {/* LAYER 1: Interactive Hotspot Pins (z-20) */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {hotspots.map((spot, idx) => {
              const { clampedX, clampedY } = getSpotCoords(spot);
              const isActive = activeHotspotId === spot.id;
              const hasActiveOther = Boolean(activeHotspotId && !isActive);

              return (
                <div
                  key={spot.id || `spot_${idx}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isActive
                      ? 'scale-125 z-30'
                      : hasActiveOther
                      ? 'opacity-40 hover:opacity-100 z-10'
                      : 'opacity-100 hover:scale-110 z-10'
                  }`}
                  style={{ top: `${clampedY}%`, left: `${clampedX}%` }}
                >
                  {/* Hotspot Interactive Pin */}
                  <div className="relative group/pin pointer-events-auto">
                    {/* Outer Pulsing Radar Ring - only pulse if active or if no spot is open */}
                    {(!hasActiveOther || isActive) && (
                      <span className={`absolute -inset-2 rounded-full pointer-events-none ${
                        isActive
                          ? 'bg-amber-400/50 animate-ping ring-2 ring-white/60'
                          : 'bg-amber-400/35 animate-ping'
                      }`} />
                    )}

                    {/* Glowing Backdrop */}
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
                          ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 scale-110 border-white ring-4 ring-amber-400/50 shadow-amber-500/60'
                          : 'bg-gradient-to-tr from-amber-500 to-indigo-600 hover:scale-115 border-white/90 shadow-slate-900/40'
                      }`}
                    >
                      {renderSoundIcon(spot.soundType)}
                    </button>

                    {/* Subtle Floating Label on Pin Hover (when no card is open) */}
                    {!activeHotspotId && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold shadow-lg border border-white/10 ${
                          lang === 'ar' ? 'font-arabic' : ''
                        }`}
                      >
                        {spot.nameAr || spot.nameEn}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LAYER 2: Backdrop Click-Away Dismissal (z-40) */}
          {activeSpot && (
            <div
              onClick={handleBackgroundClick}
              className="absolute inset-0 pointer-events-auto z-40 bg-slate-950/20 backdrop-blur-[1px] transition-opacity duration-200"
              title={lang === 'ar' ? 'انقر في أي مكان للإغلاق' : 'Click anywhere to close'}
            />
          )}

          {/* LAYER 3: Dedicated Active Vocabulary Card (z-50) */}
          {/* Rendered strictly above all pins and backdrops so it is NEVER covered */}
          {activeSpot && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute z-50 pointer-events-auto w-72 sm:w-80 max-w-[calc(100%-24px)] max-h-[calc(100%-48px)] p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-400 dark:border-amber-500/80 bg-white dark:bg-slate-900 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${
                cardOnTop ? 'top-12 sm:top-14' : 'bottom-3 sm:bottom-4'
              } ${
                cardOnLeft ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
              }`}
            >
              {/* Popover Header: Category Badge & Close Button */}
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-black">
                  {renderSoundIcon(activeSpot.soundType)}
                  <span className="capitalize">{activeSpot.soundType || 'Word'}</span>
                </div>

                <button
                  onClick={() => setActiveHotspotId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={lang === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Arabic Vocabulary Word with Full Tashkeel / Diacritics */}
              <div className="text-center py-1">
                <h4
                  className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-arabic leading-snug tracking-wide select-text"
                  dir="rtl"
                >
                  {activeSpot.nameAr}
                </h4>

                {/* English Meaning */}
                {activeSpot.nameEn && (
                  <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-0.5 select-text">
                    {activeSpot.nameEn}
                  </p>
                )}

                {/* Friendly Child Explanation Sentence */}
                {activeSpot.description && (
                  <p
                    className={`text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 px-1 leading-relaxed line-clamp-3 ${
                      lang === 'ar' ? 'font-arabic text-right' : 'text-left'
                    }`}
                  >
                    {activeSpot.description}
                  </p>
                )}
              </div>

              {/* Audio Pronunciation Action Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center gap-2">
                {/* Arabic Pronounce Button */}
                <button
                  onClick={() => speakWord(activeSpot.nameAr, 'ar', activeSpot.id)}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 ${
                    speakingId === `${activeSpot.id}_ar`
                      ? 'bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:scale-102 active:scale-98'
                  } font-arabic`}
                  title={lang === 'ar' ? 'استمع للنطق الصحيح بالعربية' : 'Pronounce in Arabic'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'نطق الكلمة' : 'Pronounce'}</span>
                </button>

                {/* English Pronounce Button */}
                {activeSpot.nameEn && (
                  <button
                    onClick={() => speakWord(activeSpot.nameEn, 'en', activeSpot.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all duration-200 border ${
                      speakingId === `${activeSpot.id}_en`
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
        </>
      )}
    </div>
  );
}

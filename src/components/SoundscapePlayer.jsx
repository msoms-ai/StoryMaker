import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Headphones,
  Sliders,
  Sun,
  Trees,
  Moon,
  Compass,
  CloudRain
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  SOUNDSCAPES,
  SOUNDSCAPE_MAP,
  soundscapeManager,
  suggestSoundscapeForCategory
} from '../utils/ambientSoundscapes';

// Icon Map for Soundscape Themes
const ICON_COMPONENTS = {
  Sun,
  Trees,
  Moon,
  Compass,
  Sparkles,
  CloudRain
};

export default function SoundscapePlayer({ storyCategory = '', defaultExpanded = false, className = '' }) {
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  // React state synchronized with soundscapeManager
  const [isPlaying, setIsPlaying] = useState(soundscapeManager.isPlaying());
  const [activeThemeId, setActiveThemeId] = useState(
    soundscapeManager.getCurrentTheme() || suggestSoundscapeForCategory(storyCategory)
  );
  const [volume, setVolume] = useState(soundscapeManager.getVolume());
  const [isMuted, setIsMuted] = useState(soundscapeManager.isMuted);
  const [isDucked, setIsDucked] = useState(soundscapeManager.isDucked());
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sync with soundscapeManager changes
  useEffect(() => {
    // If a story category is provided and player is not yet running, set theme
    if (storyCategory && !soundscapeManager.isPlaying()) {
      const suggested = suggestSoundscapeForCategory(storyCategory);
      if (suggested && suggested !== activeThemeId) {
        setActiveThemeId(suggested);
      }
    }

    const unsubscribe = soundscapeManager.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setActiveThemeId(state.activeTheme);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
      setIsDucked(state.isDucked);
    });

    return () => {
      unsubscribe();
    };
  }, [storyCategory]);

  const activeTheme = SOUNDSCAPE_MAP[activeThemeId] || SOUNDSCAPES[0];

  const handleTogglePlay = (e) => {
    e?.stopPropagation();
    if (isPlaying) {
      soundscapeManager.stop();
    } else {
      soundscapeManager.play(activeThemeId);
    }
  };

  const handleSelectTheme = (themeId) => {
    setActiveThemeId(themeId);
    if (isPlaying) {
      soundscapeManager.play(themeId);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (isMuted && val > 0) {
      soundscapeManager.setMuted(false);
    }
    soundscapeManager.setVolume(val);
  };

  const handleToggleMute = (e) => {
    e?.stopPropagation();
    soundscapeManager.toggleMute();
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const ActiveIconComponent = ICON_COMPONENTS[activeTheme.icon] || Sparkles;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 font-story backdrop-blur-md ${
        isPlaying
          ? 'bg-slate-900/90 dark:bg-slate-950/90 border-amber-500/40 shadow-lg shadow-amber-500/10'
          : 'bg-slate-100/90 dark:bg-slate-900/70 border-slate-300/60 dark:border-slate-800 text-slate-800 dark:text-slate-200'
      } ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Top Main Bar / Subtle Controller */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left / Start: Soundscape Info & Play/Pause */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-[200px]">
          {/* Main Play/Stop Button with Glow Ring */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all duration-200 ${
              isPlaying
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:scale-105 active:scale-95 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-slate-900'
                : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 active:scale-95'
            }`}
            title={
              isPlaying
                ? isArabic ? 'إيقاف الخلفية الصوتية' : 'Stop Ambient Soundscape'
                : isArabic ? 'تشغيل الخلفية الصوتية' : 'Play Ambient Soundscape'
            }
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className={`w-4 h-4 fill-current ${isArabic ? 'mr-0.5' : 'ml-0.5'}`} />
            )}
          </button>

          {/* Theme Title & Animated Wave Indicator */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base select-none">{activeTheme.emoji}</span>
              <span className={`text-sm font-bold truncate ${isPlaying ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {activeTheme.name[lang] || activeTheme.name.ar}
              </span>

              {/* Animated Equalizer Waves when Playing */}
              {isPlaying && !isMuted && (
                <div className="flex items-end gap-0.5 h-3 ml-1 shrink-0">
                  <span className="w-0.5 h-full bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-0.5 h-3.5 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.45s]"></span>
                  <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                </div>
              )}
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isPlaying
                ? (isArabic ? 'خلفية صوتية تفاعلية تعمل' : 'Atmospheric audio active')
                : (isArabic ? 'أجواء صوتية طبيعية بدون إنترنت' : 'Procedural offline soundscape')}
            </span>
          </div>
        </div>

        {/* Center / Auto-Ducking Pill (Visible when ducked for voice narration) */}
        {isPlaying && isDucked && (
          <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <span>{isArabic ? 'خفت تلقائي للسرد (25%)' : 'Ducked for narration (25%)'}</span>
          </div>
        )}

        {/* Right / End: Volume Slider & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={isMuted ? (isArabic ? 'تشغيل الصوت' : 'Unmute') : (isArabic ? 'كتم الصوت' : 'Mute')}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>

          {/* Volume Range Slider */}
          <div className="flex items-center gap-1.5 w-20 sm:w-28">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title={`${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Expand/Collapse Themes Picker */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
              isPlaying
                ? 'text-amber-400 hover:bg-slate-800'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={isArabic ? 'تغيير المؤثرات الصوتية' : 'Select Soundscape'}
          >
            <Sliders className="w-3.5 h-3.5" />
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Soundscape Preset Selector Drawer */}
      {isExpanded && (
        <div className="p-3 sm:p-4 pt-1 border-t border-slate-200/50 dark:border-slate-800/80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isArabic ? 'اختر الأجواء المناسبة للقصة:' : 'Choose Story Atmosphere:'}</span>
            </span>

            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ⚡ 100% {isArabic ? 'توليد ذكي أوفلاين' : 'Offline Procedural'}
            </span>
          </div>

          {/* Grid of 6 High Quality Soundscapes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SOUNDSCAPES.map((item) => {
              const isSelected = activeThemeId === item.id;
              const IconComp = ICON_COMPONENTS[item.icon] || Sparkles;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTheme(item.id)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 relative overflow-hidden group ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border-amber-500 text-amber-500 dark:text-amber-300 shadow-md ring-1 ring-amber-400/40'
                      : isPlaying
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl select-none group-hover:scale-110 transition-transform">
                      {item.emoji}
                    </span>
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400 opacity-60'}`} />
                  </div>

                  <span className="text-xs font-black truncate mt-0.5">
                    {item.name[lang] || item.name.ar}
                  </span>

                  <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                    {item.description[lang] || item.description.ar}
                  </span>

                  {/* Active playing indicator badge on selected card */}
                  {isSelected && isPlaying && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

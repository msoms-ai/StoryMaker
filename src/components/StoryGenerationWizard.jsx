import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Compass, Wand2, Moon, Rocket, Search, GraduationCap, Heart, Landmark, Upload, FileText, Link as LinkIcon, Check, CheckCircle2, Trash2, RotateCcw, ArrowRight, ArrowLeft, Sparkles, FolderPlus, Image as ImageIcon, Volume2, VolumeX, Users, Palette, Mic, BookOpen, RefreshCw } from 'lucide-react';
import EnhancedAudioPlayer from './EnhancedAudioPlayer';
import { getCategoryIconComponent } from '../categoryIcons';

export default function StoryGenerationWizard({ setCurrentView, setSelectedStoryId }) {
  const { lang, t } = useLanguage();
  const { user, refreshUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [storyName, setStoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);
  const [inputMethod, setInputMethod] = useState('paste');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  const [planData, setPlanData] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Generation & Progress Tracker State
  const [genStage, setGenStage] = useState('text');
  const [genProgressIndex, setGenProgressIndex] = useState(0);
  const [totalGenSlides, setTotalGenSlides] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftStory, setDraftStory] = useState(null);
  const [draftSlideIdx, setDraftSlideIdx] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioRef = useRef(null);
  const [redoComments, setRedoComments] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('');

  // Fetch dynamic categories from server (fresh with cache-busting)
  const fetchCategories = async () => {
    setIsRefreshingCategories(true);
    try {
      const res = await fetch(`/api/categories?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
        setSelectedCategory(prev => {
          if (prev && data.categories.some(c => c.id === prev)) return prev;
          return data.categories[0].id;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    } finally {
      setIsRefreshingCategories(false);
    }
  };

  // Clear state when wizard mounts & load dynamic categories
  useEffect(() => {
    setStoryName('');
    setPastedText('');
    setFileName('');
    setPlanData(null);
    setDraftStory(null);

    fetchCategories();

    return () => {
      stopAllAudio();
    };
  }, []);

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!storyName.trim()) return;
    fetchCategories();
    setStep(2);
  };

  const handleAnalyzeText = async (overrideComments = '') => {
    setIsPlanning(true);
    setStep(4);
    setPlanData(null); // Clear previous plan data
    
    const actualSourceText = (pastedText && pastedText.trim().length > 5) ? pastedText.trim() : storyName.trim();

    try {
      console.log(`[Client Wizard] Sending sourceText (${actualSourceText.length} chars): "${actualSourceText.substring(0, 80)}..."`);
      const res = await fetch('/api/stories/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyName,
          category: selectedCategory,
          sourceText: actualSourceText,
          lang,
          comments: overrideComments || redoComments,
          userId: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlanData(data.plan);
        if (data.plan.storyTitle) setStoryName(data.plan.storyTitle);
        if (data.plan.slides) setTotalGenSlides(data.plan.slides.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApprovePlanStartFullGeneration = async () => {
    setStep(5);
    setIsGenerating(true);
    setGenStage('text');
    setGenProgressIndex(0);

    const slides = planData ? planData.slides : [];
    const slidesCount = slides.length || 5;
    setTotalGenSlides(slidesCount);

    try {
      // 1. Stage 1: Create Folders & Story ID
      setGenStage('text');
      const startRes = await fetch('/api/stories/start-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: planData ? planData.storyTitle : storyName })
      });
      const startData = await startRes.json();
      const { storyId, folderName } = startData;

      // 2. Stage 2: Real Gemini Image Generation per slide
      setGenStage('image');
      const generatedImageFiles = [];

      for (let i = 0; i < slidesCount; i++) {
        setGenProgressIndex(i);
        
        const imgRes = await fetch('/api/stories/generate-slide-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderName,
            slideIndex: i,
            slideText: slides[i].text,
            storyTitle: planData ? planData.storyTitle : storyName,
            category: selectedCategory,
            lang,
            userFeedback: redoComments,
            characters: planData ? planData.characters : []
          })
        });
        const imgData = await imgRes.json();
        generatedImageFiles.push(imgData.imageFile);

        setGenProgressIndex(i + 1);
      }

      // 3. Stage 3: Real Gemini Voice Narration per slide
      setGenStage('voice');
      setGenProgressIndex(0);
      const generatedVoiceFiles = [];

      for (let i = 0; i < slidesCount; i++) {
        setGenProgressIndex(i);

        const voiceRes = await fetch('/api/stories/generate-slide-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderName,
            slideIndex: i,
            slideText: slides[i].text,
            lang
          })
        });
        const voiceData = await voiceRes.json();
        generatedVoiceFiles.push(voiceData.voiceFile);

        setGenProgressIndex(i + 1);
      }

      // 4. Finalize Story Record
      const finalSlides = slides.map((s, idx) => ({
        index: idx,
        title: s.title || `Scene ${idx + 1}`,
        text: s.text,
        imageFile: generatedImageFiles[idx],
        voiceFile: generatedVoiceFiles[idx]
      }));

      const finalizeRes = await fetch('/api/stories/finalize-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          folderName,
          title: planData ? planData.storyTitle : storyName,
          category: selectedCategory,
          lang,
          slides: finalSlides,
          comments: redoComments,
          userId: user?.id
        })
      });

      const finalizeData = await finalizeRes.json();
      if (finalizeData.success) {
        setDraftStory(finalizeData.story);
        if (refreshUser) refreshUser();
        setIsGenerating(false);
        setStep(6);
      }
    } catch (err) {
      console.error('[Client Wizard Generation Error]:', err);
      setIsGenerating(false);
    }
  };

  const playDraftAudio = () => {
    if (!draftStory) return;
    const currentSlide = draftStory.slides[draftSlideIdx];
    if (!currentSlide) return;

    stopAllAudio();

    if (currentSlide.voiceFile) {
      const audio = new Audio(currentSlide.voiceFile);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.play().catch(() => {
        speakTextFallback(currentSlide.text);
      });

      audio.onended = () => setIsPlayingAudio(false);
    } else {
      speakTextFallback(currentSlide.text);
    }
  };

  const speakTextFallback = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopAllAudio = () => {
    if (audioRef.current) audioRef.current.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  };

  const handleDecision = async (action) => {
    stopAllAudio();
    if (!draftStory) return;

    if (action === 'approve') {
      await fetch(`/api/stories/${draftStory.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });
      setOutcomeStatus('saved');
      setStep(8);
    } else if (action === 'reject') {
      await fetch(`/api/stories/${draftStory.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deleted' })
      });
      setOutcomeStatus('deleted');
      setStep(8);
    } else if (action === 'redo') {
      setOutcomeStatus('redo');
      setStep(8);
      setTimeout(() => {
        handleAnalyzeText(redoComments);
      }, 1500);
    }
  };

  const progressPercent = Math.round((genProgressIndex / totalGenSlides) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Header Progress Bar (Synchronized 8 Total Steps) */}
      <div className="glass-panel p-6 rounded-3xl mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''} flex items-center gap-2`}>
            <Sparkles className="w-5 h-5 text-amber-500" />
            {t('wizardTitle')}
          </h2>
          <span className={`${lang === 'ar' ? 'font-arabic' : ''} font-bold text-sm px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400`}>
            {lang === 'ar' ? `الخطوة ${step} من 8` : `Step ${step} of 8`}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(step / 8) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* STEP 1: Story Name Input */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
          <h3 className={`text-2xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
            {lang === 'ar' ? 'الخطوة 1: اسم القصة ورسالتها' : 'Step 1: Story Title & Topic'}
          </h3>
          <div>
            <input
              type="text"
              required
              value={storyName}
              onChange={(e) => setStoryName(e.target.value)}
              placeholder={t('step1Placeholder')}
              className={`w-full px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}
            />
          </div>
          <div className={`flex ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}>
            <button
              type="submit"
              disabled={!storyName.trim()}
              className={`px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-all shadow-lg flex items-center gap-2 ${lang === 'ar' ? 'font-arabic' : ''}`}
            >
              <span>{lang === 'ar' ? 'التالي: اختيار التصنيف' : 'Next: Choose Category'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: Category Selection */}
      {step === 2 && (
        <div className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className={`text-2xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
              {lang === 'ar' ? 'الخطوة 2: اختيار تصنيف القصة' : 'Step 2: Select Story Category'}
            </h3>
            <button
              type="button"
              onClick={fetchCategories}
              disabled={isRefreshingCategories}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title={lang === 'ar' ? 'تحديث قائمة التصنيفات من لوحة التحكم' : 'Refresh categories list from admin panel'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCategories ? 'animate-spin text-amber-500' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const IconComp = getCategoryIconComponent(cat.icon);
              const isSelected = selectedCategory === cat.id;
              const colorClass = cat.color || 'bg-indigo-600 text-white';
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg scale-105'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <span className={`font-bold text-sm text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
                    {cat.name[lang] || cat.name.en || cat.name.ar}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={`flex justify-between pt-4 ${lang === 'ar' ? 'font-arabic' : ''}`}>
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              {lang === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <span>{lang === 'ar' ? 'التالي: مصدر القصة' : 'Next: Content Source'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Content Source Option */}
      {step === 3 && (
        <div className={`glass-panel p-8 rounded-3xl space-y-6 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {lang === 'ar' ? 'الخطوة 3: تحديد مصدر نص القصة' : 'Step 3: Choose Story Text Source'}
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setInputMethod('paste'); setPlanData(null); }}
              className={`p-4 rounded-2xl border-2 font-bold text-sm flex flex-col items-center gap-2 ${
                inputMethod === 'paste' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileText className="w-6 h-6" />
              {lang === 'ar' ? 'كتابة / لصق النص' : 'Type / Paste Text'}
            </button>
            <button
              onClick={() => { setInputMethod('upload'); setPlanData(null); }}
              className={`p-4 rounded-2xl border-2 font-bold text-sm flex flex-col items-center gap-2 ${
                inputMethod === 'upload' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <Upload className="w-6 h-6" />
              {lang === 'ar' ? 'رفع ملف PDF / Word' : 'Upload PDF / Word'}
            </button>
            <button
              onClick={() => { setInputMethod('link'); setPlanData(null); }}
              className={`p-4 rounded-2xl border-2 font-bold text-sm flex flex-col items-center gap-2 ${
                inputMethod === 'link' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <LinkIcon className="w-6 h-6" />
              {lang === 'ar' ? 'رابط موقع' : 'Web Link'}
            </button>
          </div>

          {inputMethod === 'paste' && (
            <textarea
              rows="5"
              value={pastedText}
              onChange={(e) => { setPastedText(e.target.value); setPlanData(null); }}
              placeholder={lang === 'ar' ? 'اكتب أو الصق نص القصة هنا بالكامل...' : 'Type or paste the full story text here...'}
              className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            ></textarea>
          )}

          {inputMethod === 'upload' && (
            <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-4">
              <Upload className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  // IMMEDIATELY CLEAR OLD STORY STATE
                  setPastedText('');
                  setPlanData(null);
                  setDraftStory(null);
                  setIsUploading(true);
                  setFileName(lang === 'ar' ? `جاري قراءة واستخراج النص بالذكاء الاصطناعي من ${file.name}...` : `Extracting text with AI from ${file.name}...`);
                  
                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const res = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData
                    });
                    const data = await res.json();
                    if (data.success && data.text) {
                      setPastedText(data.text);
                      setFileName(lang === 'ar' ? `تم رفع الملف واستخراج نص القصة بنجاح ✓ (${data.text.length} حرف)` : `File uploaded & story text extracted ✓ (${data.text.length} chars)`);
                    } else {
                      setFileName(lang === 'ar' ? `فشل الاستخراج من ${file.name}` : `Extraction failed for ${file.name}`);
                    }
                  } catch (err) {
                    console.error('File upload error:', err);
                    setFileName(lang === 'ar' ? `حدث خطأ أثناء رفع ${file.name}` : `Error uploading ${file.name}`);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer font-bold text-amber-600 hover:underline block text-base">
                {lang === 'ar' ? 'اضغط هنا لاختيار ملف PDF أو WORD' : 'Click here to choose a PDF or WORD file'}
              </label>

              {fileName && (
                <div className={`p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold ${lang === 'ar' ? 'font-arabic' : ''} text-center flex items-center justify-center gap-2`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          )}

          {inputMethod === 'link' && (
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/story.pdf"
              className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              {lang === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button
              onClick={() => handleAnalyzeText()}
              disabled={isUploading || (inputMethod === 'paste' && !pastedText.trim()) || (inputMethod === 'upload' && !pastedText.trim())}
              className={`px-8 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg flex items-center gap-2 ${
                isUploading || (inputMethod === 'paste' && !pastedText.trim()) || (inputMethod === 'upload' && !pastedText.trim())
                  ? 'bg-amber-300 cursor-not-allowed opacity-50'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <Wand2 className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} />
              <span>{isUploading ? (lang === 'ar' ? 'جاري الاستخراج...' : 'Extracting...') : (lang === 'ar' ? 'دراسة النص وإعداد الخطة' : 'Analyze Text & Plan')}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Character & Verbatim Slide Breakdown Review */}
      {step === 4 && (
        <div className={`glass-panel p-8 rounded-3xl space-y-6 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {lang === 'ar' ? 'الخطوة 4: مراجعة وتقسيم المشاهد وقائمة الشخصيات' : 'Step 4: Review Scenes & Character List'}
            </h3>
            <span className="font-bold text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-600">
              {lang === 'ar' ? 'تدقيق النص الأصلي 🔍' : 'Original Text Breakdown 🔍'}
            </span>
          </div>

          {isPlanning || !planData ? (
            <div className="p-12 text-center space-y-4">
              <Wand2 className="w-12 h-12 text-amber-500 mx-auto animate-spin" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {lang === 'ar'
                  ? 'يقوم الذكاء الاصطناعي باستخراج قائمة الشخصيات وتقسيم القصة لمشاهد حرفية بدون تلخيص...'
                  : 'AI is extracting character profiles and splitting the story into verbatim scenes without summarization...'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Characters List Section & Visual Consistency Dossier */}
              <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-black text-indigo-700 dark:text-indigo-300 text-base flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{lang === 'ar' ? 'دليل الشخصيات وتوحيد المظهر البصري (Character Consistency Model Sheet):' : 'Character Consistency Model Sheet:'}</span>
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0">
                    {lang === 'ar' ? 'ضمان ثبات المظهر عبر كافة المشاهد 🎨' : 'Cross-slide visual consistency 🎨'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {planData.characters && planData.characters.map((c, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                          👤 {c.name}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                          {c.role}
                        </span>
                      </div>
                      {c.visualProfile && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 font-medium">
                          🎨 <span className="font-semibold text-indigo-600 dark:text-indigo-400">{lang === 'ar' ? 'المظهر والزي الثابت:' : 'Signature Look & Outfit:'}</span> {c.visualProfile}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Counts Summary */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-center">
                {lang === 'ar' ? (
                  <>إجمالي عدد مشاهد القصة: <span className="text-xl font-black text-amber-600 mx-1">{planData.slideCount}</span> مشاهد.</>
                ) : (
                  <>Total Story Scenes: <span className="text-xl font-black text-amber-600 mx-1">{planData.slideCount}</span> scenes.</>
                )}
              </div>

              {/* Detailed Verbatim Slides Breakdown */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {planData.slides.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.title}</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed font-medium">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm"
                >
                  {lang === 'ar' ? 'تعديل المصدر' : 'Edit Source'}
                </button>
                <button
                  onClick={handleApprovePlanStartFullGeneration}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm sm:text-base transition-all shadow-lg flex items-center gap-2"
                >
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>{lang === 'ar' ? 'تأكيد الخطة وتوليد كافة الصور والأصوات بالذكاء الاصطناعي 🚀' : 'Confirm Plan & Generate AI Art & Voice 🚀'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Creative AI Drawing & Voice Loading Screen with Completion Bar */}
      {step === 5 && (
        <div className={`glass-panel p-12 rounded-3xl text-center space-y-8 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
              {genStage === 'text' && <FileText className="w-10 h-10 animate-pulse" />}
              {genStage === 'image' && <Palette className="w-10 h-10 animate-bounce" />}
              {genStage === 'voice' && <Mic className="w-10 h-10 animate-pulse" />}
            </div>
          </div>

          <div className="space-y-4">
            {genStage === 'text' && (
              <>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'المرحلة الأولى: تهيئة مجلدات القصة وبنيتها...' : 'Stage 1: Initializing story folders & structure...'}
                </h3>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {lang === 'ar' ? 'جاري إنشاء مجلدات الصور والأصوات المخصصة للقصة...' : 'Creating dedicated folders for illustrations and audio narrations...'}
                </p>
              </>
            )}

            {genStage === 'image' && (
              <>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'المرحلة الثانية: الرسام المبدع يرسم المشاهد السحرية للقصة الآن... 🎨✨' : 'Stage 2: Illustrating magical story scenes now... 🎨✨'}
                </h3>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {lang === 'ar'
                    ? `جاري رسم وتجسيد المشهد ${Math.min(genProgressIndex + 1, totalGenSlides)} من ${totalGenSlides} بالألوان الخشبية الدافئة (Google Gemini API)...`
                    : `Drawing scene ${Math.min(genProgressIndex + 1, totalGenSlides)} of ${totalGenSlides} with warm colored pencils (Google Gemini API)...`}
                </p>

                <div className="max-w-md mx-auto space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span>
                      {lang === 'ar'
                        ? `تم رسم ${genProgressIndex} من ${totalGenSlides} مشاهد`
                        : `Drawn ${genProgressIndex} of ${totalGenSlides} scenes`}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, progressPercent)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}

            {genStage === 'voice' && (
              <>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'المرحلة الثالثة: تسجيل وتأليف السرد الصوتي المعبر للمشاهد... 🎙️🎶' : 'Stage 3: Recording expressive narration for scenes... 🎙️🎶'}
                </h3>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {lang === 'ar'
                    ? `جاري توليد الملف الصوتي النقي للمشهد ${Math.min(genProgressIndex + 1, totalGenSlides)} من ${totalGenSlides} (Gemini Speech API)...`
                    : `Generating crystal-clear narration for scene ${Math.min(genProgressIndex + 1, totalGenSlides)} of ${totalGenSlides} (Gemini Speech API)...`}
                </p>

                <div className="max-w-md mx-auto space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
                    <span>
                      {lang === 'ar'
                        ? `تم توليد ${genProgressIndex} من ${totalGenSlides} أصوات`
                        : `Generated ${genProgressIndex} of ${totalGenSlides} voice tracks`}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, progressPercent)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
            <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${genStage === 'text' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 scale-105' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
              <FolderPlus className="w-6 h-6" />
              <span className="text-xs font-bold">{lang === 'ar' ? '1. المجلدات والقصة' : '1. Structure'}</span>
            </div>

            <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${genStage === 'image' ? 'bg-amber-500/10 border-amber-500 text-amber-600 scale-105' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
              <Palette className="w-6 h-6" />
              <span className="text-xs font-bold">{lang === 'ar' ? '2. رسم الصور' : '2. Illustrations'}</span>
            </div>

            <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${genStage === 'voice' ? 'bg-rose-500/10 border-rose-500 text-rose-600 scale-105' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
              <Mic className="w-6 h-6" />
              <span className="text-xs font-bold">{lang === 'ar' ? '3. السرد الصوتي' : '3. Narration'}</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Full Draft Preview Deck */}
      {step === 6 && draftStory && (
        <div className={`glass-panel p-8 rounded-3xl space-y-6 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {lang === 'ar'
                ? `الخطوة 6: معاينة المسودة الكاملة - ${draftStory.name[lang] || draftStory.name.ar}`
                : `Step 6: Full Draft Preview - ${draftStory.name[lang] || draftStory.name.en || draftStory.name.ar}`}
            </h3>
            <span className="font-bold text-xs px-3 py-1 rounded-full bg-indigo-600 text-white">
              {lang === 'ar'
                ? `المشهد ${draftSlideIdx + 1} من ${draftStory.slides.length}`
                : `Scene ${draftSlideIdx + 1} of ${draftStory.slides.length}`}
            </span>
          </div>

          <div className="space-y-4">
            <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2 shadow-inner">
              <img
                src={draftStory.slides[draftSlideIdx].imageFile}
                alt={`Slide ${draftSlideIdx + 1}`}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3 font-story">
              <h4 className="font-black text-amber-700 dark:text-amber-300 text-base font-story">
                {draftStory.slides[draftSlideIdx].title}
              </h4>

              <EnhancedAudioPlayer
                audioUrl={draftStory.slides[draftSlideIdx].voiceFile}
                text={draftStory.slides[draftSlideIdx].text}
                lang={lang}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={draftSlideIdx === 0}
                onClick={() => { stopAllAudio(); setDraftSlideIdx((prev) => Math.max(0, prev - 1)); }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 disabled:opacity-40 font-bold text-sm"
              >
                {lang === 'ar' ? 'المشهد السابق' : 'Previous Scene'}
              </button>
              
              <div className="flex gap-1.5">
                {draftStory.slides.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => { stopAllAudio(); setDraftSlideIdx(i); }}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                      draftSlideIdx === i ? 'bg-amber-500 w-6' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  ></div>
                ))}
              </div>

              <button
                disabled={draftSlideIdx === draftStory.slides.length - 1}
                onClick={() => { stopAllAudio(); setDraftSlideIdx((prev) => Math.min(draftStory.slides.length - 1, prev + 1)); }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 disabled:opacity-40 font-bold text-sm"
              >
                {lang === 'ar' ? 'المشهد التالي' : 'Next Scene'}
              </button>
            </div>
          </div>

          <div className={`flex ${lang === 'ar' ? 'justify-end' : 'justify-start'} pt-4 border-t border-slate-200 dark:border-slate-800`}>
            <button
              onClick={() => { stopAllAudio(); setStep(7); }}
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-lg flex items-center gap-2 text-base"
            >
              <span>{lang === 'ar' ? 'الخطوة 7: اتخاذ القرار والتأكيد النهائي' : 'Step 7: Final Decision & Review'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Final Decision & Approval */}
      {step === 7 && (
        <div className={`glass-panel p-8 rounded-3xl space-y-6 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {lang === 'ar' ? 'الخطوة 7: اتخاذ القرار والتأكيد النهائي' : 'Step 7: Final Decision & Confirmation'}
          </h3>

          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleDecision('approve')}
              className="p-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg flex flex-col items-center gap-3 text-center"
            >
              <CheckCircle2 className="w-10 h-10" />
              <span>{lang === 'ar' ? 'اعتماد ونشر القصة 🌟' : 'Approve & Publish Story 🌟'}</span>
            </button>

            <button
              onClick={() => handleDecision('reject')}
              className="p-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-lg flex flex-col items-center gap-3 text-center"
            >
              <Trash2 className="w-10 h-10" />
              <span>{lang === 'ar' ? 'رفض وحذف الملفات ❌' : 'Reject & Delete Files ❌'}</span>
            </button>

            <button
              onClick={() => handleDecision('redo')}
              className="p-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg flex flex-col items-center gap-3 text-center"
            >
              <RotateCcw className="w-10 h-10" />
              <span>{lang === 'ar' ? 'إعادة التفكير مع ملاحظات 🔄' : 'Redo with Notes 🔄'}</span>
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'ملاحظات وتوجيهات الذكاء الاصطناعي للتعديل:' : 'Notes & instructions for AI revision:'}
            </label>
            <textarea
              rows="3"
              value={redoComments}
              onChange={(e) => setRedoComments(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب ملاحظاتك...' : 'Enter your revision notes or feedback...'}
              className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            ></textarea>
          </div>
        </div>
      )}

      {/* STEP 8: Outcome & Save Page */}
      {step === 8 && (
        <div className={`glass-panel p-12 rounded-3xl text-center space-y-6 animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          {outcomeStatus === 'saved' && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? 'الخطوة 8: تم حفظ القصة ونشرها بنجاح في المكتبة! 🎉' : 'Step 8: Story published successfully in library! 🎉'}
              </h3>
            </div>
          )}

          {outcomeStatus === 'deleted' && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? 'الخطوة 8: تم إلغاء وحذف كافة الملفات بنجاح.' : 'Step 8: All generated files were canceled and deleted.'}
              </h3>
            </div>
          )}

          {outcomeStatus === 'redo' && (
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center animate-spin">
                <RotateCcw className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? 'الخطوة 8: جاري إعادة تحليلات القصة بناءً على ملاحظاتك...' : 'Step 8: Re-analyzing story based on your feedback...'}
              </h3>
            </div>
          )}

          <div className="pt-6">
            <button
              onClick={() => setCurrentView('landing')}
              className="px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-xl shadow-amber-500/30 transition-all flex items-center gap-2 mx-auto"
            >
              <span>{lang === 'ar' ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

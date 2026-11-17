import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Paintbrush,
  PaintBucket,
  Eraser,
  Undo2,
  RotateCcw,
  Download,
  FileDown,
  Sparkles,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { convertImageToLineArt, createFallbackLineArtCanvas, generateActivityBookletPDF } from '../utils/activityBookletGenerator';

// 16 vibrant kid-friendly primary and pastel colors + black and white
const KID_COLOR_PALETTE = [
  { hex: '#ef4444', name: 'أحمر ناري / Red' },
  { hex: '#f97316', name: 'برتقالي مشرق / Orange' },
  { hex: '#f59e0b', name: 'ذهبي زاهي / Amber' },
  { hex: '#fbbf24', name: 'أصفر ليموني / Yellow' },
  { hex: '#10b981', name: 'أخضر زمردي / Emerald' },
  { hex: '#22c55e', name: 'أخضر عشبي / Green' },
  { hex: '#06b6d4', name: 'سماوي مائي / Cyan' },
  { hex: '#3b82f6', name: 'أزرق ملكي / Blue' },
  { hex: '#6366f1', name: 'نيلي ساحر / Indigo' },
  { hex: '#8b5cf6', name: 'بنفسجي مرح / Purple' },
  { hex: '#ec4899', name: 'وردي فاقع / Pink' },
  { hex: '#f472b6', name: 'وردي ناعم / Rose' },
  { hex: '#a7f3d0', name: 'نعناعي باستيل / Mint' },
  { hex: '#bae6fd', name: 'أزرق ثلجي / Pastel Sky' },
  { hex: '#fed7aa', name: 'بشرة دافئة / Peach' },
  { hex: '#78350f', name: 'بني خشبي / Brown' },
  { hex: '#000000', name: 'أسود فحمي / Black' },
  { hex: '#ffffff', name: 'أبيض ناصع / White' }
];

const BRUSH_SIZES = [
  { size: 5, label: 'رفيعة / Fine', iconSize: 6 },
  { size: 12, label: 'متوسطة / Medium', iconSize: 12 },
  { size: 22, label: 'عريضة / Thick', iconSize: 18 },
  { size: 38, label: 'جامبو / Jumbo', iconSize: 26 }
];

export default function ColoringBookModal({
  isOpen,
  onClose,
  story,
  initialSlideIdx = 0,
  lang = 'ar'
}) {
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(initialSlideIdx);
  const [activeTool, setActiveTool] = useState('bucket'); // 'bucket' | 'brush' | 'eraser'
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(12);
  const [isLoadingArt, setIsLoadingArt] = useState(false);
  const [showOriginalPeek, setShowOriginalPeek] = useState(false);
  const [history, setHistory] = useState([]);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');

  const canvasRef = useRef(null);
  const originalLineArtRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const slides = story?.slides || [];
  const currentSlide = slides[selectedSlideIdx] || slides[0] || {};
  const storyTitle = (typeof story?.name === 'object' && story?.name
    ? (story?.name[lang] || story?.name?.ar || story?.name?.en)
    : story?.name) || story?.title || 'قصة الأبطال';

  // Sync initialSlideIdx if prop changes
  useEffect(() => {
    if (initialSlideIdx >= 0 && initialSlideIdx < slides.length) {
      setSelectedSlideIdx(initialSlideIdx);
    }
  }, [initialSlideIdx, slides.length]);

  // Load and generate line art when modal opens or slide changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingArt(true);
    setHistory([]);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetW = 960;
    const targetH = 680;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function prepareLineArt() {
      let lineArtCanvas = null;
      const imgUrl = currentSlide.imageFile;

      if (imgUrl) {
        try {
          lineArtCanvas = await convertImageToLineArt(imgUrl, targetW, targetH, {
            title: currentSlide.title
          });
        } catch (e) {
          console.warn('Failed to convert slide to line art:', e);
          lineArtCanvas = createFallbackLineArtCanvas(targetW, targetH, currentSlide.title);
        }
      } else {
        lineArtCanvas = createFallbackLineArtCanvas(targetW, targetH, currentSlide.title);
      }

      if (!isMounted) return;

      // Draw onto main interactive canvas
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(lineArtCanvas, 0, 0, targetW, targetH);

      // Save a copy of the clean original line art for "Clear" & "Undo" base
      const cleanData = ctx.getImageData(0, 0, targetW, targetH);
      originalLineArtRef.current = cleanData;

      setIsLoadingArt(false);
    }

    prepareLineArt();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedSlideIdx, currentSlide.imageFile, currentSlide.title]);

  // Push state to undo history
  const pushState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setHistory((prev) => {
      const next = [...prev, snap];
      if (next.length > 15) next.shift(); // Keep up to 15 undo steps
      return next;
    });
  }, []);

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const newHistory = [...history];
    const prevState = newHistory.pop();
    setHistory(newHistory);

    if (prevState) {
      ctx.putImageData(prevState, 0, 0);
    } else if (originalLineArtRef.current) {
      ctx.putImageData(originalLineArtRef.current, 0, 0);
    }
  };

  // Keyboard shortcut for Undo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  // Clear canvas back to initial line art
  const handleClearCanvas = () => {
    if (!originalLineArtRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    pushState();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.putImageData(originalLineArtRef.current, 0, 0);
  };

  // Helper: Hex color to RGB object
  const hexToRgb = (hex) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  // Get pointer coordinates mapped to canvas internal resolution
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY)
    };
  };

  /**
   * Fast Queue-Based Flood Fill (Paint Bucket) Algorithm
   * Fills contiguous region within outline boundaries.
   */
  const floodFill = (startX, startY, fillColorHex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    pushState();

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const fillRgb = hexToRgb(fillColorHex);
    const startIdx = (startY * w + startX) * 4;

    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    // Don't fill if target pixel is already the fill color
    if (targetR === fillRgb.r && targetG === fillRgb.g && targetB === fillRgb.b) {
      return;
    }

    // Protect dark outlines: do not fill directly over black lines
    const outlineBrightness = 0.299 * targetR + 0.587 * targetG + 0.114 * targetB;
    if (outlineBrightness < 55 && targetA > 200) {
      return; // Clicking directly on the outline does nothing
    }

    const tolerance = 42;
    const matchTarget = (idx) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Stop at outlines
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 55) return false;

      // Color distance to target
      const dr = Math.abs(r - targetR);
      const dg = Math.abs(g - targetG);
      const db = Math.abs(b - targetB);
      return dr + dg + db <= tolerance;
    };

    // Use flat Uint32 queue for high performance
    const queue = new Int32Array(w * h * 2);
    let qHead = 0;
    let qTail = 0;

    const visited = new Uint8Array(w * h);

    queue[qTail++] = startX;
    queue[qTail++] = startY;
    visited[startY * w + startX] = 1;

    while (qHead < qTail) {
      const cx = queue[qHead++];
      const cy = queue[qHead++];
      const idx = (cy * w + cx) * 4;

      // Color the pixel
      data[idx] = fillRgb.r;
      data[idx + 1] = fillRgb.g;
      data[idx + 2] = fillRgb.b;
      data[idx + 3] = 255;

      // 4-Way Neighbors
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];

        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nPos = ny * w + nx;
          if (!visited[nPos]) {
            visited[nPos] = 1;
            const nIdx = nPos * 4;
            if (matchTarget(nIdx)) {
              queue[qTail++] = nx;
              queue[qTail++] = ny;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Drawing event handlers (Brush and Eraser)
  const handlePointerDown = (e) => {
    if (isLoadingArt) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'bucket') {
      floodFill(coords.x, coords.y, selectedColor);
      return;
    }

    pushState();
    isDrawingRef.current = true;
    lastPosRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = activeTool === 'eraser' ? '#ffffff' : selectedColor;
    ctx.fill();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || activeTool === 'bucket') return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPosRef.current = coords;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  // Save Artwork (Download colored PNG & trigger confetti celebration)
  const handleSaveArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeTitle = (storyTitle || 'story')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    link.download = `تلوين_${safeTitle}_المشهد_${selectedSlideIdx + 1}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Download complete 7-page PDF activity booklet
  const handleDownloadFullBooklet = async () => {
    if (!story || isPdfGenerating) return;
    setIsPdfGenerating(true);
    try {
      await generateActivityBookletPDF(story, {
        childName: '',
        lang,
        onProgress: (current, total, label) => {
          setPdfProgressText(`${label} (${current}/${total})`);
        }
      });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        shapes: ['star']
      });
    } catch (e) {
      console.error('Failed to generate activity booklet PDF:', e);
      alert(lang === 'ar' ? 'عذراً، حدث خطأ أثناء تجهيز الكتيب' : 'Error generating booklet');
    } finally {
      setIsPdfGenerating(false);
      setPdfProgressText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden ${
          lang === 'ar' ? 'font-arabic' : ''
        }`}
      >
        {/* ========================================================
            MODAL HEADER: Title, Slide Indicator, PDF Button, Close
            ======================================================== */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'مرسم التلوين الذكي للأطفال' : 'Smart Kids Coloring Studio'}
                </h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {lang === 'ar' ? `المشهد ${selectedSlideIdx + 1} من ${slides.length}` : `Scene ${selectedSlideIdx + 1} of ${slides.length}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-sm sm:max-w-md">
                {storyTitle} - {currentSlide.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Printable 7-page PDF Activity Booklet */}
            <button
              onClick={handleDownloadFullBooklet}
              disabled={isPdfGenerating}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              title={lang === 'ar' ? 'تحميل كُتيّب الأنشطة والتلوين الكامل (7 صفحات PDF)' : 'Download Full 7-Page Activity Booklet PDF'}
            >
              {isPdfGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
                  <span className="hidden sm:inline">{pdfProgressText || (lang === 'ar' ? 'جاري التجهيز...' : 'Preparing...')}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === 'ar' ? 'كتيب الأنشطة (PDF)' : 'Activity Booklet (PDF)'}</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            SLIDE SELECTOR TABS (If multiple scenes)
            ======================================================== */}
        {slides.length > 1 && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
            <span className="text-xs font-black text-slate-400 shrink-0">
              {lang === 'ar' ? 'اختر المشهد:' : 'Select Scene:'}
            </span>
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSlideIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedSlideIdx === idx
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <span>{lang === 'ar' ? `المشهد ${idx + 1}` : `Scene ${idx + 1}`}</span>
              </button>
            ))}
          </div>
        )}

        {/* ========================================================
            CANVAS AREA & TOOLS TOOLBAR
            ======================================================== */}
        <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-y-auto items-center justify-center bg-slate-100/70 dark:bg-slate-950/40">
          
          {/* Main Drawing Canvas Board */}
          <div className="relative flex items-center justify-center w-full max-w-3xl rounded-2xl overflow-hidden bg-white shadow-xl border-2 border-slate-300 dark:border-slate-700">
            {isLoadingArt && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm space-y-3">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                <p className="text-sm font-black text-slate-700 dark:text-slate-200 animate-pulse">
                  {lang === 'ar' ? 'جاري تحويل المشهد إلى رسم خطي نقي بالتحديد الذكي...' : 'Converting scene to line art...'}
                </p>
              </div>
            )}

            {/* Interactive Coloring Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`w-full h-auto max-h-[58vh] object-contain touch-none select-none ${
                activeTool === 'bucket' ? 'cursor-crosshair' : activeTool === 'eraser' ? 'cursor-cell' : 'cursor-pointer'
              }`}
            />

            {/* Peek Original Colored Image Overlay */}
            {showOriginalPeek && currentSlide.imageFile && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 animate-fade-in pointer-events-none">
                <img
                  src={currentSlide.imageFile}
                  alt={currentSlide.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Right/Bottom Interactive Toolbox Panel */}
          <div className="w-full lg:w-72 flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            
            {/* Tool Selection: Bucket vs Brush vs Eraser */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'أدوات الرسم والتلوين:' : 'Coloring Tools:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Paint Bucket Tool */}
                <button
                  onClick={() => setActiveTool('bucket')}
                  className={`p-2.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all ${
                    activeTool === 'bucket'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title={lang === 'ar' ? 'دلو الألوان (ملء فوري للمساحات)' : 'Paint Bucket (Instant Flood Fill)'}
                >
                  <PaintBucket className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'دلو الألوان' : 'Bucket'}</span>
                </button>

                {/* Freehand Brush Tool */}
                <button
                  onClick={() => setActiveTool('brush')}
                  className={`p-2.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all ${
                    activeTool === 'brush'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title={lang === 'ar' ? 'فرشاة التلوين الحرة' : 'Freehand Paintbrush'}
                >
                  <Paintbrush className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'الفرشاة' : 'Brush'}</span>
                </button>

                {/* Eraser Tool */}
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={`p-2.5 rounded-xl font-black text-xs flex flex-col items-center gap-1 transition-all ${
                    activeTool === 'eraser'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title={lang === 'ar' ? 'ممحاة لمسح الألوان' : 'Eraser'}
                >
                  <Eraser className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'ممحاة' : 'Eraser'}</span>
                </button>
              </div>
            </div>

            {/* Brush Size Selector (If Brush or Eraser is selected) */}
            {(activeTool === 'brush' || activeTool === 'eraser') && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'حجم الخط والفرشاة:' : 'Brush Size:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {BRUSH_SIZES.map((b) => (
                    <button
                      key={b.size}
                      onClick={() => setBrushSize(b.size)}
                      className={`py-2 rounded-xl flex items-center justify-center border transition-all ${
                        brushSize === b.size
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-black'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                      }`}
                      title={b.label}
                    >
                      <div
                        className="rounded-full bg-current"
                        style={{ width: b.iconSize, height: b.iconSize }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kid-Friendly Vibrant Color Palette (16 colors + black/white) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'لوحة الألوان الزاهية:' : 'Color Palette:'}
                </label>
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: selectedColor }}
                  title={selectedColor}
                />
              </div>

              <div className="grid grid-cols-6 gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                {KID_COLOR_PALETTE.map((color) => {
                  const isSelected = selectedColor.toLowerCase() === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.hex}
                      onClick={() => {
                        setSelectedColor(color.hex);
                        if (activeTool === 'eraser') setActiveTool('bucket');
                      }}
                      className={`relative w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                        isSelected
                          ? 'scale-115 ring-3 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900 shadow-md'
                          : 'hover:scale-110 active:scale-95 shadow-sm'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 ${
                            ['#ffffff', '#fbbf24', '#bae6fd', '#fed7aa', '#a7f3d0'].includes(color.hex)
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Undo, Clear, Peek Original */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                title={lang === 'ar' ? 'تراجع عن آخر خطوة (Ctrl+Z)' : 'Undo Last Action (Ctrl+Z)'}
              >
                <Undo2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تراجع' : 'Undo'}</span>
              </button>

              {/* Clear */}
              <button
                onClick={handleClearCanvas}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                title={lang === 'ar' ? 'مسح الرسم وإعادة الخطوط الأصلية' : 'Reset to Original Lines'}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{lang === 'ar' ? 'مسح' : 'Clear'}</span>
              </button>

              {/* Peek Original Illustration */}
              <button
                onMouseDown={() => setShowOriginalPeek(true)}
                onMouseUp={() => setShowOriginalPeek(false)}
                onTouchStart={() => setShowOriginalPeek(true)}
                onTouchEnd={() => setShowOriginalPeek(false)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  showOriginalPeek
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title={lang === 'ar' ? 'اضغط واستمر للمعاينة الأصلية للرسمة' : 'Hold to Peek Original Image'}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'معاينة' : 'Peek'}</span>
              </button>
            </div>

            {/* Save Artwork Button */}
            <button
              onClick={handleSaveArtwork}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ الرسمة الجميلة (PNG) 🎨' : 'Save Artwork (PNG) 🎨'}</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

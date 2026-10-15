import React, { useState, useRef } from 'react';
import { X, Share2, Copy, Check, Download, FileText, Globe, Calendar, User, Sparkles, MessageCircle, Send, Twitter, Facebook } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DUBAI_FONT_CSS } from '../utils/dubaiFont';

export default function ShareStoryModal({ isOpen, onClose, story, lang = 'ar' }) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const printContainerRef = useRef(null);

  if (!isOpen || !story) return null;

  const storyId = story.id || story.folderName;
  const storyTitle = (typeof story.name === 'object' && story.name !== null
    ? (story.name[lang] || story.name.ar || story.name.en)
    : story.name) || story.title || (lang === 'ar' ? 'قصة تفاعلية' : 'Interactive Story');

  const shareUrl = `${window.location.origin}/?story=${encodeURIComponent(storyId)}`;
  const shareText = lang === 'ar'
    ? `اقرأ قصة "${storyTitle}" الرائعة والمصورة على منصة قصص للذكاء الاصطناعي:`
    : `Read the illustrated story "${storyTitle}" on Qisas AI Platform:`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formattedDate = story.createdAt
    ? new Date(story.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');

  const slides = story.slides || [];

  // Generate Landscape PDF with 1 slide per page
  const handleDownloadPdf = async () => {
    if (!slides || slides.length === 0) {
      alert(lang === 'ar' ? 'لا توجد شرائح لتحميلها!' : 'No slides available to download!');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: slides.length });

    try {
      // 1. Ensure Dubai font is 100% loaded in document.fonts before capturing
      if (document.fonts) {
        try {
          const dubaiReg = new FontFace('Dubai', 'url(/Fonts/Dubai-Regular.ttf)', { weight: '400' });
          const dubaiBold = new FontFace('Dubai', 'url(/Fonts/Dubai-Bold.ttf)', { weight: '700' });
          await Promise.all([dubaiReg.load().catch(() => {}), dubaiBold.load().catch(() => {})]);
          document.fonts.add(dubaiReg);
          document.fonts.add(dubaiBold);
        } catch (e) {
          console.warn('Font load notice:', e);
        }
        await document.fonts.ready;
      }

      // Small delay to ensure off-screen layout painting is complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 2. Create landscape A4 PDF: 297mm width x 210mm height
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pages = printContainerRef.current?.querySelectorAll('.pdf-slide-page');
      if (!pages || pages.length === 0) {
        throw new Error('PDF template container not ready');
      }

      for (let i = 0; i < pages.length; i++) {
        setPdfProgress({ current: i + 1, total: pages.length });
        const pageEl = pages[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2, // High DPI resolution for printing
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          letterRendering: false // Critical: prevents character-by-character tearing
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }

      const safeFilename = (storyTitle || 'story')
        .replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      pdf.save(`${safeFilename}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert(lang === 'ar' ? 'تعذر إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.' : 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 ${lang === 'ar' ? 'font-arabic' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Share2 className="w-6 h-6" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {lang === 'ar' ? 'مشاركة القصة' : 'Share Story'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Info Preview */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          {story.coverImage && (
            <img
              src={story.coverImage}
              alt={storyTitle}
              className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm border border-amber-500/30"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-slate-900 dark:text-white text-base truncate">
              {storyTitle}
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              {story.authorName && (
                <span className="flex items-center gap-1 font-bold">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  {story.authorName}
                </span>
              )}
              <span className="flex items-center gap-1 font-bold">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: Direct Link & Social Sharing */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {lang === 'ar' ? 'رابط القصة المباشر:' : 'Direct Story Link:'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Link')}</span>
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:scale-105 transition-all border border-emerald-500/20 text-xs font-bold gap-1"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>واتساب</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 hover:scale-105 transition-all border border-sky-500/20 text-xs font-bold gap-1"
            >
              <Send className="w-5 h-5" />
              <span>تيليغرام</span>
            </a>

            {/* Twitter / X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:scale-105 transition-all border border-slate-300 dark:border-slate-700 text-xs font-bold gap-1"
            >
              <Twitter className="w-5 h-5 fill-current" />
              <span>X (تويتر)</span>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:scale-105 transition-all border border-blue-500/20 text-xs font-bold gap-1"
            >
              <Facebook className="w-5 h-5 fill-current" />
              <span>فيسبوك</span>
            </a>
          </div>
        </div>

        {/* SECTION 2: Download PDF in Landscape Mode */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>
                  {lang === 'ar'
                    ? `جاري تجهيز صفحات الـ PDF (${pdfProgress.current} من ${pdfProgress.total})...`
                    : `Preparing PDF Pages (${pdfProgress.current} of ${pdfProgress.total})...`}
                </span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>{lang === 'ar' ? 'تحميل القصة كملف PDF بالعرض (Landscape)' : 'Download Story as Landscape PDF'}</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {lang === 'ar'
              ? 'يحتوي الملف على جميع المشاهد ونصوصها مع الترويسة والتوثيق في صفحات أفقية جاهزة للطباعة'
              : 'Includes all story scenes and texts with header & footer in landscape printable pages'}
          </p>
        </div>

      </div>

      {/* OFF-SCREEN TEMPLATE CONTAINER FOR HIGH-RES LANDSCAPE PDF GENERATION */}
      <div
        ref={printContainerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1122px',
          opacity: 1,
          zIndex: -9999,
          pointerEvents: 'none',
          visibility: 'visible'
        }}
      >
        <style>{`
          ${DUBAI_FONT_CSS}

          .pdf-slide-page, .pdf-slide-page * {
            font-family: 'Dubai', sans-serif !important;
            letter-spacing: 0px !important;
            word-spacing: 0px !important;
            text-rendering: optimizeLegibility !important;
            font-feature-settings: "liga" 1, "kern" 1 !important;
            -webkit-font-feature-settings: "liga" 1, "kern" 1 !important;
          }
        `}</style>
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className="pdf-slide-page"
            style={{
              width: '1122px',
              height: '793px', // Exact A4 landscape ratio (297:210)
              backgroundColor: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '36px 48px',
              boxSizing: 'border-box',
              fontFamily: "'Dubai', sans-serif",
              direction: lang === 'ar' ? 'rtl' : 'ltr'
            }}
          >
            {/* Header: Story Title on Right (in RTL), Domain & Platform on Left */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              borderBottom: '2px solid #e2e8f0',
              direction: lang === 'ar' ? 'rtl' : 'ltr'
            }}>
              {/* Primary Story Title */}
              <div style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1e293b',
                fontFamily: "'Dubai', sans-serif",
                maxWidth: '650px',
                lineHeight: '1.4',
                direction: lang === 'ar' ? 'rtl' : 'ltr',
                textAlign: lang === 'ar' ? 'right' : 'left'
              }}>
                {storyTitle}
              </div>

              {/* Website Branding */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                direction: 'ltr'
              }}>
                <span style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: '#d97706'
                }}>
                  {window.location.hostname || 'msoms.ai'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
                  | {lang === 'ar' ? 'منصة قصص للذكاء الاصطناعي' : 'Qisas AI Platform'}
                </span>
              </div>
            </div>

            {/* Body: Side-by-side Landscape Layout (Image + Text) */}
            <div style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              gap: '36px',
              padding: '24px 0',
              direction: lang === 'ar' ? 'rtl' : 'ltr'
            }}>
              {/* Slide Image */}
              <div style={{
                width: '52%',
                height: '480px',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '2px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {slide.imageFile ? (
                  <img
                    src={slide.imageFile}
                    alt={`Slide ${idx + 1}`}
                    crossOrigin="anonymous"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {lang === 'ar' ? `المشهد ${idx + 1}` : `Scene ${idx + 1}`}
                  </div>
                )}
              </div>

              {/* Slide Text Content */}
              <div style={{
                width: '48%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '12px 16px',
                direction: lang === 'ar' ? 'rtl' : 'ltr',
                textAlign: lang === 'ar' ? 'right' : 'left'
              }}>
                {/* Scene Title Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '20px',
                  direction: lang === 'ar' ? 'rtl' : 'ltr',
                  fontFamily: "'Dubai', sans-serif"
                }}>
                  <span style={{ display: 'inline-block', lineHeight: '1', marginTop: '-4px' }}>
                    {slide.title || (lang === 'ar' ? `المشهد ${idx + 1}` : `Scene ${idx + 1}`)}
                  </span>
                </div>

                {/* Verbatim Slide Text with Pure Dubai Typography */}
                <div style={{
                  fontSize: '24px',
                  lineHeight: '2.0',
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: lang === 'ar' ? 'right' : 'left',
                  direction: lang === 'ar' ? 'rtl' : 'ltr',
                  fontFamily: "'Dubai', sans-serif",
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal'
                }}>
                  {slide.text}
                </div>
              </div>
            </div>

            {/* Footer: Domain, Author, Date, Page Number */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '2px solid #e2e8f0',
              fontSize: '13px',
              fontWeight: '700',
              color: '#64748b',
              direction: lang === 'ar' ? 'rtl' : 'ltr'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#d97706', fontWeight: '800' }}>{window.location.hostname || 'msoms.ai'}</span>
                <span>•</span>
                <span>{lang === 'ar' ? 'المؤلف: ' : 'Author: '}</span>
                <span style={{ color: '#0f172a' }}>{story.authorName || (lang === 'ar' ? 'مؤلف القصة' : 'Story Author')}</span>
              </div>
              <div>
                <span>{lang === 'ar' ? 'تاريخ النشر: ' : 'Date: '}</span>
                <span style={{ color: '#0f172a' }}>{formattedDate}</span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                height: '32px',
                padding: '0 16px',
                borderRadius: '8px',
                color: '#334155',
                fontWeight: '800',
                fontSize: '13px',
                fontFamily: "'Dubai', sans-serif"
              }}>
                <span style={{ display: 'inline-block', lineHeight: '1', marginTop: '-3px' }}>
                  {lang === 'ar' ? `الصفحة ${idx + 1} من ${slides.length}` : `Page ${idx + 1} of ${slides.length}`}
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}

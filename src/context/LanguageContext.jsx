import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  ar: {
    appName: 'قصص',
    appTagline: 'عالم الحكايات التفاعلية الذكية للأطفال',
    browseStories: 'تصفح القصص',
    generateStory: 'ابتكر قصة الآن 🎨✨',
    diceTooltip: 'فاجئني بقصة!',
    easterEggTitle: 'سر الكتاب المفتوح! 🔑✨',
    easterEggSub: 'مبادرة رائدة لتطوير تقنيات السرد القصصي بالذكاء الاصطناعي',
    easterEggBrand: 'msoms.ai 🚀 2026',
    easterEggHint: 'اضغط على شريط العلامة الحمراء على حافة الكتاب لكشف السر!',
    footerAbout: 'عن قصص',
    footerRules: 'قوانين المنصة',
    footerFeedback: 'الآراء والملاحظات',
    footerContact: 'اتصل بنا',
    footerCredit: 'مبادرة بواسطة @ msoms.ai - 2026',
    
    // Categories Page
    categoriesTitle: 'تصنيفات القصص العالمية',
    categoriesSub: 'اختر تصنيفك المفصل لاستكشاف عوالم سحرية ممتعة',
    storiesCountSuffix: 'قصة متاحة',
    
    // Stories List Page
    storiesListTitle: 'مكتبة القصص المنشورة',
    storiesListSub: 'مجموعة فريدة من القصص المصورة الجاهزة للقراءة والاستماع',
    readStoryBtn: 'اقرأ القصة',
    readTime: 'دقائق قراءة',
    slidesCount: 'مشاهد',
    completedBadge: 'مكتملة',
    unreadBadge: 'جديدة',
    newBadge: 'جديدة',

    // Wizard
    wizardTitle: 'صانع القصص التفاعلي (8 خطوات)',
    step1Title: 'الخطوة 1: عنوان القصة',
    step1Placeholder: 'اكتب اسم القصة الملهم هنا (مثال: مغامرة سليم والأرنب الفضائي)...',
    step2Title: 'الخطوة 2: اختر تصنيف القصة',
    step3Title: 'الخطوة 3: مصدر المحتوى',
    optUpload: 'رفع ملف PDF أو WORD',
    optPaste: 'لصق نص مباشر',
    optLink: 'رابط ملف أو موقع إلكتروني',
    step4Title: 'الخطوة 4: خطة الذكاء الاصطناعي والهيكل المقترح',
    step4Message: 'قام النظام بدراسة النص وإعداد خطة قصة تتكون من',
    step4Slides: 'مشاهد مصورة متسلسلة',
    acceptPlanBtn: 'موافقة والبدء في الإنشاء 🚀',
    step5Status: 'الخطوة 5: إنشاء مجلدات القصة في خادم STORIES...',
    step6Status: 'الخطوة 6: توليد رسومات المشاهد بالرسم الرصاصي (Pencil Illustrations)...',
    step7Status: 'الخطوة 7: توليد السرد الصوتي المتقن وحفظ البيانات...',
    step8Title: 'الخطوة 8: معاينة المسودة الأولى للقصة',
    step9Title: 'الخطوة 9: اتخاذ القرار',
    approveBtn: 'اعتماد ونشر القصة 🌟',
    rejectBtn: 'رفض وحذف كافة الملفات ❌',
    redoBtn: 'إعادة التفكير مع ملاحظات تعديل 🔄',
    redoCommentsPlaceholder: 'اكتب ملاحظاتك للتعديل (مثال: اجعل النهاية أكثر مرحاً)...',
    step10Title: 'نتيجة العملية',
    savedSuccessMsg: 'تم إنشاء القصة بنجاح وحفظها في المكتبة! 🎉',
    deletedMsg: 'تم إغلاق القصة وحذف كافة الملفات المرتبطة بنجاح.',
    regeneratingMsg: 'جاري إعادة معالجة وتوليد القصة بأسلوب جديد...',
    backToHomeBtn: 'العودة للصفحة الرئيسية',

    // Reader Page
    readerBackBtn: 'العودة للمكتبة',
    readAudioBtn: 'استمع للقصة 🎧',
    stopAudioBtn: 'إيقاف الصوت ⏹️',
    slideCounter: 'المشهد {x} من {y}',
    completionBar: 'نسبة الإنجاز',
    fastReaderToast: 'هون عليك! إقرأ بتمعن و استمتع!',
    storyCompletedConfetti: 'أحسنت! لقد أكملت قراءة القصة بنجاح! 🏆🌟',
    
    // Page Content Labels
    aboutPageTitle: 'عن منصة قصص (Qisas)',
    rulesPageTitle: 'قوانين وإرشادات المحتوى',
    feedbackPageTitle: 'شاركونا الآراء والتقييمات',
    contactPageTitle: 'تواصل معنا',
    // Story Quiz
    startQuizCtaTitle: 'اختبر فهمك ومعلوماتك حول القصة! 📝✨',
    startQuizCtaSub: 'خض تجربة تفاعلية مميزة مع 10 أسئلة ذكية تشمل أحداث القصة، قواعد اللغة، العبرة المستفادة، ومعاني الكلمات.',
    startQuizBtn: 'ابدأ اختبار القصة (10 أسئلة) 📝',
    retakeQuizBtn: 'إعادة الاختبار بأسئلة جديدة 🔄',
    previousScoreLabel: 'أعلى نتيجة سابقة:',
    quizModalTitle: 'اختبار القصة التفاعلي',
    quizQuestionProgress: 'السؤال {x} من {y}',
    quizPillStory: 'أحداث القصة',
    quizPillGrammar: 'قواعد ولغة',
    quizPillMoral: 'العبرة والقيم',
    quizPillVocab: 'معاني الكلمات',
    quizNextBtn: 'السؤال التالي',
    quizFinishBtn: 'عرض النتيجة النهائية 🏆',
    quizExplanationTitle: 'معلومة وفائدة:',
    quizLoadingText: 'جاري إعداد أسئلة القصة التفاعلية الممتعة...',
    quizScoreTitle: 'نتيجة الاختبار التفاعلي',
    quizScoreOutOf: 'من 10',
    quizTierLegendary: 'أسطوري! بطل القراءة المتفوق 🏆🌟',
    quizTierMaster: 'ممتاز جداً! فهم عميق للقصة واللغة 🌟',
    quizTierGood: 'أحسنت! أداء رائع وتركيز جميل 👏',
    quizTierKeepTrying: 'محاولة جيدة! واصل القراءة واستكشف المزيد 🌱',
    quizCategoryBreakdown: 'تفصيل النتيجة حسب المحاور:',
    quizReviewTitle: 'مراجعة الأسئلة والإجابات الصحيحة',
    quizReviewYourAnswer: 'إجابتك:',
    quizReviewCorrectAnswer: 'الإجابة الصحيحة:',
    quizBackToStory: 'العودة للقصة 📖',
    quizCloseConfirm: 'هل أنت متأكد من مغادرة الاختبار قبل إكماله؟',
    quizKeyboardHint: 'يمكنك أيضاً الاختيار بلوحة المفاتيح: الأرقام 1-4 أو المفاتيح A-D'
  },
  en: {
    appName: 'Qisas',
    appTagline: 'Smart Interactive World of Children Tales',
    browseStories: 'Browse Stories',
    generateStory: 'Create a Story Now 🎨✨',
    diceTooltip: 'Surprise me with a story!',
    easterEggTitle: 'Secret Book Unfolded! 🔑✨',
    easterEggSub: 'Pioneering Initiative for AI Interactive Storytelling',
    easterEggBrand: 'msoms.ai 🚀 2026',
    easterEggHint: 'Click the red ribbon bookmark on the book cover edge to open!',
    footerAbout: 'About Qisas',
    footerRules: 'Rules',
    footerFeedback: 'Feedback',
    footerContact: 'Contact Us',
    footerCredit: 'an initiative by @ msoms.ai - 2026',

    // Categories Page
    categoriesTitle: 'World Story Categories',
    categoriesSub: 'Select a category to explore magical worlds of wonder',
    storiesCountSuffix: 'stories available',

    // Stories List Page
    storiesListTitle: 'Published Story Library',
    storiesListSub: 'A curated collection of illustrated stories ready for reading & audio narration',
    readStoryBtn: 'Read Story',
    readTime: 'min read',
    slidesCount: 'scenes',
    completedBadge: 'Completed',
    unreadBadge: 'New',
    newBadge: 'New',

    // Wizard
    wizardTitle: 'Interactive Story Generator (8 Steps)',
    step1Title: 'Step 1: Story Name',
    step1Placeholder: 'Type your inspiring story title (e.g. Salim & The Space Rabbit)...',
    step2Title: 'Step 2: Select Story Category',
    step3Title: 'Step 3: Content Source',
    optUpload: 'Upload PDF or WORD file',
    optPaste: 'Paste direct text',
    optLink: 'Link to file or website',
    step4Title: 'Step 4: AI Plan & Story Structure',
    step4Message: 'The AI analyzed your text and prepared a story plan consisting of',
    step4Slides: 'illustrated scenes',
    acceptPlanBtn: 'Accept & Generate 🚀',
    step5Status: 'Step 5: Creating story folders in STORIES server directory...',
    step6Status: 'Step 6: Generating pencil illustrated scenes for each slide...',
    step7Status: 'Step 7: Generating voice narration audio files & database records...',
    step8Title: 'Step 8: First Draft Preview',
    step9Title: 'Step 9: Decision & Approval',
    approveBtn: 'Approve & Publish Story 🌟',
    rejectBtn: 'Reject & Delete Everything ❌',
    redoBtn: 'Redo with Modification Feedback 🔄',
    redoCommentsPlaceholder: 'Type feedback for modification (e.g., make the ending more humorous)...',
    step10Title: 'Process Output',
    savedSuccessMsg: 'Story successfully generated & saved to library! 🎉',
    deletedMsg: 'Story process cancelled and files deleted clean.',
    regeneratingMsg: 'Regenerating story based on your feedback...',
    backToHomeBtn: 'Return to Landing Page',

    // Reader Page
    readerBackBtn: 'Back to Library',
    readAudioBtn: 'Listen to Narration 🎧',
    stopAudioBtn: 'Stop Narration ⏹️',
    slideCounter: 'Slide {x} of {y}',
    completionBar: 'Completion Progress',
    fastReaderToast: 'Take it easy! Read carefully and enjoy!',
    storyCompletedConfetti: 'Well Done! You have completed reading the story! 🏆🌟',

    // Page Content Labels
    aboutPageTitle: 'About Qisas Platform',
    rulesPageTitle: 'Platform Rules & Safety Policy',
    feedbackPageTitle: 'Share Your Feedback',
    contactPageTitle: 'Contact Us',
    // Story Quiz
    startQuizCtaTitle: 'Test Your Knowledge & Comprehension! 📝✨',
    startQuizCtaSub: 'Take a fun interactive quiz with 10 smart questions covering story events, grammar, morals, and vocabulary.',
    startQuizBtn: 'Start Story Quiz (10 Questions) 📝',
    retakeQuizBtn: 'Retake Quiz with New Questions 🔄',
    previousScoreLabel: 'Previous best score:',
    quizModalTitle: 'Interactive Story Quiz',
    quizQuestionProgress: 'Question {x} of {y}',
    quizPillStory: 'Story Plot',
    quizPillGrammar: 'Grammar',
    quizPillMoral: 'Moral & Values',
    quizPillVocab: 'Vocabulary',
    quizNextBtn: 'Next Question',
    quizFinishBtn: 'View Final Score 🏆',
    quizExplanationTitle: 'Fun Fact / Explanation:',
    quizLoadingText: 'Preparing your fun interactive quiz questions...',
    quizScoreTitle: 'Quiz Final Result',
    quizScoreOutOf: 'out of 10',
    quizTierLegendary: 'Legendary! Outstanding Reading Master 🏆🌟',
    quizTierMaster: 'Brilliant! Deep understanding of story & language 🌟',
    quizTierGood: 'Great Job! Wonderful focus and effort 👏',
    quizTierKeepTrying: 'Good try! Keep reading and discover more secrets 🌱',
    quizCategoryBreakdown: 'Performance by Learning Pillars:',
    quizReviewTitle: 'Review Questions & Explanations',
    quizReviewYourAnswer: 'Your choice:',
    quizReviewCorrectAnswer: 'Correct answer:',
    quizBackToStory: 'Back to Story 📖',
    quizCloseConfirm: 'Are you sure you want to exit the quiz before finishing?',
    quizKeyboardHint: 'You can also press 1-4 or A-D keys to select'
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('system');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, dir, theme, toggleLanguage, toggleTheme, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

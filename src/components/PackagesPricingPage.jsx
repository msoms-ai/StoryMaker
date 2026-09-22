import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Check, Sparkles, CreditCard, ShieldCheck, Zap, BookOpen, Star, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Lock } from 'lucide-react';

const PACKAGES_CONFIG = [
  {
    id: 'pack_20',
    storiesCount: 20,
    price: 29,
    currency: 'AED',
    title: { ar: 'باقة الانطلاق', en: 'Starter Pack' },
    subtitle: { ar: '20 قصة تفاعلية متكاملة', en: '20 Full Interactive Stories' },
    badge: null,
    features: [
      { ar: 'توليد 20 قصة كاملة بالذكاء الاصطناعي', en: 'Generate 20 complete AI stories' },
      { ar: 'رسوم ملونة خشبية فائقة الدقة لكل مشهد', en: 'HD colored pencil illustrations for each scene' },
      { ar: 'سرد صوتي طبيعي معبر ونقي', en: 'Natural, expressive studio voice narration' },
      { ar: 'حفظ ونشر غير محدود في المكتبة', en: 'Unlimited saving & publishing in library' }
    ]
  },
  {
    id: 'pack_50',
    storiesCount: 50,
    price: 59,
    currency: 'AED',
    popular: true,
    title: { ar: 'باقة المعلم المبدع', en: 'Creative Teacher Pack' },
    subtitle: { ar: '50 قصة تفاعلية مميزة', en: '50 Premium Interactive Stories' },
    badge: { ar: 'الأكثر طلباً واختياراً ⭐', en: 'Most Popular Choice ⭐' },
    features: [
      { ar: 'توليد 50 قصة كاملة بالذكاء الاصطناعي', en: 'Generate 50 complete AI stories' },
      { ar: 'توفير أكثر من 40% مقارنة بالباقة الفردية', en: 'Save over 40% compared to basic tier' },
      { ar: 'أولوية معالجة فورية للصور والأصوات', en: 'Priority instant image & audio generation' },
      { ar: 'استخراج النصوص بدقة من الكتب وملفات PDF', en: 'Smart text extraction from books & PDFs' },
      { ar: 'لوحة استعراض وقراءة تفاعلية للطلاب', en: 'Interactive classroom reading viewer' }
    ]
  },
  {
    id: 'pack_100',
    storiesCount: 100,
    price: 99,
    currency: 'AED',
    title: { ar: 'باقة المدارس والمؤسسات', en: 'Schools & Pro Pack' },
    subtitle: { ar: '100 قصة للمناهج والأنشطة', en: '100 Stories for Classrooms' },
    badge: { ar: 'القيمة الفضلى للمدارس 🏫', en: 'Best Value for Schools 🏫' },
    features: [
      { ar: 'توليد 100 قصة تفاعلية بالكامل', en: 'Generate 100 full interactive stories' },
      { ar: 'أفضل سعر للقصة الواحدة (أقل من 1 درهم)', en: 'Best cost per story (< 1 AED per story)' },
      { ar: 'سرد صوتي عربي فصيح متوافق مع المناهج', en: 'Curriculum-aligned natural narration' },
      { ar: 'رسوم شخصيات متطابقة طوال مشاهد القصة', en: 'Strict character consistency across all scenes' },
      { ar: 'دعم فني مخصص للمؤسسات التعليمية', en: 'Dedicated educational institution support' }
    ]
  }
];

export default function PackagesPricingPage({ setCurrentView }) {
  const { user, token, updateProfile, openAuthModal } = useAuth();
  const { lang } = useLanguage();

  const [selectedPkg, setSelectedPkg] = useState(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // Payment Form State
  const [cardHolder, setCardHolder] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  const handleOpenCheckout = (pkg) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedPkg(pkg);
    setPaymentSuccess(null);
    setPaymentError('');
    setCheckoutModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/packages/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          cardHolder,
          cardNumber,
          expiryDate,
          cvv,
          lang
        })
      });

      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(data);
        if (data.user) updateProfile(data.user);
      } else {
        setPaymentError(data.message || 'فشلت عملية الدفع');
      }
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (val) => {
    const clean = val.replace(/\D/g, '').substring(0, 16);
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join(' ') : clean;
  };

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 py-12 ${lang === 'ar' ? 'font-arabic' : ''} space-y-12 animate-fade-in`}>
      
      {/* Marketing Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black">
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'ar' ? 'باقات تأليف القصص المخصصة للمعلمين والمدارس' : 'Story Creation Packages for Educators & Authors'}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
          {lang === 'ar' ? (
            <>أطلق خيال طلابك مع <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">قصص لا تنتهي</span></>
          ) : (
            <>Spark Young Imaginations with <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">Infinite Stories</span></>
          )}
        </h1>

        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          {lang === 'ar'
            ? 'اختر الباقة المناسبة لتحويل نصوصك ومناهجك المدرسية إلى قصص تفاعلية مصورة ومسجلة صوتياً بالكامل عبر أحدث نماذج الذكاء الاصطناعي.'
            : 'Select the ideal plan to transform your ideas and curriculum into illustrated, voice-narrated interactive stories powered by Gemini AI.'}
        </p>

        {user && (
          <div className="inline-block px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            {lang === 'ar' ? (
              <>رصيدك الحالي: <span className="text-amber-600 dark:text-amber-400 font-black text-sm">{user.role === 'Admin' ? '∞' : user.freeStoriesLeft}</span> قصة متاحة للتأليف</>
            ) : (
              <>Current Balance: <span className="text-amber-600 dark:text-amber-400 font-black text-sm">{user.role === 'Admin' ? '∞' : user.freeStoriesLeft}</span> stories available</>
            )}
          </div>
        )}
      </div>

      {/* 3 Pricing Packages Cards Grid */}
      <div className="grid md:grid-cols-3 gap-8 items-stretch">
        {PACKAGES_CONFIG.map((pkg) => {
          const badgeText = pkg.badge ? (typeof pkg.badge === 'object' ? (pkg.badge[lang] || pkg.badge.en) : pkg.badge) : null;
          return (
            <div
              key={pkg.id}
              className={`relative glass-panel rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl ${
                pkg.popular
                  ? 'border-2 border-amber-500 shadow-xl scale-105 bg-white dark:bg-slate-900'
                  : 'border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70'
              }`}
            >
              {badgeText && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs shadow-md whitespace-nowrap">
                  {badgeText}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{pkg.title[lang] || pkg.title.en}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">{pkg.subtitle[lang] || pkg.subtitle.en}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">{pkg.price}</span>
                  <span className="text-sm font-bold text-slate-500">{pkg.currency}</span>
                  <span className="text-xs text-slate-400 mr-auto">/ {lang === 'ar' ? 'دفعة واحدة' : 'one-time'}</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{lang === 'ar' ? `تأليف ${pkg.storiesCount} قصة جديدة بالكامل` : `Create ${pkg.storiesCount} brand-new stories`}</span>
                </div>

                {/* Features List */}
                <ul className="space-y-3 pt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {pkg.features.map((f, i) => {
                    const featureText = typeof f === 'object' ? (f[lang] || f.en) : f;
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{featureText}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleOpenCheckout(pkg)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-amber-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'شراء وتفعيل الرصيد الآن' : 'Purchase & Activate Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Badges */}
      <div className="grid sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center max-w-4xl mx-auto">
        <div className="space-y-1">
          <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {lang === 'ar' ? 'دفع آمن ومحمي' : 'Safe & Encrypted Checkout'}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'معاملات آمنة ومحمية وفق أعلى المعايير' : 'Simulated sandbox protected transactions'}
          </p>
        </div>
        <div className="space-y-1">
          <Zap className="w-6 h-6 text-amber-500 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {lang === 'ar' ? 'تفعيل فوري للرصيد' : 'Instant Activation'}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'تُضاف القصص فور إتمام العملية بدون انتظار' : 'Story credits are added immediately'}
          </p>
        </div>
        <div className="space-y-1">
          <Star className="w-6 h-6 text-indigo-500 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {lang === 'ar' ? 'جودة الذكاء الاصطناعي' : 'Gemini AI Quality'}
          </h4>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'أحدث نماذج Google Gemini للرسوم والأصوات' : 'State-of-the-art visual and voice storytelling'}
          </p>
        </div>
      </div>

      {/* CHECKOUT MODAL (Simulated Payment Flow) */}
      {checkoutModalOpen && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg p-8 rounded-3xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <span>{lang === 'ar' ? 'إتمام عملية الشراء' : 'Checkout & Order Summary'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ar' ? 'خطوة الدفع التجريبية الآمنة (Simulated Checkout)' : 'Secure Sandbox Payment Simulation'}
                </p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {paymentSuccess ? (
              /* Success Confirmation Screen */
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تمت إضافة الرصيد بنجاح! 🎉' : 'Payment Successful! 🎉'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {lang === 'ar' ? (
                    <>تم إضافة <span className="font-black text-amber-600">{paymentSuccess.storiesAdded} قصة</span> إلى حسابك، وأصبح رصيدك الإجمالي <span className="font-black text-emerald-600">{paymentSuccess.freeStoriesLeft} قصة</span>.</>
                  ) : (
                    <><span className="font-black text-amber-600">{paymentSuccess.storiesAdded} stories</span> added to your account. Your new balance is <span className="font-black text-emerald-600">{paymentSuccess.freeStoriesLeft} stories</span>.</>
                  )}
                </p>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-500">
                  {lang === 'ar' ? 'رقم المعاملة:' : 'Transaction ID:'} {paymentSuccess.transactionId}
                </div>
                <div className="pt-4 flex gap-3 justify-center">
                  <button
                    onClick={() => { setCheckoutModalOpen(false); setCurrentView('create'); }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-black text-sm shadow-lg"
                  >
                    {lang === 'ar' ? 'ابدأ في تأليف قصة جديدة الآن 🚀' : 'Start Creating Stories Now 🚀'}
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Form */
              <form onSubmit={handleProcessPayment} className="space-y-4">
                
                {/* Order Summary Box */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                      {selectedPkg.title[lang] || selectedPkg.title.en}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {lang === 'ar' ? `إضافة ${selectedPkg.storiesCount} قصة لحسابك` : `Add ${selectedPkg.storiesCount} stories to account`}
                    </p>
                  </div>
                  <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                    <span className="text-2xl font-black text-amber-600">{selectedPkg.price}</span>
                    <span className="text-xs font-bold text-slate-500 mx-1">{selectedPkg.currency}</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">
                    {paymentError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Ahmed Al-Mansoor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'ar' ? 'رقم بطاقة الدفع' : 'Card Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4111 2222 3333 4444"
                    maxLength={19}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                    </label>
                    <input
                      type="text"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {lang === 'ar' ? 'رمز الأمان (CVV)' : 'CVV'}
                    </label>
                    <input
                      type="password"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'ar' ? 'جاري معالجة الدفع وإرسال الإشعار...' : 'Processing Payment...'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {lang === 'ar'
                            ? `تأكيد الدفع (${selectedPkg.price} AED) وإضافة الرصيد`
                            : `Confirm Payment (${selectedPkg.price} AED) & Add Credits`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

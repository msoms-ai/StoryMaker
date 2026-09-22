import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Info, ShieldCheck, HeartHandshake, PhoneCall, ArrowRight, ArrowLeft, Send, CheckCircle2, BookOpen, Users, Sparkles, AlertTriangle } from 'lucide-react';

export function AboutPage({ setCurrentView }) {
  const { lang, t } = useLanguage();

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <button
        onClick={() => setCurrentView('landing')}
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-6 hover:underline"
      >
        {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {t('backToHomeBtn')}
      </button>

      <div className="glass-panel p-8 rounded-3xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Info className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {t('aboutPageTitle')}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === 'ar' ? 'أنشئ واستمتع بأروع القصص التفاعلية' : 'Create and enjoy wonderful interactive stories'}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
          {lang === 'ar' ? (
            <>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                منصة "قصص" (Qisas) هي منصة رائدة تهدف إلى إحداث ثورة في عالم أدب وقصص الأطفال والناشئة، باستخدام أحدث تقنيات الذكاء الاصطناعي التوليدي من @ msoms.ai.
              </p>
              <p>
                تجمع المنصة بين السرد القصصي المشوق، والرسومات التوضيحية بالقلم الرصاص (Pencil Sketching)، والسرد الصوتي الطبيعي الذكي لتوفير تجربة قراءة تفاعلية ممتعة وشاملة.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                "Qisas" is a pioneering interactive storytelling platform powered by generative AI from msoms.ai, designed to elevate children's and youth literature.
              </p>
              <p>
                The platform fuses engaging storytelling, evocative pencil-sketch illustrations, and expressive human-like speech synthesis into a rich, interactive educational experience.
              </p>
            </>
          )}
        </div>

        {/* Live Platform Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-center">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-black text-slate-900 dark:text-white">1,250+</div>
            <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'قصة منشورة' : 'Stories Published'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
            <div className="text-2xl font-black text-slate-900 dark:text-white">45,000+</div>
            <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'قارئ نشط' : 'Active Readers'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            <div className="text-2xl font-black text-slate-900 dark:text-white">8</div>
            <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'تصنيفات عالمية' : 'Curated Categories'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <div className="text-2xl font-black text-slate-900 dark:text-white">2</div>
            <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'لغتان (عربي/إنجليزي)' : 'Languages (AR/EN)'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RulesPage({ setCurrentView }) {
  const { lang, t } = useLanguage();

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <button
        onClick={() => setCurrentView('landing')}
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-6 hover:underline"
      >
        {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {t('backToHomeBtn')}
      </button>

      <div className="glass-panel p-8 rounded-3xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {t('rulesPageTitle')}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === 'ar' ? 'معايير السلامة والأمان للأطفال واليافعين' : 'Safety & community guidelines for young minds'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
              {lang === 'ar'
                ? 'منصة قصص مصممة خصيصاً للأطفال والناشئة حتى عمر 15 عاماً. يُرجى الالتزام التام بالإرشادات التالية أثناء إنشاء أو تحميل القصص.'
                : 'Qisas is strictly dedicated to children and adolescents up to 15 years old. Please adhere to the following guidelines when authoring or uploading story materials.'}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                {lang === 'ar' ? 'الفئة العمرية واللغات' : 'Target Age & Languages'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {lang === 'ar'
                  ? 'المنصة مخصصة للأعمار حتى 15 سنة فقط، باللغتين العربية (RTL) والإنجليزية (LTR).'
                  : 'The platform serves ages up to 15 years, fully supporting both Arabic (RTL) and English (LTR).'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                {lang === 'ar' ? 'صيغ الملفات المقبولة' : 'Accepted Source Formats'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {lang === 'ar'
                  ? 'يُسمح فقط بإدخال النصوص المباشرة، أو تحميل ملفات بصيغة PDF و WORD، أو روابط المواقع الموثوقة.'
                  : 'We accept direct text input, PDF and Word documents, or links to trusted online reading sources.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 space-y-2 sm:col-span-2">
              <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                {lang === 'ar' ? 'حظر المحتوى المخل والمخالف' : 'Prohibited Content & Moderation'}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {lang === 'ar'
                  ? 'يُمنع منعاً باتاً رفع أو إنشاء أي نصوص تحتوي على مشاهد غير أخلاقية، إباحية، عنف، كراهية، أو وثائق غير قانونية. يتم فحص وتصفية النصوص آلياً وبدقة.'
                  : 'All violent, offensive, discriminatory, or inappropriate adult content is strictly prohibited. Automated AI filters scan and moderate all story plans and texts.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedbackPage({ setCurrentView }) {
  const { lang, t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', type: 'suggestion', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={`max-w-3xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <button
        onClick={() => setCurrentView('landing')}
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-6 hover:underline"
      >
        {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {t('backToHomeBtn')}
      </button>

      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {t('feedbackPageTitle')}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === 'ar' ? 'أرسل ملاحظاتك وشراكات المدارس إلى' : 'Send feedback and school partnerships to'}{' '}
              <span className="font-mono text-indigo-500">feedback@msoms.ai</span>
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {lang === 'ar' ? 'شامخون باقتراحاتكم!' : 'Thank you for your feedback!'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {lang === 'ar'
                ? 'تم إرسال رسالتكم بنجاح إلى فريق feedback@msoms.ai وسنتواصل معكم قريباً.'
                : 'Your message has been sent to feedback@msoms.ai. Our team will get back to you shortly.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'الاسم الكريم' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'ar' ? 'اكتب اسمك هنا...' : 'Enter your name...'}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="example@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'نوع الرسالة' : 'Feedback Category'}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              >
                <option value="suggestion">{lang === 'ar' ? 'اقتراح وتطوير' : 'Feature Suggestion'}</option>
                <option value="school">{lang === 'ar' ? 'تعاون وشراكة مدارس' : 'School Partnership'}</option>
                <option value="general">{lang === 'ar' ? 'ملاحظات عامة' : 'General Inquiries'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'نص الملاحظة أو الاقتراح' : 'Your Message'}
              </label>
              <textarea
                rows="4"
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'ar' ? 'اكتب اقتراحك بالتفصيل...' : 'Describe your suggestion or feedback in detail...'}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>{lang === 'ar' ? 'إرسال إلى feedback@msoms.ai' : 'Send to feedback@msoms.ai'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function ContactPage({ setCurrentView }) {
  const { lang, t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className={`max-w-3xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <button
        onClick={() => setCurrentView('landing')}
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-6 hover:underline"
      >
        {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {t('backToHomeBtn')}
      </button>

      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <PhoneCall className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {t('contactPageTitle')}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === 'ar' ? 'للإعلانات والاستفسارات التجارية:' : 'For sponsorships & commercial inquiries:'}{' '}
              <span className="font-mono text-amber-500">contact_us@msoms.ai</span>
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {lang === 'ar' ? 'تم استلام طلبكم!' : 'Message Received!'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {lang === 'ar'
                ? 'سوف يقدم فريق الإعلانات والدعم في contact_us@msoms.ai الرد في أقرب وقت.'
                : 'Our sponsorship and technical support team at contact_us@msoms.ai will reach back out soon.'}
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'الجهة / اسم التواصل' : 'Organization / Contact Name'}
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'ar' ? 'اسم الشركة أو المؤسسة...' : 'Company or institution name...'}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني الرسمي' : 'Official Email'}
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'نوع الاستفسار' : 'Inquiry Type'}
              </label>
              <select className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold">
                <option value="ads">{lang === 'ar' ? 'حملات إعلانية وتغطية' : 'Advertising & Sponsorship'}</option>
                <option value="press">{lang === 'ar' ? 'صحافة وإعلام' : 'Press & Media'}</option>
                <option value="other">{lang === 'ar' ? 'استفسار عام' : 'General Inquiry'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                {lang === 'ar' ? 'تفاصيل الرسالة' : 'Message Details'}
              </label>
              <textarea
                rows="4"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={lang === 'ar' ? 'اكتب تفاصيل الاستفسار...' : 'Provide details about your inquiry...'}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>{lang === 'ar' ? 'إرسال إلى contact_us@msoms.ai' : 'Send to contact_us@msoms.ai'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

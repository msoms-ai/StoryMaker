import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { HelpCircle, Book, PenTool, ShieldCheck, Mail } from 'lucide-react';

export default function HelpPage() {
  const { lang, dir } = useLanguage();

  const content = {
    ar: {
      title: 'مركز المساعدة',
      subtitle: 'كيف يمكننا مساعدتك اليوم؟',
      faqs: [
        { q: 'كيف أبدأ بصنع قصة؟', a: 'انقر على "توليد قصة" في الصفحة الرئيسية وابدأ بكتابة فكرتك، وسيقوم الذكاء الاصطناعي بالباقي.' },
        { q: 'هل يمكنني قراءة القصص مجاناً؟', a: 'نعم! يمكنك قراءة العديد من القصص التي ينشرها المجتمع مجاناً بالكامل.' },
        { q: 'كيف أحصل على المزيد من القصص المجانية؟', a: 'يمكنك شراء باقات القصص من خلال صفحة الباقات الخاصة بك.' }
      ],
      howTo: [
        { title: 'كتابة قصة', desc: 'استخدم أداة توليد القصص الخاصة بنا لإنشاء قصص مصورة مع أصوات.' },
        { title: 'إدارة القصص', desc: 'يمكنك من خلال لوحة التحكم تعديل وحذف القصص الخاصة بك.' }
      ],
      contact: 'للمزيد من الاستفسارات، يرجى التواصل معنا عبر support@msoms.ai'
    },
    en: {
      title: 'Help Center',
      subtitle: 'How can we help you today?',
      faqs: [
        { q: 'How do I start making a story?', a: 'Click "Generate Story" on the homepage and type your idea. The AI will do the rest.' },
        { q: 'Can I read stories for free?', a: 'Yes! You can read many stories published by the community completely for free.' },
        { q: 'How do I get more free stories?', a: 'You can purchase story packages through the Packages page.' }
      ],
      howTo: [
        { title: 'Writing a Story', desc: 'Use our story generation tool to create illustrated stories with voices.' },
        { title: 'Managing Stories', desc: 'You can edit or delete your stories from your dashboard.' }
      ],
      contact: 'For more inquiries, please contact us at support@msoms.ai'
    }
  };

  const currentContent = content[lang];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <HelpCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">{currentContent.title}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">{currentContent.subtitle}</p>
      </div>

      <div className="space-y-8">
        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Book className="w-6 h-6 text-indigo-500" />
            {lang === 'ar' ? 'الأسئلة الشائعة (FAQ)' : 'Frequently Asked Questions (FAQ)'}
          </h2>
          <div className="space-y-4">
            {currentContent.faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{faq.q}</h3>
                <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <PenTool className="w-6 h-6 text-amber-500" />
            {lang === 'ar' ? 'كيفية الاستخدام' : 'How-Tos'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentContent.howTo.map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center pt-8">
          <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-5 h-5" />
            <span>{currentContent.contact}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

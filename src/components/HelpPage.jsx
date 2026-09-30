import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { HelpCircle, Book, PenTool, ShieldCheck, Mail, Image, Mic, Layout, Sparkles } from 'lucide-react';

export default function HelpPage() {
  const { lang } = useLanguage();

  const content = {
    ar: {
      title: 'مركز المساعدة',
      subtitle: 'دليل شامل لاستخدام منصة صانع القصص',
      sections: [
        {
          title: 'الصفحة الرئيسية',
          icon: <Layout className="w-6 h-6 text-emerald-500" />,
          items: [
            { q: 'ابدأ بصنع قصة', a: 'انقر على الزر الرئيسي الضخم في وسط الشاشة للبدء بإبداع قصتك.' },
            { q: 'اقرأ قصة عشوائية', a: 'انقر على الزر الفرعي لتنتقل مباشرة لقراءة قصة ممتعة من إبداع المجتمع.' },
            { q: 'الإحصائيات', a: 'في أسفل الصفحة، يمكنك رؤية العدد الإجمالي للقصص، الشرائح، والمستخدمين على المنصة.' }
          ]
        },
        {
          title: 'كيف تصنع قصة (Make a Story)',
          icon: <Sparkles className="w-6 h-6 text-indigo-500" />,
          items: [
            { q: 'الخطوة 1: الفكرة والشخصيات', a: 'ابدأ باختيار خيار "اصنع قصة" (Make a Story). سيظهر لك نموذج مفصل. املأ عنوان القصة، الفئة، وقم بإضافة شخصياتك (الاسم، الجنس، العمر، المظهر الخارجي).' },
            { q: 'الخطوة 2: حبكة القصة', a: 'حدد الفكرة الرئيسية، مكان وزمان القصة، العبرة المستفادة، والمستوى اللغوي. كل حقل يحتوي على علامة تعجب (i) لتقديم أمثلة ومساعدة.' },
            { q: 'الخطوة 3: التوليد', a: 'بعد ملء البيانات، انقر على زر التوليد وسيقوم الذكاء الاصطناعي بكتابة القصة بناءً على معاييرك الدقيقة.' },
            { q: 'الخطوة 4: المراجعة والتعديل', a: 'اقرأ النص المولد. يمكنك النقر على "تعديل المعطيات" للعودة أو "تحويل النص إلى صور مسموعة" للمتابعة.' }
          ]
        },
        {
          title: 'تحويل قصة (Convert a Story)',
          icon: <PenTool className="w-6 h-6 text-amber-500" />,
          items: [
            { q: 'الخطوة 1: لصق أو رفع نص', a: 'إذا كان لديك نص جاهز، اختر "تحويل قصة". يمكنك لصق النص، رفع ملف PDF، أو إدخال رابط موقع.' },
            { q: 'الخطوة 2: تحليل النص', a: 'سيقوم الذكاء الاصطناعي بتقسيم النص إلى مشاهد واستخراج الشخصيات.' },
            { q: 'الخطوة 3: الصور والصوت', a: 'اختر نمط الرسم (أنمي، مائي، إلخ) وصوت الراوي (ذكر، أنثى). ستبدأ عملية تحويل كل مشهد إلى صورة احترافية وصوت.' }
          ]
        },
        {
          title: 'قراءة القصص',
          icon: <Book className="w-6 h-6 text-blue-500" />,
          items: [
            { q: 'المكتبة الخاصة', a: 'يمكنك الوصول إلى كل قصصك من خلال صفحة "قصصي".' },
            { q: 'تتبع التقدم', a: 'يتم حفظ تقدمك تلقائياً. إذا لم تكمل القصة، يمكنك العودة في أي وقت لإكمالها من حيث توقفت.' },
            { q: 'الاستماع التلقائي', a: 'أثناء القراءة، يتم قراءة النص بصوت عالٍ مع تظليل الكلمات.' }
          ]
        }
      ],
      faqs: [
        { q: 'هل يمكنني تغيير نمط الرسم بعد توليد القصة؟', a: 'حالياً يجب اختيار نمط الرسم قبل بدء التوليد النهائي للصور.' },
        { q: 'ما هي الملفات المدعومة للرفع؟', a: 'نحن ندعم ملفات PDF وملفات النصوص العادية (TXT).' }
      ],
      contact: 'للمزيد من الاستفسارات، يرجى التواصل معنا عبر support@msoms.ai'
    },
    en: {
      title: 'Help Center',
      subtitle: 'Comprehensive guide to using the StoryMaker platform',
      sections: [
        {
          title: 'Homepage',
          icon: <Layout className="w-6 h-6 text-emerald-500" />,
          items: [
            { q: 'Start a Story', a: 'Click the massive primary button in the center of the screen to start creating.' },
            { q: 'Read a Random Story', a: 'Click the secondary button to dive straight into a fun, community-created story.' },
            { q: 'Statistics', a: 'At the bottom of the page, you can see total generated stories, slides, and users.' }
          ]
        },
        {
          title: 'How to Make a Story (Make a Story)',
          icon: <Sparkles className="w-6 h-6 text-indigo-500" />,
          items: [
            { q: 'Step 1: Idea & Characters', a: 'Select "Make a Story". Fill out the detailed form with your Title, Category, and Character details (Name, Gender, Age, Visuals).' },
            { q: 'Step 2: The Plot', a: 'Define the main idea, location, time period, moral, and language difficulty. Hover over the (i) icon on any field for tips!' },
            { q: 'Step 3: AI Generation', a: 'Click generate and our AI will write a custom story matching all your exact parameters.' },
            { q: 'Step 4: Review & Modify', a: 'Read the generated text. You can "Modify Story" to go back, or "Convert Story" to proceed to images and voice.' }
          ]
        },
        {
          title: 'Converting a Story (Convert a Story)',
          icon: <PenTool className="w-6 h-6 text-amber-500" />,
          items: [
            { q: 'Step 1: Paste or Upload Text', a: 'If you already have text, choose "Convert a Story". You can paste text, upload a PDF, or provide a URL.' },
            { q: 'Step 2: AI Analysis', a: 'The AI will slice your text into scenes and extract characters.' },
            { q: 'Step 3: Images & Voice', a: 'Select an Art Style (Anime, Watercolor, etc.) and a Narrator (Male/Female). The AI will generate slides and voiceovers.' }
          ]
        },
        {
          title: 'Reading Stories',
          icon: <Book className="w-6 h-6 text-blue-500" />,
          items: [
            { q: 'Your Library', a: 'Access all your generated stories from the "My Stories" page.' },
            { q: 'Progress Tracking', a: 'Your reading progress is saved automatically. You can return anytime to finish a story where you left off.' },
            { q: 'Audio Playback', a: 'While reading, the text is narrated aloud with word-by-word highlighting.' }
          ]
        }
      ],
      faqs: [
        { q: 'Can I change the art style after generating?', a: 'Currently, you must select the art style before starting the final image generation.' },
        { q: 'What files can I upload?', a: 'We support PDF and plain text (TXT) files.' }
      ],
      contact: 'For more inquiries, please contact us at support@msoms.ai'
    }
  };

  const currentContent = content[lang];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <HelpCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className={`text-4xl font-black text-slate-900 dark:text-white mb-2 ${lang === 'ar' ? 'font-arabic' : ''}`}>{currentContent.title}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">{currentContent.subtitle}</p>
      </div>

      <div className="space-y-8">
        {currentContent.sections.map((section, idx) => (
          <section key={idx} className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6 border-b pb-4 dark:border-slate-700">
              {section.icon}
              <h2 className={`text-2xl font-bold text-slate-800 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>{section.title}</h2>
            </div>
            <div className="space-y-4">
              {section.items.map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{item.q}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-6 border-b pb-4 dark:border-slate-700">
            <HelpCircle className="w-6 h-6 text-blue-500" />
            <h2 className={`text-2xl font-bold text-slate-800 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQs'}</h2>
          </div>
          <div className="space-y-4">
            {currentContent.faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{faq.q}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center gap-4">
          <Mail className="w-8 h-8 text-indigo-500" />
          <p className="text-slate-700 dark:text-slate-300 font-medium">{currentContent.contact}</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, ArrowRight, ArrowLeft, RefreshCw, BookOpen } from 'lucide-react';
import { getCategoryIconComponent } from '../categoryIcons';

const COLOR_GRADIENTS = [
  'from-amber-500 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-blue-600 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-orange-500',
  'from-indigo-600 to-purple-600',
  'from-cyan-600 to-blue-600',
  'from-amber-600 to-yellow-600',
  'from-teal-600 to-emerald-600',
  'from-fuchsia-600 to-rose-600'
];

export default function StoryCategoriesPage({ setCurrentView, setSelectedCategoryFilter }) {
  const { lang, t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = () => {
    setLoading(true);
    fetch(`/api/categories?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load categories:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryClick = (catId) => {
    setSelectedCategoryFilter(catId);
    setCurrentView('stories-list');
  };

  const totalPublishedStories = categories.reduce(
    (sum, cat) => sum + (cat.publishedStoriesCount !== undefined ? cat.publishedStoriesCount : (cat.storiesCount || 0)),
    0
  );

  const activeCategories = categories.filter(
    (cat) => (cat.publishedStoriesCount !== undefined ? cat.publishedStoriesCount : (cat.storiesCount || 0)) > 0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setCurrentView('landing')}
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t('backToHomeBtn')}
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            onClick={fetchCategories}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            title={lang === 'ar' ? 'تحديث قائمة التصنيفات' : 'Refresh categories list'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        <h2 className={`text-3xl sm:text-5xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''} mb-3`}>
          {t('categoriesTitle')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 font-medium max-w-xl">
          {t('categoriesSub')}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Sparkles className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
        </div>
      ) : activeCategories.length === 0 ? (
        <div className={`glass-panel p-12 rounded-3xl text-center space-y-4 ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'لا توجد تصنيفات تحتوي على قصص منشورة حتى الآن' : 'No categories currently contain published stories'}
          </h3>
          <p className="text-sm text-slate-500">
            {lang === 'ar' ? 'يمكنك ابتكار وتأليف قصة جديدة ونشرها في أي تصنيف الآن' : 'You can create a new story and publish it to any category now'}
          </p>
          <button
            onClick={() => setCurrentView('wizard')}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors"
          >
            {lang === 'ar' ? 'ابتكر قصة الآن' : 'Create a Story Now'}
          </button>
        </div>
      ) : (
        /* 3D Hovering Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 perspective-1000">
          
          {/* Card 0: "All Stories" (جميع القصص) */}
          <div
            onClick={() => handleCategoryClick('ALL')}
            className="group relative p-6 rounded-3xl glass-panel border border-amber-500/30 dark:border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent cursor-pointer transform hover:-translate-y-2 hover:rotate-1 hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center justify-between"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 group-hover:scale-110 transition-transform mb-4">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-1 mb-4">
              <h3 className={`text-xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''} group-hover:text-amber-500 transition-colors`}>
                {lang === 'ar' ? 'جميع القصص' : 'All Stories'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {lang === 'ar' ? 'تصفح كل القصص المنشورة' : 'Browse all published stories'}
              </p>
            </div>

            <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
              {totalPublishedStories} {t('storiesCountSuffix')}
            </div>
          </div>

          {/* Dynamic Categories (Only categories with stories) */}
          {activeCategories.map((cat, idx) => {
            const IconComp = getCategoryIconComponent(cat.icon);
            const gradient = COLOR_GRADIENTS[idx % COLOR_GRADIENTS.length];
            const catName = cat.name?.[lang] || cat.name?.ar || cat.name?.en || cat.name || cat.id;
            const publishedCount = cat.publishedStoriesCount !== undefined ? cat.publishedStoriesCount : (cat.storiesCount || 0);

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="group relative p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 cursor-pointer transform hover:-translate-y-2 hover:rotate-1 hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center justify-between"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-xl shadow-slate-900/10 group-hover:scale-110 transition-transform mb-4`}>
                  <IconComp className="w-10 h-10" />
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className={`text-xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''} group-hover:text-amber-500 transition-colors`}>
                    {catName}
                  </h3>
                  {cat.name?.en && lang === 'ar' && (
                    <p className="text-[11px] text-slate-400 font-mono">{cat.name.en}</p>
                  )}
                  {cat.name?.ar && lang === 'en' && (
                    <p className="text-[11px] text-slate-400 font-arabic">{cat.name.ar}</p>
                  )}
                </div>

                <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                  {publishedCount} {t('storiesCountSuffix')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Clock, Layers, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Filter, User } from 'lucide-react';
import { getCategoryIconComponent } from '../categoryIcons';

export default function GeneratedStoriesPage({ setCurrentView, selectedCategoryFilter, setSelectedStoryId, setViewingUserId }) {
  const { lang, t } = useLanguage();
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState(selectedCategoryFilter || 'ALL');
  const [loading, setLoading] = useState(true);

  // Load all dynamic categories
  useEffect(() => {
    fetch(`/api/categories?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.warn('Failed to load categories in catalog:', err));
  }, []);

  // Update activeFilter if prop changes
  useEffect(() => {
    if (selectedCategoryFilter) {
      setActiveFilter(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  // Load stories based on active category filter
  useEffect(() => {
    setLoading(true);
    let url = '/api/stories';
    if (activeFilter && activeFilter !== 'ALL') {
      url += `?category=${encodeURIComponent(activeFilter)}`;
    }
    fetch(url, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStories(data.stories);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeFilter]);

  const handleStorySelect = (storyId) => {
    setSelectedStoryId(storyId);
    setCurrentView('reader');
  };

  const totalPublishedCount = categories.reduce(
    (sum, c) => sum + (c.publishedStoriesCount !== undefined ? c.publishedStoriesCount : (c.storiesCount || 0)),
    0
  );

  const activeCategories = categories.filter(
    (cat) => (cat.publishedStoriesCount !== undefined ? cat.publishedStoriesCount : (cat.storiesCount || 0)) > 0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => setCurrentView('categories')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 mb-2 hover:underline"
          >
            {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t('categoriesTitle')}</span>
          </button>
          <h2 className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
            {t('storiesListTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {t('storiesListSub')}
          </p>
        </div>

        <button
          onClick={() => setCurrentView('wizard')}
          className={`px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-2 ${
            lang === 'ar' ? 'font-arabic' : ''
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('generateStory')}</span>
        </button>
      </div>

    {/* Category Pills Filter Bar */}
    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
      {/* All Stories Pill */}
      <button
        type="button"
        onClick={() => setActiveFilter('ALL')}
        className={`shrink-0 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
          activeFilter === 'ALL'
            ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105 ring-2 ring-amber-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{lang === 'ar' ? 'جميع القصص' : 'All Stories'}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
          activeFilter === 'ALL' ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          {totalPublishedCount}
        </span>
      </button>

      {/* Categories Pills */}
      {activeCategories.map((cat) => {
        const CatIcon = getCategoryIconComponent(cat.icon);
        const isSelected = activeFilter === cat.id;
        const catName = cat.name?.[lang] || cat.name?.ar || cat.name?.en || cat.name || cat.id;
        const pubCount = cat.publishedStoriesCount !== undefined ? cat.publishedStoriesCount : (cat.storiesCount || 0);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveFilter(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
              isSelected
                ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105 ring-2 ring-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CatIcon className="w-3.5 h-3.5" />
            <span>{catName}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {pubCount}
            </span>
          </button>
        );
      })}
    </div>

      {loading ? (
        <div className="p-12 text-center">
          <Sparkles className="w-10 h-10 text-amber-500 mx-auto animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className={`glass-panel p-12 rounded-3xl text-center space-y-4 ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold">
            {lang === 'ar' ? 'لا توجد قصص منشورة في هذا التصنيف حتى الآن' : 'No published stories found in this category yet'}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {activeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-bold text-sm transition-colors"
              >
                {lang === 'ar' ? 'عرض جميع القصص' : 'View All Stories'}
              </button>
            )}
            <button
              onClick={() => setCurrentView('wizard')}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors"
            >
              {lang === 'ar' ? 'ابتكر قصة الآن' : 'Create a Story Now'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {stories.map((story) => {
            const isCompleted = story.readProgress?.completed;
            const coverImage = story.slides?.[0]?.imageFile;
            const storyTitle = (typeof story.name === 'object' && story.name !== null
              ? (story.name[lang] || story.name.ar || story.name.en)
              : story.name) || story.title || (lang === 'ar' ? 'قصة مصورة' : 'Story');

            return (
              <div
                key={story.id}
                onClick={() => handleStorySelect(story.id)}
                className="group glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image Cover Preview */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={storyTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}

                  {/* Read / Unread Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isCompleted ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('completedBadge')}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md">
                        {t('unreadBadge')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-6 space-y-4">
                  {/* Category Tag */}
                  {story.category && (() => {
                    const foundCat = categories.find(c => c.id === story.category);
                    const CatIcon = foundCat ? getCategoryIconComponent(foundCat.icon) : BookOpen;
                    const catLabel = foundCat ? (foundCat.name?.[lang] || foundCat.name?.ar || foundCat.name?.en) : story.category;
                    return (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{catLabel}</span>
                      </div>
                    );
                  })()}

                  <h3 className="text-xl font-black text-slate-900 dark:text-white font-story line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">
                    {storyTitle}
                  </h3>

                  {story.authorName && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const id = story.authorId || story.userId;
                        if (id && setViewingUserId) {
                          setViewingUserId(id);
                          setCurrentView('publicProfile');
                        }
                      }}
                      className={`flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 font-bold z-10 relative ${
                        (story.authorId || story.userId) ? 'cursor-pointer hover:text-amber-500 transition-colors' : ''
                      }`}
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span className={(story.authorId || story.userId) ? 'hover:underline' : ''}>
                        {story.authorName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Layers className="w-4 h-4 text-amber-500" />
                      {story.slidesCount} {t('slidesCount')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      {story.readTimeMinutes} {t('readTime')}
                    </span>
                  </div>

                  <button className="w-full py-3 rounded-xl bg-amber-500 group-hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {t('readStoryBtn')}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

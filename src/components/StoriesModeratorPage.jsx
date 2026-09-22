import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Clock,
  User,
  ShieldCheck,
  Compass,
  AlertCircle
} from 'lucide-react';
import { getCategoryIconComponent } from '../categoryIcons';

export default function StoriesModeratorPage({ setCurrentView, setSelectedStoryId }) {
  const { user, token, isAdmin, isStoryMaker } = useAuth();
  const { lang, t } = useLanguage();

  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'published' | 'draft'
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Deletion Modal State
  const [storyToDelete, setStoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastNotice, setToastNotice] = useState({ type: '', text: '' });

  useEffect(() => {
    if (token && (isAdmin || isStoryMaker)) {
      fetchModerationStories();
    }
  }, [token, isAdmin, isStoryMaker]);

  const fetchModerationStories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/moderation/stories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stories) {
        setStories(data.stories);
      } else {
        showToast('error', data.message || 'فشل تحميل القصص');
      }

      const catRes = await fetch(`/api/categories?t=${Date.now()}`, { cache: 'no-store' });
      const catData = await catRes.json();
      if (catData.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, text) => {
    setToastNotice({ type, text });
    setTimeout(() => {
      setToastNotice({ type: '', text: '' });
    }, 4500);
  };

  // Toggle Active / Inactive (Published / Draft)
  const handleToggleStatus = async (story) => {
    setActionLoadingId(story.id);
    try {
      const res = await fetch(`/api/moderation/stories/${story.id}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStories((prev) =>
          prev.map((s) => (s.id === story.id ? { ...s, status: data.status } : s))
        );
        showToast('success', data.message);
      } else {
        showToast('error', data.message);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Execute Permanent Deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/moderation/stories/${storyToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStories((prev) => prev.filter((s) => s.id !== storyToDelete.id));
        showToast('success', data.message);
        setStoryToDelete(null);
      } else {
        showToast('error', data.message);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreviewStory = (storyId) => {
    if (setSelectedStoryId) {
      setSelectedStoryId(storyId);
    }
    setCurrentView('reader');
  };

  // Access Control Guard
  if (!isAdmin && !isStoryMaker) {
    return (
      <div className={`max-w-md mx-auto my-16 p-8 text-center glass-panel rounded-3xl ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          {lang === 'ar' ? 'غير مصرح بالدخول' : 'Access Denied'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'ar'
            ? 'هذه الصفحة مخصصة لمدير النظام (Admin) وصنّاع القصص (Story Makers) فقط.'
            : 'This page is restricted to Administrators and Story Makers only.'}
        </p>
        <button
          onClick={() => setCurrentView('landing')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md"
        >
          {lang === 'ar' ? 'العودة للرئيسية' : 'Return to Home'}
        </button>
      </div>
    );
  }

  // Filter computation
  const filteredStories = stories.filter((story) => {
    const titleAr = story.name?.ar || '';
    const titleEn = story.name?.en || '';
    const author = story.authorName || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      titleAr.toLowerCase().includes(query) ||
      titleEn.toLowerCase().includes(query) ||
      author.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'published' && story.status === 'published') ||
      (statusFilter === 'draft' && story.status !== 'published');

    const matchesCategory =
      categoryFilter === 'ALL' || story.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPublished = stories.filter((s) => s.status === 'published').length;
  const totalDraft = stories.filter((s) => s.status !== 'published').length;
  const totalSlides = stories.reduce((acc, s) => acc + (s.slidesCount || s.slides?.length || 0), 0);

  // Extract unique categories from stories
  const availableCategories = Array.from(new Set(stories.map((s) => s.category).filter(Boolean)));

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''} space-y-8 animate-fade-in`}>
      
      {/* Toast Notification */}
      {toastNotice.text && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl text-sm font-black shadow-2xl flex items-center gap-3 transition-all ${
            toastNotice.type === 'success'
              ? 'bg-emerald-600 text-white border-2 border-emerald-300'
              : 'bg-rose-600 text-white border-2 border-rose-300'
          }`}
        >
          {toastNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-300" />
          )}
          <span>{toastNotice.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'لوحة الإشراف والتحكم بالقصص' : 'Stories Moderation & Oversight'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-amber-500" />
            <span>{lang === 'ar' ? 'مشرف القصص (Stories Moderator)' : 'Stories Moderator'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? (lang === 'ar'
                  ? 'إدارة كافة القصص المنشورة والمسودات في المنصة، تفعيلها أو إلغاء تفعيلها، وحذفها نهائياً مع كافة الملفات المرتبطة.'
                  : 'Manage all published stories and drafts, toggle visibility, and permanently delete with all associated files.')
              : (lang === 'ar'
                  ? 'إدارة القصص التي قمت بتأليفها، التحكم بحالة النشر (تفعيل / إلغاء تفعيل)، وحذفها نهائياً.'
                  : 'Manage your authored stories, toggle publication status, and permanently delete if needed.')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentView('wizard')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <span>{lang === 'ar' ? 'ابتكار قصة جديدة' : 'Create New Story'}</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={fetchModerationStories}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={lang === 'ar' ? 'تحديث القائمة' : 'Refresh List'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'إجمالي القصص' : 'Total Stories'}</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stories.length}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">
            {lang === 'ar' ? 'في سجل النظام' : 'in database'}
          </span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {lang === 'ar' ? 'قصص مفعلة (نشطة)' : 'Active (Published)'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {totalPublished}
          </div>
          <span className="text-[11px] text-emerald-600/70 block font-medium">
            {lang === 'ar' ? 'معروضة للمستخدمين' : 'live in library'}
          </span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {lang === 'ar' ? 'قصص معطلة (مسودة)' : 'Draft (Inactive)'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {totalDraft}
          </div>
          <span className="text-[11px] text-amber-600/70 block font-medium">
            {lang === 'ar' ? 'مخفية من التصفح العام' : 'hidden from public'}
          </span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-indigo-500">
            {lang === 'ar' ? 'إجمالي المشاهد والرسومات' : 'Scenes & Media'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {totalSlides}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">
            {lang === 'ar' ? 'مشهد ورسمة ومقطع صوتي' : 'illustrated scenes & voice'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className={`w-4 h-4 text-slate-400 absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث بعنوان القصة أو اسم المؤلف...' : 'Search by story title or author...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500`}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
            >
              <option value="ALL">{lang === 'ar' ? 'جميع الحالات (الكل)' : 'All Statuses'}</option>
              <option value="published">{lang === 'ar' ? 'المفعلة والمنشورة فقط (Active) 🟢' : 'Published & Active Only 🟢'}</option>
              <option value="draft">{lang === 'ar' ? 'المعطلة والمسودات فقط (Deactivated) ⚪' : 'Deactivated & Drafts Only ⚪'}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
            >
              <option value="ALL">{lang === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name[lang] || cat.name.ar || cat.name.en} ({cat.name.en})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Stories Table / List */}
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-500">
              {lang === 'ar' ? 'جاري تحميل سجلات القصص وتحديث العدادات...' : 'Loading stories and updating counters...'}
            </p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {lang === 'ar' ? 'لا توجد قصص مطابقة للبحث' : 'No matching stories found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {lang === 'ar'
                ? 'لم نجد أي قصص تطابق خيارات الفلترة أو مصطلح البحث المدخل. يمكنك إعادة تعيين الفلاتر.'
                : 'No stories matched your filter options or search term. Try resetting the filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs`}>
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">{lang === 'ar' ? 'القصة والغلاف' : 'Cover & Story'}</th>
                  <th className="p-4">{lang === 'ar' ? 'المؤلف' : 'Author'}</th>
                  <th className="p-4">{lang === 'ar' ? 'التصنيف والمشاهد' : 'Category & Scenes'}</th>
                  <th className="p-4">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</th>
                  <th className="p-4 text-center">{lang === 'ar' ? 'حالة القصة (الحالية)' : 'Status'}</th>
                  <th className="p-4 text-center">{lang === 'ar' ? 'تفعيل / تعطيل' : 'Toggle Visibility'}</th>
                  <th className="p-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredStories.map((story) => {
                  const isPublished = story.status === 'published';
                  const coverImage = story.slides?.[0]?.imageFile;
                  const isLoadingAction = actionLoadingId === story.id;

                  return (
                    <tr
                      key={story.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cover & Title */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt="Cover"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <BookOpen className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-xs">
                            <div className="font-black text-sm text-slate-900 dark:text-white font-story truncate">
                              {story.name?.[lang] || story.name?.ar || story.name?.en || (lang === 'ar' ? 'قصة بدون عنوان' : 'Untitled Story')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {lang === 'ar' ? `معرف #${story.id}` : `ID #${story.id}`} • {story.folderName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{story.authorName || (lang === 'ar' ? 'غير محدد' : 'Unknown')}</span>
                        </div>
                      </td>

                      {/* Category & Slides */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {(() => {
                            const foundCat = categories.find(c => c.id === story.category);
                            const CatIcon = foundCat ? getCategoryIconComponent(foundCat.icon) : BookOpen;
                            const catLabel = foundCat ? (foundCat.name?.[lang] || foundCat.name?.ar || foundCat.name?.en) : (story.category || '—');
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                <CatIcon className="w-3 h-3 text-amber-500" />
                                <span>{catLabel}</span>
                              </span>
                            );
                          })()}
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-bold">
                            <Layers className="w-3 h-3 text-amber-500" />
                            <span>
                              {story.slidesCount || story.slides?.length || 0} {lang === 'ar' ? 'مشاهد مصورة' : 'scenes'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {story.createdAt
                          ? new Date(story.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'مفعلة (منشورة)' : 'Active (Published)'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-400/30">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'معطلة (مسودة)' : 'Draft (Inactive)'}</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Status Toggle Switch */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          disabled={isLoadingAction}
                          onClick={() => handleToggleStatus(story)}
                          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto ${
                            isPublished
                              ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/30'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={isPublished ? (lang === 'ar' ? 'إلغاء التفعيل وإخفاء القصة من المكتبة' : 'Deactivate and hide from library') : (lang === 'ar' ? 'تفعيل القصة ونشرها في المكتبة' : 'Publish story to library')}
                        >
                          {isLoadingAction ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isPublished ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'تعطيل القصة' : 'Deactivate'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'تفعيل ونشر' : 'Publish'}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions: Preview & Irreversible Delete */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Preview Story Button */}
                          <button
                            onClick={() => handlePreviewStory(story.id)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            title={lang === 'ar' ? 'معاينة وقراءة القصة' : 'Preview & Read Story'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete Story Button with Warning Popup */}
                          <button
                            onClick={() => setStoryToDelete(story)}
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-500/20"
                            title={lang === 'ar' ? 'حذف القصة نهائياً من القرص والمكتبة' : 'Permanently Delete Story from Disk'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Irreversible Delete Confirmation Modal */}
      {storyToDelete && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
          <div className="w-full max-w-lg glass-panel bg-white dark:bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
            
            {/* Modal Warning Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تأكيد الحذف النهائي للقصة ⚠️' : 'Confirm Permanent Deletion ⚠️'}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  {lang === 'ar' ? 'تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه مطلقاً!' : 'Warning: This action is permanent and cannot be undone!'}
                </p>
              </div>
            </div>

            {/* Warning Body Notice */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                {lang === 'ar' ? 'القصة المراد حذفها:' : 'Target Story:'} "{storyToDelete.name?.[lang] || storyToDelete.name?.ar || storyToDelete.name?.en}"
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <li>
                  {lang === 'ar'
                    ? <>سيتم مسح مجلد القصة بالكامل من القرص الصلب (<code className="font-mono text-rose-500">{storyToDelete.folderName}</code>).</>
                    : <>The entire story folder will be deleted from disk (<code className="font-mono text-rose-500">{storyToDelete.folderName}</code>).</>}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'سيتم حذف كافة الصور والرسومات المولدة بالذكاء الاصطناعي للمشاهد.'
                    : 'All AI-generated slide illustrations will be permanently removed.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'سيتم حذف جميع ملفات السرد الصوتي النقية (.wav) المسجلة.'
                    : 'All audio narration recordings (.wav) will be wiped.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'سيتم تحديث عداد القصص في التصنيف التابع لها تلقائياً.'
                    : 'Category story counters will be automatically updated.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'إذا كانت القصة استهلكت رصيداً من الحصة، فسيتم استرجاع الرصيد للمؤلف.'
                    : 'Story creation credit will be refunded to the author if applicable.'}
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStoryToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الحذف التام...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'نعم، احذف القصة نهائياً من القرص' : 'Yes, Delete Permanently from Disk'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Settings, Sliders, Type, ShieldAlert, Plus, Trash2, Edit3, CheckCircle2, RefreshCw, AlertCircle, ArrowRight, ArrowLeft, BookOpen, Sparkles, FolderSync, ChevronDown, Check } from 'lucide-react';
import { getCategoryIconComponent, suggestCategoryIcon, AVAILABLE_CATEGORY_ICONS } from '../categoryIcons';

const FONTS = [
  { id: 'Cairo', name: 'خط كايرو (Cairo)' },
  { id: 'Tajawal', name: 'خط تجوال (Tajawal)' },
  { id: 'Amiri', name: 'خط أميري (Amiri)' },
  { id: 'Noto Sans Arabic', name: 'خط نوتو العربي (Noto Sans Arabic)' },
  { id: 'Changa', name: 'خط شانجا (Changa)' }
];

export default function AdminSettingsPage({ setCurrentView }) {
  const { user, token, isAdmin, fetchSettings } = useAuth();
  const { lang } = useLanguage();

  const [siteNameAr, setSiteNameAr] = useState('منصة قصص - مسومس للذكاء الإصطناعي');
  const [siteNameEn, setSiteNameEn] = useState('Qisas Platform by msoms.ai');
  const [siteSubtitleAr, setSiteSubtitleAr] = useState('منصة تأليف ورواية القصص التفاعلية للأطفال بالذكاء الاصطناعي');
  const [siteSubtitleEn, setSiteSubtitleEn] = useState('AI-Powered Interactive Illustrated Story Creator & Narrator for Children');
  const [arabicFont, setArabicFont] = useState('Cairo');
  const [defaultRole, setDefaultRole] = useState('Story Reader');
  const [defaultFreeStories, setDefaultFreeStories] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [categories, setCategories] = useState([]);

  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [shiftModal, setShiftModal] = useState({ isOpen: false, categoryToDelete: null, targetCategoryId: '', storiesCount: 0, isDeleting: false });
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isAdmin && token) {
      loadSettings();
    }
  }, [isAdmin, token]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const sName = data.settings.siteName;
        if (typeof sName === 'object' && sName !== null) {
          setSiteNameAr(sName.ar || '');
          setSiteNameEn(sName.en || '');
        } else if (typeof sName === 'string') {
          setSiteNameAr(sName);
          setSiteNameEn(sName);
        }

        const sSub = data.settings.siteSubtitle;
        if (typeof sSub === 'object' && sSub !== null) {
          setSiteSubtitleAr(sSub.ar || '');
          setSiteSubtitleEn(sSub.en || '');
        } else if (typeof sSub === 'string') {
          setSiteSubtitleAr(sSub);
          setSiteSubtitleEn(sSub);
        }

        setArabicFont(data.settings.arabicFont || 'Cairo');
        setDefaultRole(data.settings.defaultRole || 'Story Reader');
        setDefaultFreeStories(data.settings.defaultFreeStories !== undefined ? data.settings.defaultFreeStories : 5);
        setMaintenanceMode(Boolean(data.settings.maintenanceMode));
      }

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      if (catData.success && catData.categories) {
        setCategories(catData.categories);
      }
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          siteName: {
            ar: siteNameAr.trim(),
            en: siteNameEn.trim()
          },
          siteSubtitle: {
            ar: siteSubtitleAr.trim(),
            en: siteSubtitleEn.trim()
          },
          arabicFont,
          defaultRole,
          defaultFreeStories: parseInt(defaultFreeStories, 10),
          maintenanceMode,
          categories
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotice({
          type: 'success',
          text: lang === 'ar' ? 'تم حفظ إعدادات المنصة بنجاح ✓' : 'Platform settings saved successfully ✓'
        });
        fetchSettings();
      } else {
        setNotice({ type: 'error', text: data.message });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const suggestedIcon = suggestCategoryIcon(newCatNameAr, newCatNameEn);
  const activeIcon = selectedIcon || suggestedIcon;
  const ActiveIconComp = getCategoryIconComponent(activeIcon);

  const handleAddCategory = async () => {
    if (!newCatNameAr.trim() || !newCatNameEn.trim()) {
      setNotice({
        type: 'error',
        text: lang === 'ar' ? 'يرجى كتابة اسم التصنيف بالعربية والإنجليزية' : 'Please enter category name in both Arabic and English'
      });
      return;
    }

    setIsAddingCategory(true);
    setNotice({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: { ar: newCatNameAr.trim(), en: newCatNameEn.trim() },
          icon: activeIcon
        })
      });

      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        setNewCatNameAr('');
        setNewCatNameEn('');
        setSelectedIcon('');
        setShowIconPicker(false);
        setNotice({
          type: 'success',
          text: lang === 'ar' ? 'تمت إضافة التصنيف وتوليد الأيقونة بنجاح ✓' : 'Category created and icon generated successfully ✓'
        });
      } else {
        setNotice({ type: 'error', text: data.message || 'Failed to add category' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleRequestDeleteCategory = (cat) => {
    if (categories.length <= 1) {
      alert(lang === 'ar'
        ? 'لا يمكن حذف هذا التصنيف. يجب أن يبقى تصنيف واحد على الأقل متاحاً في النظام دائماً (مثل: عام).'
        : 'Cannot delete this category. At least 1 category must remain available in the system at all times (e.g. General).');
      return;
    }

    const count = cat.storiesCount || 0;
    if (count > 0) {
      const remaining = categories.filter(c => c.id !== cat.id);
      setShiftModal({
        isOpen: true,
        categoryToDelete: cat,
        targetCategoryId: remaining[0]?.id || '',
        storiesCount: count,
        isDeleting: false
      });
    } else {
      const confirmMsg = lang === 'ar'
        ? `هل أنت متأكد من رغبتك في حذف تصنيف "${cat.name.ar}"؟ هذا الإجراء لا يمكن التراجع عنه.`
        : `Are you sure you want to delete category "${cat.name.en}"? This action cannot be undone.`;
      if (window.confirm(confirmMsg)) {
        handleExecuteDeleteCategory(cat.id);
      }
    }
  };

  const handleExecuteDeleteCategory = async (catId, shiftTo = null) => {
    try {
      if (shiftModal.isOpen) {
        setShiftModal(prev => ({ ...prev, isDeleting: true }));
      }
      const url = `/api/admin/categories/${catId}${shiftTo ? `?shiftTo=${encodeURIComponent(shiftTo)}` : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        setShiftModal({ isOpen: false, categoryToDelete: null, targetCategoryId: '', storiesCount: 0, isDeleting: false });
        setNotice({
          type: 'success',
          text: data.message || (lang === 'ar' ? 'تم حذف التصنيف بنجاح ✓' : 'Category deleted successfully ✓')
        });
      } else {
        setNotice({ type: 'error', text: data.message || 'Failed to delete category' });
        if (shiftModal.isOpen) {
          setShiftModal(prev => ({ ...prev, isDeleting: false }));
        }
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
      if (shiftModal.isOpen) {
        setShiftModal(prev => ({ ...prev, isDeleting: false }));
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className={`max-w-md mx-auto my-16 p-8 text-center glass-panel rounded-3xl ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          {lang === 'ar' ? 'غير مصرح بالدخول' : 'Access Denied'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'ar' ? 'هذه الصفحة مخصصة لمدير النظام فقط.' : 'This page is restricted to system administrators only.'}
        </p>
        <button
          onClick={() => setCurrentView('landing')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm"
        >
          {lang === 'ar' ? 'العودة للرئيسية' : 'Return to Home'}
        </button>
      </div>
    );
  }

  const BackIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''} space-y-8 animate-fade-in`}>
      
      {/* Settings Header */}
      <div className="flex items-center justify-between glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-500" />
            <span>{lang === 'ar' ? 'إعدادات وتخصيصات المنصة' : 'Platform & System Settings'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'تعديل الإعدادات العامة، خط القصص الافتراضي، حصص القصص المجانية، والتصنيفات'
              : 'Configure general settings, default story font, free story quotas, and story categories'}
          </p>
        </div>

        <button
          onClick={() => setCurrentView('admin-dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
        >
          <span>{lang === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}</span>
          <BackIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {notice.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          notice.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Card 1: Identity & Typography */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-amber-500" />
            <span>{lang === 'ar' ? 'هوية المنصة ونوع الخط العربي' : 'Platform Identity & Arabic Font'}</span>
          </h3>

          {/* Site Name (Arabic & English Fields) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{lang === 'ar' ? 'اسم المنصة (بالعربية)' : 'Site Name (Arabic)'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">العربية</span>
              </label>
              <input
                type="text"
                dir="rtl"
                value={siteNameAr}
                onChange={(e) => setSiteNameAr(e.target.value)}
                placeholder="مثال: منصة قصص - مسومس للذكاء الإصطناعي"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 font-arabic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{lang === 'ar' ? 'اسم المنصة (بالإنجليزية)' : 'Site Name (English)'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">English</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={siteNameEn}
                onChange={(e) => setSiteNameEn(e.target.value)}
                placeholder="e.g. Qisas Platform by msoms.ai"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
              />
            </div>
          </div>

          {/* Site Subtitle (Arabic & English Fields) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{lang === 'ar' ? 'وصف المنصة الفرعي (بالعربية)' : 'Site Subtitle (Arabic)'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">العربية</span>
              </label>
              <input
                type="text"
                dir="rtl"
                value={siteSubtitleAr}
                onChange={(e) => setSiteSubtitleAr(e.target.value)}
                placeholder="مثال: منصة تأليف ورواية القصص التفاعلية للأطفال بالذكاء الاصطناعي"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 font-arabic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                <span>{lang === 'ar' ? 'وصف المنصة الفرعي (بالإنجليزية)' : 'Site Subtitle (English)'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">English</span>
              </label>
              <input
                type="text"
                dir="ltr"
                value={siteSubtitleEn}
                onChange={(e) => setSiteSubtitleEn(e.target.value)}
                placeholder="e.g. AI-Powered Illustrated & Voice Interactive Stories for Children"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              {lang === 'ar' ? 'نوع الخط العربي الافتراضي للقصص (Story Arabic Font)' : 'Default Story Arabic Font'}
            </label>
            <select
              value={arabicFont}
              onChange={(e) => {
                const newFont = e.target.value;
                setArabicFont(newFont);
                // Instant preview across page
                document.documentElement.style.setProperty('--story-font', `'${newFont}', 'Cairo', 'Tajawal', sans-serif`);
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none"
            >
              {FONTS.map(f => (
                <option key={f.id} value={f.id} style={{ fontFamily: `'${f.id}', sans-serif` }}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Live Interactive Font Preview Card */}
            <div 
              className="mt-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 transition-all duration-300"
              style={{ fontFamily: `'${arabicFont}', 'Cairo', sans-serif` }}
            >
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">
                {lang === 'ar' ? `معاينة حية لشكل الخط المختار (${arabicFont}):` : `Live preview for selected font (${arabicFont}):`}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                كان يا ما كان في قديم الزمان، نسرٌ صغير يحلم بأن يحلّق عالياً بين النجوم والسحاب.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Roles, Free Quotas & Maintenance Mode */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <ShieldAlert className="w-5 h-5 text-indigo-500" />
            <span>{lang === 'ar' ? 'الأدوار والحصص المجانية ووضع الصيانة' : 'Roles, Free Quotas & Maintenance Mode'}</span>
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'الدور الافتراضي عند التسجيل الجديد' : 'Default Role for New Users'}
              </label>
              <select
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none"
              >
                <option value="Story Reader">{lang === 'ar' ? 'قارئ قصص (Story Reader)' : 'Story Reader'}</option>
                <option value="Story Maker">{lang === 'ar' ? 'صانع قصص (Story Maker)' : 'Story Maker'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'عدد القصص المجانية المخصصة للباقة المجانية' : 'Default Free Stories Quota'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={defaultFreeStories}
                onChange={(e) => setDefaultFreeStories(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Maintenance Mode Toggle Switch */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'وضع الصيانة (Maintenance Mode)' : 'Maintenance Mode'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'عند تفعيله، تظهر شاشة صيانة لكافة الزوار باستثناء مدير النظام.'
                  : 'When enabled, a maintenance screen is shown to all visitors except administrators.'}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>
        </div>

        {/* Card 3: Categories Management */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-500" />
              <span>{lang === 'ar' ? `إدارة تصنيفات القصص (${categories.length})` : `Categories Management (${categories.length})`}</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'الحد الأدنى: تصنيف واحد متاح دائماً' : 'Minimum: at least 1 category available'}
            </span>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categories.map((cat) => {
              const CatIcon = getCategoryIconComponent(cat.icon);
              const storiesCount = cat.storiesCount || 0;
              const isOnlyOne = categories.length <= 1;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-sm hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{cat.name.ar}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">{cat.name.en}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Story Count Badge */}
                    <span
                      className="px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs border border-amber-500/20 flex items-center gap-1"
                      title={lang === 'ar' ? 'عدد القصص المرتبطة بهذا التصنيف' : 'Stories assigned to this category'}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>{storiesCount}</span>
                    </span>

                    {/* Delete Action */}
                    {isOnlyOne ? (
                      <button
                        type="button"
                        disabled
                        className="p-1.5 rounded-xl text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                        title={lang === 'ar' ? 'لا يمكن حذف التصنيف الوحيد المتبقي' : 'Cannot delete the only remaining category'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteCategory(cat)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title={lang === 'ar' ? 'حذف أو نقل تصنيف القصص' : 'Delete or shift category'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Category Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم التصنيف بالعربية (مثال: الفضاء والكون)...' : 'Category Name in Arabic...'}
                className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                value={newCatNameEn}
                onChange={(e) => setNewCatNameEn(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم التصنيف بالإنجليزية (مثال: Space & Cosmos)...' : 'Category Name in English...'}
                className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {/* Suggested / Chosen Icon Preview & Picker Trigger */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold shrink-0">
                <span className="text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'الأيقونة المولّدة:' : 'Icon:'}</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <ActiveIconComp className="w-3.5 h-3.5" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title={lang === 'ar' ? 'تغيير الأيقونة يدوياً' : 'Change icon manually'}
                >
                  <span>{lang === 'ar' ? 'اختيار' : 'Pick'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Add Button */}
              <button
                type="button"
                disabled={isAddingCategory}
                onClick={handleAddCategory}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 transition-all shrink-0"
              >
                {isAddingCategory ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'ar' ? 'إضافة وتوليد الأيقونة' : 'Add Category'}</span>
              </button>
            </div>

            {/* Icon Picker Popover Panel */}
            {showIconPicker && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {lang === 'ar' ? 'اختر أيقونة التصنيف المناسبة:' : 'Select Category Icon:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {AVAILABLE_CATEGORY_ICONS.map((item) => {
                    const ItemIcon = getCategoryIconComponent(item.id);
                    const isSelected = activeIcon === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSelectedIcon(item.id);
                          setShowIconPicker(false);
                        }}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-black'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                          <ItemIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] truncate">{item.label[lang] || item.label.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className={`flex ${lang === 'ar' ? 'justify-end' : 'justify-start'} pt-2`}>
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>{lang === 'ar' ? 'حفظ وتطبيق كافة الإعدادات' : 'Save & Apply All Settings'}</span>
            )}
          </button>
        </div>

      </form>

      {/* Shift Stories & Delete Category Modal */}
      {shiftModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 ${lang === 'ar' ? 'font-arabic' : ''}`}>
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FolderSync className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تحويل القصص وتأكيد حذف التصنيف' : 'Shift Stories & Confirm Category Deletion'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'لا يمكن حذف تصنيف مرتبط بقصص دون نقلها أولاً' : 'Categories with assigned stories must be shifted first'}
                </p>
              </div>
            </div>

            {/* Modal Warning & Body */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
              <p className="font-bold">
                {lang === 'ar'
                  ? `التصنيف "${shiftModal.categoryToDelete?.name?.ar || ''}" يحتوي حالياً على (${shiftModal.storiesCount}) قصة مرتبطة به.`
                  : `The category "${shiftModal.categoryToDelete?.name?.en || ''}" currently has (${shiftModal.storiesCount}) stories assigned to it.`}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {lang === 'ar'
                  ? 'يرجى اختيار تصنيف بديل من القائمة أدناه لنقل كافة القصص إليه تلقائياً قبل إتمام عملية الحذف نهائياً:'
                  : 'Please choose an alternative category from the list below to safely transfer all stories into before deleting:'}
              </p>
            </div>

            {/* Target Category Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'اختر التصنيف البديل المستهدف:' : 'Select Target Destination Category:'}
              </label>
              <select
                value={shiftModal.targetCategoryId}
                onChange={(e) => setShiftModal(prev => ({ ...prev, targetCategoryId: e.target.value }))}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {categories
                  .filter(c => c.id !== shiftModal.categoryToDelete?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[lang] || c.name.ar} ({c.name.en}) - {c.storiesCount || 0} {lang === 'ar' ? 'قصة حالية' : 'current stories'}
                    </option>
                  ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={shiftModal.isDeleting}
                onClick={() => setShiftModal({ isOpen: false, categoryToDelete: null, targetCategoryId: '', storiesCount: 0, isDeleting: false })}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={shiftModal.isDeleting || !shiftModal.targetCategoryId}
                onClick={() => handleExecuteDeleteCategory(shiftModal.categoryToDelete.id, shiftModal.targetCategoryId)}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {shiftModal.isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'ar' ? 'تحويل القصص وحذف التصنيف' : 'Shift & Delete Category'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

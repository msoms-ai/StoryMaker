import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Moon, Sun, Globe, Sparkles, User, LogIn, LogOut, ShieldCheck, Settings, CreditCard, ChevronDown, SlidersHorizontal, BookCheck } from 'lucide-react';

export default function Header({ currentView, setCurrentView }) {
  const { lang, theme, toggleLanguage, toggleTheme, t } = useLanguage();
  const { user, logout, openAuthModal, isAdmin, isStoryMaker, freeStoriesCount, settings } = useAuth();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 px-4 md:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div 
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rx-12 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-story flex items-center gap-1.5">
              {(typeof settings?.siteName === 'object' && settings.siteName !== null
                ? (settings.siteName[lang] || settings.siteName.ar || settings.siteName.en)
                : settings?.siteName) || t('appName')}
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {(typeof settings?.siteSubtitle === 'object' && settings.siteSubtitle !== null
                ? (settings.siteSubtitle[lang] || settings.siteSubtitle.ar || settings.siteSubtitle.en)
                : settings?.siteSubtitle) || t('appTagline')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Top Right "Browse Stories" Link */}
          <button
            onClick={() => setCurrentView('categories')}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'categories'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{t('browseStories')}</span>
          </button>

          {/* Pricing Packages Link */}
          <button
            onClick={() => setCurrentView('packages')}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'packages'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'باقات القصص' : 'Packages'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* User Account / Login Button */}
          {user ? (
            <div className={`relative ${lang === 'ar' ? 'font-arabic' : ''}`}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 pr-2 sm:pr-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all ${lang === 'ar' ? 'text-right' : 'text-left'}`}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    user.firstName ? user.firstName[0] : 'U'
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {user.firstName || user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    {user.role === 'Admin' ? (lang === 'ar' ? 'مدير' : 'Admin') : (lang === 'ar' ? `${freeStoriesCount} قصة` : `${freeStoriesCount} stories`)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  onMouseLeave={() => setUserDropdownOpen(false)}
                  className={`absolute ${lang === 'ar' ? 'left-0' : 'right-0'} mt-2 w-56 rounded-2xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 space-y-1 text-xs font-bold animate-fade-in`}
                >
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="text-slate-900 dark:text-white font-black truncate">{user.email}</div>
                    <span className="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-black bg-indigo-500/10 text-indigo-600">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => { setUserDropdownOpen(false); setCurrentView('profile'); }}
                    className={`w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    <User className="w-4 h-4 text-amber-500" />
                    <span>{lang === 'ar' ? 'الملف الشخصي' : 'My Profile'}</span>
                  </button>

                  <button
                    onClick={() => { setUserDropdownOpen(false); setCurrentView('packages'); }}
                    className={`w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <span>
                      {lang === 'ar'
                        ? `باقات القصص (${user.role === 'Admin' ? 'غير محدود' : user.freeStoriesLeft})`
                        : `Story Packages (${user.role === 'Admin' ? 'Unlimited' : user.freeStoriesLeft})`}
                    </span>
                  </button>

                  {(isAdmin || isStoryMaker) && (
                    <button
                      onClick={() => { setUserDropdownOpen(false); setCurrentView('stories-moderator'); }}
                      className={`w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    >
                      <BookCheck className="w-4 h-4 text-emerald-500" />
                      <span>{lang === 'ar' ? 'مشرف القصص (Stories Moderator)' : 'Stories Moderator'}</span>
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => { setUserDropdownOpen(false); setCurrentView('admin-dashboard'); }}
                        className={`w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-500/10 hover:text-blue-600 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        <span>{lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}</span>
                      </button>

                      <button
                        onClick={() => { setUserDropdownOpen(false); setCurrentView('admin-settings'); }}
                        className={`w-full px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-purple-500/10 hover:text-purple-600 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                      >
                        <Settings className="w-4 h-4 text-purple-500" />
                        <span>{lang === 'ar' ? 'إعدادات وتخصيصات المنصة' : 'Platform Settings'}</span>
                      </button>
                    </>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      onClick={() => { setUserDropdownOpen(false); logout(); }}
                      className={`w-full px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 ${lang === 'ar' ? 'font-arabic' : ''}`}>
              <button
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'دخول' : 'Sign In'}</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

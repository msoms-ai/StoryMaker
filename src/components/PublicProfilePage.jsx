import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { User, BookOpen, AlertCircle, Share2, Instagram, Facebook, Linkedin, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PublicProfilePage({ userId, setCurrentView, setViewingStoryId, sourceView }) {
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError('Unknown Account');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/public/${userId}`);
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.message || 'Profile not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-amber-500">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`max-w-md mx-auto my-16 p-8 text-center glass-panel rounded-3xl ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          {lang === 'ar' ? 'الملف الشخصي غير متاح' : 'Profile Unavailable'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'ar' ? 'هذا الحساب خاص أو غير موجود.' : 'This account is private or does not exist.'}
        </p>
        <button
          onClick={() => setCurrentView(sourceView || 'stories-list')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md"
        >
          {lang === 'ar' ? 'العودة للقصص' : 'Back to Stories'}
        </button>
      </div>
    );
  }

  const { firstName, lastName, avatarUrl, coverUrl, socialLinks, role, stories } = profile;
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Author';

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''} space-y-8 animate-fade-in`}>
      
      {/* Navigation Back */}
      <button 
        onClick={() => setCurrentView(sourceView || 'stories-list')}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-amber-500 font-bold text-sm transition-colors"
      >
        {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        <span>{lang === 'ar' ? 'العودة للمكتبة' : 'Back to Library'}</span>
      </button>

      {/* Banner & Profile Info */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Cover Background */}
        <div className="h-48 sm:h-64 w-full bg-slate-200 dark:bg-slate-800 relative">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-amber-500/20"></div>
          )}
        </div>

        <div className="px-8 pb-8 relative">
          {/* Avatar (Overlapping) */}
          <div className={`absolute -top-16 ${lang === 'ar' ? 'right-8' : 'left-8'} w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 shadow-xl flex items-center justify-center`}>
             {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-slate-400" />
              )}
          </div>

          <div className={`pt-20 ${lang === 'ar' ? 'sm:text-right' : 'sm:text-left'} sm:pt-4 flex flex-col sm:flex-row items-end sm:items-start justify-between gap-4`}>
            <div className={`${lang === 'ar' ? 'sm:mr-40' : 'sm:ml-40'} w-full sm:w-auto text-center sm:text-start`}>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-3">
                {fullName}
              </h1>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-sm">
                {role === 'Admin' ? (lang === 'ar' ? 'مدير النظام' : 'Admin') : 
                 role === 'Story Maker' ? (lang === 'ar' ? 'صانع قصص' : 'Story Maker') : 
                 (lang === 'ar' ? 'قارئ قصص' : 'Story Reader')}
              </span>
            </div>
            
            {/* Social Links */}
            <div className="flex gap-2 mx-auto sm:mx-0">
              {socialLinks?.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-amber-500 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {socialLinks?.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-amber-500 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {socialLinks?.linkedin && (
                <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-amber-500 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-3xl text-center border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stories.length}</div>
          <div className="text-sm font-bold text-slate-500">{lang === 'ar' ? 'القصص المنشورة' : 'Published Stories'}</div>
        </div>
      </div>

      {/* User's Stories Grid */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
          {lang === 'ar' ? `مكتبة ${firstName || 'المؤلف'}` : `${firstName || 'Author'}'s Library`}
        </h3>
        
        {stories.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            {lang === 'ar' ? 'لم يقم هذا المستخدم بنشر أي قصص بعد.' : 'This user has not published any stories yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {stories.map(story => (
              <div 
                key={story.id} 
                onClick={() => {
                  setViewingStoryId(story.id);
                  setCurrentView('reader');
                }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-800 group-hover:border-amber-500 transition-all group-hover:scale-105 group-hover:shadow-2xl relative">
                  {story.slides && story.slides[0] && story.slides[0].imageFile ? (
                    <img src={story.slides[0].imageFile} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-black text-sm line-clamp-2 leading-snug">
                      {typeof story.title === 'object' ? story.title[lang] : story.title || story.name}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

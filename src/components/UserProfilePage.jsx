import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Mail, Phone, Instagram, Linkedin, Facebook, Camera, Shield, GraduationCap, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ArrowRight, ArrowLeft, UploadCloud } from 'lucide-react';

export default function UserProfilePage({ setCurrentView }) {
  const { user, token, updateProfile, refreshUser } = useAuth();
  const { lang } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [socialLinks, setSocialLinks] = useState({
    instagram: user?.socialLinks?.instagram || '',
    linkedin: user?.socialLinks?.linkedin || '',
    facebook: user?.socialLinks?.facebook || ''
  });

  const [statusNotice, setStatusNotice] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState('input'); // 'input' | 'otp'
  const [emailNotice, setEmailNotice] = useState({ type: '', text: '' });

  // Avatar Upload State
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Story Maker Teacher Application State
  const [schoolName, setSchoolName] = useState('');
  const [schoolIdFile, setSchoolIdFile] = useState(null);
  const [submittingTeacherReq, setSubmittingTeacherReq] = useState(false);
  const [teacherReqNotice, setTeacherReqNotice] = useState({ type: '', text: '' });

  if (!user) {
    return (
      <div className={`max-w-md mx-auto my-16 p-8 text-center glass-panel rounded-3xl ${lang === 'ar' ? 'font-arabic' : ''}`}>
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          {lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please Sign In First'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {lang === 'ar' ? 'يجب تسجيل الدخول للوصول إلى الملف الشخصي وإدارة الحساب.' : 'You must be logged in to view and manage your account profile.'}
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

  // 1. Save Basic Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setStatusNotice({ type: '', text: '' });
    setIsSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ firstName, lastName, mobileNumber, socialLinks })
      });
      const data = await res.json();
      if (data.success && data.user) {
        updateProfile(data.user);
        setStatusNotice({ type: 'success', text: lang === 'ar' ? 'تم حفظ التعديلات بنجاح ✓' : 'Profile updated successfully ✓' });
      } else {
        setStatusNotice({ type: 'error', text: data.message || 'Error updating profile' });
      }
    } catch (err) {
      setStatusNotice({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Upload Avatar Image (max 1MB)
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert(lang === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 1 ميجابايت' : 'Image size must be less than 1MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarUploading(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.user) {
        updateProfile(data.user);
      } else {
        alert(data.message || 'Failed to upload avatar');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 2 ميجابايت' : 'Image size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('cover', file);

    try {
      const res = await fetch('/api/user/cover/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.user) updateProfile(data.user);
      else alert(data.message || 'Failed to upload cover');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCoverGenerate = async () => {
    const prompt = window.prompt(lang === 'ar' ? 'أدخل وصف الخلفية (مثال: غابة ساحرة ليلاً)' : 'Enter cover description (e.g., A magical forest at night)');
    if (!prompt) return;

    try {
      const res = await fetch('/api/user/cover/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.success && data.user) updateProfile(data.user);
      else alert(data.message || 'Failed to generate cover');
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Email Change OTP Request
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail || newEmail.trim() === user.email) return;
    setEmailNotice({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/change-email-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail, lang })
      });
      const data = await res.json();
      if (data.success) {
        setEmailChangeStep('otp');
        setEmailNotice({ type: 'success', text: lang === 'ar' ? `تم إرسال رمز التحقق إلى ${newEmail}` : `OTP code sent to ${newEmail}` });
      } else {
        setEmailNotice({ type: 'error', text: data.message });
      }
    } catch (err) {
      setEmailNotice({ type: 'error', text: err.message });
    }
  };

  // 4. Confirm New Email with OTP
  const handleVerifyNewEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/verify-new-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ otpCode: emailOtp.trim() })
      });
      const data = await res.json();
      if (data.success && data.user) {
        updateProfile(data.user);
        setEmailChangeStep('input');
        setNewEmail('');
        setEmailOtp('');
        setEmailNotice({ type: 'success', text: lang === 'ar' ? 'تم تحديث البريد الإلكتروني بنجاح ✓' : 'Email updated successfully ✓' });
      } else {
        setEmailNotice({ type: 'error', text: data.message });
      }
    } catch (err) {
      setEmailNotice({ type: 'error', text: err.message });
    }
  };

  // 5. Submit Teacher Verification Request (Proof Mandatory)
  const handleSubmitTeacherRequest = async (e) => {
    e.preventDefault();
    if (!schoolIdFile) {
      setTeacherReqNotice({ type: 'error', text: lang === 'ar' ? 'يرجى إرفاق صورة بطاقة المعلم المدرسية' : 'School ID photo is required' });
      return;
    }

    const formData = new FormData();
    formData.append('schoolName', schoolName);
    formData.append('schoolIdProof', schoolIdFile);

    setSubmittingTeacherReq(true);
    setTeacherReqNotice({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/request-story-maker', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setTeacherReqNotice({
          type: 'success',
          text: lang === 'ar' ? 'تم تقديم الطلب بنجاح! سيقوم مدير النظام بمراجعة بطاقة المعلم واعتماد حسابك قريباً.' : 'Request submitted! Admin will review your school ID shortly.'
        });
        if (data.user) updateProfile(data.user);
      } else {
        setTeacherReqNotice({ type: 'error', text: data.message });
      }
    } catch (err) {
      setTeacherReqNotice({ type: 'error', text: err.message });
    } finally {
      setSubmittingTeacherReq(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''} space-y-8 animate-fade-in`}>
      
      {/* Profile Header Banner */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 relative">
        {/* Cover Background */}
        <div className="h-48 sm:h-64 w-full bg-slate-200 dark:bg-slate-800 relative group">
          {user.coverUrl ? (
            <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-amber-500/20"></div>
          )}
          
          {/* Cover Edit Controls */}
          <div className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <label className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-lg backdrop-blur-sm transition-all" title={lang === 'ar' ? 'رفع غلاف' : 'Upload Cover'}>
              <UploadCloud className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
            <button onClick={handleCoverGenerate} className="p-2.5 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg backdrop-blur-sm transition-all" title={lang === 'ar' ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI'}>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-8 pb-8 relative">
          {/* Avatar Picture with Upload Icon */}
          <div className={`absolute -top-16 ${lang === 'ar' ? 'right-8' : 'left-8'} w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group`}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-slate-400" />
            )}
            
            <label
              htmlFor="avatar-input"
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white"
              title={lang === 'ar' ? 'تغيير الصورة الشخصية' : 'Change Profile Picture'}
            >
              <Camera className="w-8 h-8" />
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className={`pt-20 ${lang === 'ar' ? 'sm:text-right' : 'sm:text-left'} sm:pt-4 flex flex-col sm:flex-row items-end sm:items-start justify-between gap-4`}>
            <div className={`${lang === 'ar' ? 'sm:mr-40' : 'sm:ml-40'} w-full sm:w-auto text-center sm:text-start flex-1 space-y-1`}>
              <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-2`}>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                  {`${user.firstName} ${user.lastName}`.trim() || user.email}
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-sm">
                  {user.role}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-400 font-mono">
                {lang === 'ar' ? 'مجلد المستخدم:' : 'User Folder:'} <span className="font-bold text-amber-600 dark:text-amber-400">{user.userFolder}</span>
              </p>
            </div>

            {/* Story Credits Card */}
            <div className="mt-4 sm:mt-0 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md text-center min-w-[170px] flex-shrink-0">
              <span className="text-xs font-bold text-slate-500 block mb-1">
                {lang === 'ar' ? 'القصص المتاحة للتأليف:' : 'Available Story Credits:'}
              </span>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {user.role === 'Admin' ? '∞' : user.freeStoriesLeft}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {lang === 'ar' ? 'قصة متبقية' : 'stories left'}
              </span>
              {user.role === 'Story Reader' && (
                <button
                  onClick={() => setCurrentView('packages')}
                  className="mt-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline block mx-auto"
                >
                  {lang === 'ar' ? 'شراء باقة قصص ↗' : 'Buy Story Pack ↗'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Personal Info & Social Media Form */}
        <div className="md:col-span-2 glass-panel p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <User className="w-5 h-5 text-amber-500" />
            <span>{lang === 'ar' ? 'المعلومات الشخصية وروابط التواصل' : 'Personal Information & Social Links'}</span>
          </h3>

          {statusNotice.text && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              statusNotice.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
            }`}>
              {statusNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusNotice.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {lang === 'ar' ? 'الاسم الأول' : 'First Name'}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {lang === 'ar' ? 'اسم العائلة' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'رقم الهاتف المتحرك' : 'Mobile Number'}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Phone className={`w-4 h-4 absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-3 text-slate-400`} />
              </div>
            </div>

            {/* Social Media Links */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {lang === 'ar' ? 'حسابات التواصل الاجتماعي' : 'Social Media Profiles'}
              </h4>
              
              <div className="relative">
                <input
                  type="url"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                  placeholder="https://instagram.com/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 pl-10"
                />
                <Instagram className="w-4 h-4 absolute left-3 top-3 text-rose-500" />
              </div>

              <div className="relative">
                <input
                  type="url"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 pl-10"
                />
                <Linkedin className="w-4 h-4 absolute left-3 top-3 text-blue-600" />
              </div>

              <div className="relative">
                <input
                  type="url"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                  placeholder="https://facebook.com/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 pl-10"
                />
                <Facebook className="w-4 h-4 absolute left-3 top-3 text-indigo-600" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Email Change & Teacher Application */}
        <div className="space-y-6">
          
          {/* Card 1: Change Email with OTP Verification */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500" />
              <span>{lang === 'ar' ? 'تغيير البريد الإلكتروني (عبر OTP)' : 'Update Email Address (OTP)'}</span>
            </h4>

            {emailNotice.text && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                emailNotice.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                {emailNotice.text}
              </div>
            )}

            {emailChangeStep === 'input' ? (
              <form onSubmit={handleRequestEmailChange} className="space-y-3">
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={lang === 'ar' ? 'البريد الجديد...' : 'New email address...'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  {lang === 'ar' ? 'إرسال رمز التحقق للبريد الجديد' : 'Send Verification Code to New Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyNewEmail} className="space-y-3">
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={lang === 'ar' ? 'أدخل رمز 4 أرقام' : 'Enter 4-digit code'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-amber-500 text-center font-mono text-lg font-black tracking-widest"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                >
                  {lang === 'ar' ? 'تأكيد وتحديث البريد' : 'Confirm & Update Email'}
                </button>
              </form>
            )}
          </div>

          {/* Card 2: Request Story Maker (Teacher) Role */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              <span>{lang === 'ar' ? 'الترقية إلى دور "صانع قصص (معلم)"' : 'Upgrade to Story Maker (Teacher)'}</span>
            </h4>

            {user.role === 'Story Maker' || user.role === 'Admin' ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? `أنت مسجل حالياً كـ (${user.role}) وتتمتع بكامل صلاحيات التأليف.`
                    : `You are currently registered as (${user.role}) with full authoring permissions.`}
                </span>
              </div>
            ) : user.teacherRequestStatus === 'pending' ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
                <span>
                  {lang === 'ar'
                    ? 'طلبك قيد المراجعة حالياً من قبل إدارة المنصة.'
                    : 'Your upgrade request is currently under review by administrators.'}
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmitTeacherRequest} className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar'
                    ? 'يتطلب هذا الدور إثبات كونك معلماً عبر إرفاق صورة بطاقة المعلم المدرسية لفتح صلاحيات التأليف الموسعة:'
                    : 'This role requires verified educator credentials. Please attach your teacher / school ID card:'}
                </p>

                {teacherReqNotice.text && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    teacherReqNotice.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {teacherReqNotice.text}
                  </div>
                )}

                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={lang === 'ar' ? 'اسم المدرسة أو المؤسسة التعليمية...' : 'School or Educational Institution Name...'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <div className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center">
                  <input
                    type="file"
                    required
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setSchoolIdFile(e.target.files?.[0] || null)}
                    id="school-id-upload"
                    className="hidden"
                  />
                  <label htmlFor="school-id-upload" className="cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline block">
                    {schoolIdFile
                      ? `✓ ${lang === 'ar' ? 'تم اختيار:' : 'Selected:'} ${schoolIdFile.name}`
                      : (lang === 'ar' ? '📎 اضغط لإرفاق صورة بطاقة المعلم (إلزامي)' : '📎 Click to upload School ID Card (Required)')}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingTeacherReq}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {submittingTeacherReq ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{lang === 'ar' ? 'إرسال طلب الترقية للمراجعة' : 'Submit Upgrade Application'}</span>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

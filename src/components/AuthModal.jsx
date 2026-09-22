import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, KeyRound, Sparkles } from 'lucide-react';

export default function AuthModal() {
  const { authModalOpen, authModalTab, setAuthModalTab, closeAuthModal, login, signup, verifyOtp, resendOtp, otpEmail, otpNotice } = useAuth();
  const { lang, dir, t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP Expiration Countdown (300s = 5 mins)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300);

  useEffect(() => {
    if (authModalTab === 'otp') {
      setOtpSecondsLeft(300);
      setOtpCode('');
    }
    setError('');
  }, [authModalTab]);

  useEffect(() => {
    if (authModalTab !== 'otp' || otpSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [authModalTab, otpSecondsLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!authModalOpen) return null;

  // Password Strength Validations
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-=+]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecialChar;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success && !res.unverified) {
      setError(res.message);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError(lang === 'ar' ? 'يرجى استيفاء كافة شروط كلمة المرور القوية' : 'Please meet all strong password requirements');
      return;
    }
    setError('');
    setLoading(true);
    const res = await signup({ email, password, firstName, lastName, lang });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.trim().length !== 4) {
      setError(lang === 'ar' ? 'يرجى إدخال رمز التحقق المكون من 4 أرقام' : 'Please enter the 4-digit code');
      return;
    }
    setError('');
    setLoading(true);
    const res = await verifyOtp(otpCode.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResendCooldown(60);
    setOtpSecondsLeft(300);
    await resendOtp(lang);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <div className="relative w-full max-w-md p-8 rounded-3xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        
        {/* Close Modal Button */}
        <button
          onClick={closeAuthModal}
          className={`absolute top-5 ${lang === 'ar' ? 'left-5' : 'right-5'} p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {authModalTab === 'otp'
              ? (lang === 'ar' ? 'تأكيد الحساب برمز OTP' : 'Verify Email with OTP')
              : (lang === 'ar' ? 'مرحباً بك في منصة قصص' : 'Welcome to Qisas Platform')}
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {authModalTab === 'otp'
              ? (lang === 'ar' ? `تم إرسال رمز التحقق إلى ${otpEmail}` : `Verification code sent to ${otpEmail}`)
              : (lang === 'ar' ? 'بوابتك الإبداعية لتأليف ورواية القصص' : 'Your gateway to interactive story creation')}
          </p>
        </div>

        {/* Tabs Switcher (Login / Signup) */}
        {authModalTab !== 'otp' && (
          <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm font-bold">
            <button
              onClick={() => { setAuthModalTab('login'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all ${
                authModalTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              onClick={() => { setAuthModalTab('signup'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all ${
                authModalTab === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'حساب جديد' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {authModalTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ar' ? 'دخول' : 'Sign In'}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: SIGNUP FORM */}
        {authModalTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'الاسم الأول' : 'First Name'}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={lang === 'ar' ? 'محمد' : 'John'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'اسم العائلة' : 'Last Name'}
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الهاشمي' : 'Doe'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              />

              {/* Password Requirements Checklist */}
              <div className="mt-2.5 space-y-1 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'يحتوي على أرقام (0-9)' : 'Contains numbers'}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'يحتوي على رموز خاصة (!@#$%...)' : 'Contains special characters'}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{lang === 'ar' ? 'إنشاء حساب وإرسال رمز التحقق' : 'Sign Up & Send Code'}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: 4-DIGIT OTP VERIFICATION SCREEN */}
        {authModalTab === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6 text-center">
            
            {otpNotice && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                {otpNotice}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-3">
                {lang === 'ar' ? 'أدخل رمز التحقق المكون من 4 أرقام:' : 'Enter the 4-digit code:'}
              </label>

              {/* 4-Digit Numeric Box */}
              <input
                type="text"
                maxLength={4}
                autoFocus
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-48 mx-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-amber-500 text-center text-3xl font-mono font-black tracking-[12px] focus:outline-none focus:ring-4 focus:ring-amber-500/20 text-slate-900 dark:text-white"
              />
            </div>

            {/* Countdown Expiry Timer */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              <span className="text-slate-500">
                {lang === 'ar' ? 'صلاحية الرمز:' : 'Code expires in:'}
              </span>
              <span className={`font-mono px-2 py-0.5 rounded-md ${otpSecondsLeft < 60 ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}`}>
                {formatCountdown(otpSecondsLeft)}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 4 || otpSecondsLeft <= 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'تأكيد الرمز وتفعيل الحساب' : 'Verify & Activate Account'}</span>
                </>
              )}
            </button>

            {/* Resend Code Button */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleResend}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? (lang === 'ar' ? `إعادة الإرسال بعد (${resendCooldown} ثانية)` : `Resend available in (${resendCooldown}s)`)
                  : (lang === 'ar' ? 'لم يصلك الرمز؟ إعادة إرسال رمز جديد' : 'Didn\'t get the code? Resend new code')}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

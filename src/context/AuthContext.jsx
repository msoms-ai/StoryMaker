import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('qisas_token') || null);
  const [loading, setLoading] = useState(true);
  
  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'signup' | 'otp'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  // Platform Settings State
  const [settings, setSettings] = useState(null);

  // Apply dynamic font to document root whenever settings are loaded/changed
  useEffect(() => {
    if (settings?.arabicFont) {
      document.documentElement.style.setProperty('--story-font', `'${settings.arabicFont}', 'Cairo', 'Tajawal', sans-serif`);
      document.documentElement.setAttribute('data-story-font', settings.arabicFont);
    }
  }, [settings?.arabicFont]);

  // Fetch current user from token on mount
  useEffect(() => {
    fetchSettings();
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        if (data.settings.arabicFont) {
          document.documentElement.style.setProperty('--story-font', `'${data.settings.arabicFont}', 'Cairo', 'Tajawal', sans-serif`);
          document.documentElement.setAttribute('data-story-font', data.settings.arabicFont);
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Settings notice:', e.message);
    }
  };

  const fetchCurrentUser = async (authToken) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('qisas_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthModalOpen(false);
      return { success: true };
    }
    if (data.unverified) {
      setOtpEmail(email);
      setOtpNotice(data.message);
      setAuthModalTab('otp');
      return { success: false, unverified: true, message: data.message };
    }
    return { success: false, message: data.message || 'Login failed' };
  };

  const signup = async ({ email, password, firstName, lastName, lang = 'ar' }) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, lang })
    });
    const data = await res.json();
    if (data.success) {
      setOtpEmail(email);
      setOtpNotice(data.message);
      setAuthModalTab('otp');
      return { success: true, devOtp: data.devOtp };
    }
    return { success: false, message: data.message || 'Signup failed' };
  };

  const verifyOtp = async (otpCode) => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, otpCode })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('qisas_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, message: data.message || 'Verification failed' };
  };

  const resendOtp = async (lang = 'ar') => {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, lang })
    });
    const data = await res.json();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('qisas_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  const openAuthModal = (tab = 'login', email = '') => {
    setAuthModalTab(tab);
    if (email) setOtpEmail(email);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Role & Permissions Helper Getters
  const isAdmin = user?.role === 'Admin';
  const isStoryMaker = user?.role === 'Story Maker' || isAdmin;
  const isStoryReader = user?.role === 'Story Reader';
  const freeStoriesCount = user?.freeStoriesLeft ?? 0;
  const canCreateStory = isAdmin || isStoryMaker || freeStoriesCount > 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        settings,
        fetchSettings,
        authModalOpen,
        authModalTab,
        otpEmail,
        otpNotice,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
        updateProfile,
        refreshUser: () => token && fetchCurrentUser(token),
        isAdmin,
        isStoryMaker,
        isStoryReader,
        freeStoriesCount,
        canCreateStory
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

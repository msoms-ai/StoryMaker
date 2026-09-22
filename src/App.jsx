import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import StoryGenerationWizard from './components/StoryGenerationWizard';
import StoryCategoriesPage from './components/StoryCategoriesPage';
import GeneratedStoriesPage from './components/GeneratedStoriesPage';
import StoryReaderPage from './components/StoryReaderPage';
import UserProfilePage from './components/UserProfilePage';
import PublicProfilePage from './components/PublicProfilePage';
import PackagesPricingPage from './components/PackagesPricingPage';
import AdminDashboardPage from './components/AdminDashboardPage';
import AdminSettingsPage from './components/AdminSettingsPage';
import StoriesModeratorPage from './components/StoriesModeratorPage';
import AuthModal from './components/AuthModal';
import { AboutPage, RulesPage, FeedbackPage, ContactPage } from './components/Pages';
import { Wrench, ShieldCheck, Lock } from 'lucide-react';

export const UserViewContext = React.createContext();

function MainRouter() {
  const [currentView, setCurrentView] = useState('landing');
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);

  const { user, isAdmin, canCreateStory, settings, openAuthModal } = useAuth();
  const { lang } = useLanguage();

  const [profileSourceView, setProfileSourceView] = useState('stories-list');

  // Route navigation wrapper enforcing story creation permissions & limits
  const handleNavigate = (view) => {
    if (view === 'publicProfile') {
      setProfileSourceView(currentView);
    }
    
    if (view === 'wizard') {
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (!canCreateStory) {
        alert(lang === 'ar'
          ? 'لقد استنفدت حصة القصص المجانية المتاحة (5 قصص). يرجى الترقية وشراء إحدى الباقات للاستمرار في التأليف.'
          : 'You have used all your free stories quota (5 stories). Please purchase a package to craft more stories.');
        setCurrentView('packages');
        return;
      }
    }
    setCurrentView(view);
  };

  // Maintenance Mode Gate: Blocks platform for non-admins if active
  if (settings?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white font-arabic text-center">
        <div className="max-w-md p-8 rounded-3xl glass-panel border border-slate-800 space-y-6 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/20 text-rose-500 flex items-center justify-center animate-bounce">
            <Wrench className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">المنصة في وضع الصيانة حالياً ⏳</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              نقوم حالياً بإجراء بعض التحسينات والتحديثات الهامة لتقديم أفضل تجربة لتأليف ورواية القصص. سنعود للعمل قريباً جداً!
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => openAuthModal('login')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors flex items-center gap-2 mx-auto"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>دخول مدير النظام (Admin Login)</span>
            </button>
          </div>
        </div>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Header */}
      <Header currentView={currentView} setCurrentView={handleNavigate} />

      {/* View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            setCurrentView={handleNavigate}
            setSelectedStoryId={setSelectedStoryId}
          />
        )}

        {currentView === 'wizard' && (
          <StoryGenerationWizard
            setCurrentView={handleNavigate}
            setSelectedStoryId={setSelectedStoryId}
          />
        )}

        {currentView === 'categories' && (
          <StoryCategoriesPage
            setCurrentView={handleNavigate}
            setSelectedCategoryFilter={setSelectedCategoryFilter}
          />
        )}

        {currentView === 'stories-list' && (
          <GeneratedStoriesPage
            setCurrentView={handleNavigate}
            selectedCategoryFilter={selectedCategoryFilter}
            setSelectedStoryId={setSelectedStoryId}
            setViewingUserId={setViewingUserId}
          />
        )}

        {currentView === 'reader' && (
          <StoryReaderPage
            storyId={selectedStoryId}
            setCurrentView={handleNavigate}
            setViewingUserId={setViewingUserId}
          />
        )}

        {currentView === 'profile' && (
          <UserProfilePage setCurrentView={handleNavigate} />
        )}

        {currentView === 'packages' && (
          <PackagesPricingPage setCurrentView={handleNavigate} />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardPage setCurrentView={handleNavigate} />
        )}

        {currentView === 'admin-settings' && (
          <AdminSettingsPage setCurrentView={handleNavigate} />
        )}

        {currentView === 'stories-moderator' && (
          <StoriesModeratorPage
            setCurrentView={handleNavigate}
            setSelectedStoryId={setSelectedStoryId}
          />
        )}

        {currentView === 'about' && <AboutPage setCurrentView={handleNavigate} />}
        {currentView === 'rules' && <RulesPage setCurrentView={handleNavigate} />}
        {currentView === 'contact' && <ContactPage setCurrentView={handleNavigate} />}

        {currentView === 'publicProfile' && (
          <PublicProfilePage
            userId={viewingUserId}
            setCurrentView={handleNavigate}
            setViewingStoryId={setSelectedStoryId}
            sourceView={profileSourceView}
          />
        )}
      </main>

      {/* Global Auth Modal for Login, Registration & OTP */}
      <AuthModal />

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </LanguageProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Users, BookOpen, Clock, ShieldCheck, CheckCircle2, XCircle, Search, Filter, RefreshCw, AlertCircle, Eye, ChevronDown, Award, TrendingUp, Sparkles, UserCheck } from 'lucide-react';

export default function AdminDashboardPage({ setCurrentView }) {
  const { user, token, isAdmin } = useAuth();
  const { lang } = useLanguage();

  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Preview School ID Modal
  const [selectedProofUrl, setSelectedProofUrl] = useState(null);
  const [processingReqId, setProcessingReqId] = useState(null);

  useEffect(() => {
    if (isAdmin && token) {
      fetchAdminData();
    }
  }, [isAdmin, token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, reqsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/story-maker-requests', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [statsData, usersData, reqsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        reqsRes.json()
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (usersData.success) setUsersList(usersData.users);
      if (reqsData.success) setTeacherRequests(reqsData.requests);
    } catch (err) {
      console.error('[Admin Dashboard Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCredits = async (userId, currentCredits) => {
    const promptMsg = lang === 'ar' ? 'أدخل عدد القصص الإضافية لإضافتها للمستخدم:' : 'Enter additional story credits to grant user:';
    const additional = prompt(promptMsg, '10');
    if (!additional || isNaN(additional)) return;
    const nextCredits = (parseInt(currentCredits, 10) || 0) + parseInt(additional, 10);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ freeStoriesLeft: nextCredits })
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, freeStoriesLeft: nextCredits } : u));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDecideRequest = async (requestId, action) => {
    setProcessingReqId(requestId);
    try {
      const res = await fetch(`/api/admin/story-maker-requests/${requestId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setTeacherRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
        fetchAdminData();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingReqId(null);
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
          {lang === 'ar' ? 'هذه الصفحة مخصصة لمدير النظام (Admin) فقط.' : 'This page is restricted to Administrators only.'}
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

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${lang === 'ar' ? 'font-arabic' : ''} space-y-8 animate-fade-in`}>
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
            <span>{lang === 'ar' ? 'لوحة تحكم مدير النظام (Administrator Dashboard)' : 'Administrator Dashboard'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar' ? 'إدارة المستخدمين، الصلاحيات، طلبات المعلمين، وإحصائيات المنصة' : 'Manage users, role permissions, teacher verifications, and analytics'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('stories-moderator')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'مشرف القصص 📚' : 'Stories Moderator 📚'}</span>
          </button>
          <button
            onClick={() => setCurrentView('admin-settings')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
          >
            {lang === 'ar' ? 'إعدادات المنصة ⚙️' : 'Platform Settings ⚙️'}
          </button>
          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
            title={lang === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
              ● {stats.activeToday} {lang === 'ar' ? 'مستخدم نشط اليوم' : 'active today'}
            </span>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'إجمالي القصص' : 'Total Stories'}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalStories}</div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
              +{stats.storiesThisWeek} {lang === 'ar' ? 'قصة هذا الأسبوع' : 'stories this week'}
            </span>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'طلبات المعلمين المعلقة' : 'Pending Teachers'}</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.pendingTeacherRequests}</div>
            <span className="text-[11px] text-slate-400 block">
              {lang === 'ar' ? 'بانتظار الاعتماد بالأسفل' : 'awaiting review below'}
            </span>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{lang === 'ar' ? 'حسابات غير مفعلة (OTP)' : 'Unverified (OTP)'}</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.pendingVerifications}</div>
            <span className="text-[11px] text-slate-400 block">
              {lang === 'ar' ? 'لم يكتمل تأكيد الرمز' : 'pending email verification'}
            </span>
          </div>
        </div>
      )}

      {/* SECTION 1: TEACHER (STORY MAKER) APPROVAL QUEUE */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <span>{lang === 'ar' ? 'طلبات ترقية المعلمين (Story Maker) وبطاقات العمل' : 'Teacher Upgrade Requests & School IDs'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'مراجعة البطاقة المدرسية المرفقة لتفعيل صلاحيات التأليف' : 'Verify attached school ID cards to grant authoring privileges'}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600">
            {teacherRequests.filter(r => r.status === 'pending').length} {lang === 'ar' ? 'طلب جديد' : 'new requests'}
          </span>
        </div>

        {teacherRequests.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400">
            {lang === 'ar' ? 'لا توجد طلبات ترقية معلقة حالياً.' : 'No pending teacher upgrade requests.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="pb-3 font-bold">{lang === 'ar' ? 'اسم مقدم الطلب' : 'Applicant'}</th>
                  <th className="pb-3 font-bold">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="pb-3 font-bold">{lang === 'ar' ? 'اسم المدرسة' : 'School'}</th>
                  <th className="pb-3 font-bold">{lang === 'ar' ? 'بطاقة المعلم' : 'School ID'}</th>
                  <th className="pb-3 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="pb-3 font-bold text-center">{lang === 'ar' ? 'الإجراء' : 'Decision'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {teacherRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white">{req.userName}</td>
                    <td className="py-3.5 text-slate-500 font-mono">{req.userEmail}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300">{req.schoolName || (lang === 'ar' ? 'غير محدد' : 'Not specified')}</td>
                    <td className="py-3.5">
                      <button
                        onClick={() => setSelectedProofUrl(req.schoolIdProofUrl)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold hover:bg-indigo-500/20 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'معاينة البطاقة' : 'View ID'}</span>
                      </button>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                        req.status === 'rejected' ? 'bg-rose-500/10 text-rose-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {req.status === 'approved'
                          ? (lang === 'ar' ? 'معتمد ✓' : 'Approved ✓')
                          : req.status === 'rejected'
                          ? (lang === 'ar' ? 'مرفوض ✕' : 'Rejected ✕')
                          : (lang === 'ar' ? 'قيد المراجعة' : 'Pending')}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={processingReqId === req.id}
                            onClick={() => handleDecideRequest(req.id, 'approve')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                          >
                            {lang === 'ar' ? 'اعتماد' : 'Approve'}
                          </button>
                          <button
                            disabled={processingReqId === req.id}
                            onClick={() => handleDecideRequest(req.id, 'reject')}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
                          >
                            {lang === 'ar' ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: USER MANAGEMENT TABLE */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? `إدارة المستخدمين والصلاحيات (${filteredUsers.length})` : `User & Permissions Management (${filteredUsers.length})`}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'تعديل الأدوار، رصيد القصص، وتفعيل أو إيقاف الحسابات' : 'Edit roles, story credits balance, and activate or suspend accounts'}
            </p>
          </div>

          {/* Search & Role Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none"
            >
              <option value="ALL">{lang === 'ar' ? 'كافة الأدوار' : 'All Roles'}</option>
              <option value="Admin">{lang === 'ar' ? 'مدير النظام (Admin)' : 'Admin'}</option>
              <option value="Story Maker">{lang === 'ar' ? 'صانع قصص (Story Maker)' : 'Story Maker'}</option>
              <option value="Story Reader">{lang === 'ar' ? 'قارئ قصص (Story Reader)' : 'Story Reader'}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                <th className="pb-3 font-bold">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="pb-3 font-bold">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                <th className="pb-3 font-bold">{lang === 'ar' ? 'الدور الحالي' : 'Current Role'}</th>
                <th className="pb-3 font-bold">{lang === 'ar' ? 'رصيد القصص' : 'Story Credits'}</th>
                <th className="pb-3 font-bold">{lang === 'ar' ? 'القصص المؤلفة' : 'Stories Created'}</th>
                <th className="pb-3 font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="pb-3 font-bold text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          u.firstName ? u.firstName[0] : 'U'
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {`${u.firstName || ''} ${u.lastName || ''}`.trim() || (lang === 'ar' ? 'مستخدم جديد' : 'New User')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {lang === 'ar' ? 'مجلد:' : 'Folder:'} {u.userFolder}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 font-mono text-slate-500">{u.email}</td>

                  <td className="py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[11px] focus:outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Story Maker">Story Maker</option>
                      <option value="Story Reader">Story Reader</option>
                    </select>
                  </td>

                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {u.role === 'Admin' ? (lang === 'ar' ? 'غير محدود' : 'Unlimited') : u.freeStoriesLeft}
                      </span>
                      {u.role !== 'Admin' && (
                        <button
                          onClick={() => handleAddCredits(u.id, u.freeStoriesLeft)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]"
                          title={lang === 'ar' ? 'إضافة رصيد قصص' : 'Add story credits'}
                        >
                          {lang === 'ar' ? '+ إضافة' : '+ Add'}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 font-bold text-slate-700 dark:text-slate-300">{u.storiesCount || 0}</td>

                  <td className="py-3.5">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                      u.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {u.status === 'active' ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'موقوف' : 'Suspended')}
                    </span>
                  </td>

                  <td className="py-3.5 text-center">
                    {u.id !== user.id && (
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                          u.status === 'active'
                            ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.status === 'active' ? (lang === 'ar' ? 'إيقاف الحساب' : 'Suspend Account') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PREVIEW SCHOOL ID PROOF IMAGE */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-2xl w-full p-6 rounded-3xl glass-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                {lang === 'ar' ? 'معاينة بطاقة المعلم المدرسية المرفقة' : 'Preview Attached School Teacher ID'}
              </h4>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="w-full max-h-[70vh] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2">
              <img src={selectedProofUrl} alt="School ID Proof" className="max-h-[65vh] object-contain rounded-xl" />
            </div>

            <div className={lang === 'ar' ? 'text-left pt-2' : 'text-right pt-2'}>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

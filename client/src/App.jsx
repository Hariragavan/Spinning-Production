import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardPage from './pages/DashboardPage';
import OperationsPage from './pages/OperationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PayrollPage from './pages/PayrollPage';
import AdminPage from './pages/AdminPage';
import TvModePage from './pages/TvModePage';
import LoginPage from './pages/LoginPage';

function AppContent() {
  const { user, loading, logout } = useAuth();
  // Fresh open ALWAYS defaults to TV Dashboard
  const [activeTab, setActiveTab] = useState('tv-mode');
  const [activeShift, setActiveShift] = useState('I');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check URL path on mount
  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/login') {
      setActiveTab('login');
    } else if (path === '/dashboard' && user && user.role !== 'tv_display') {
      setActiveTab('dashboard');
    } else {
      // Default freshly opened link goes directly to TV dashboard
      setActiveTab('tv-mode');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-600">Initializing SCM Textile Spinners Platform...</span>
        </div>
      </div>
    );
  }

  // 1. If in Shop TV Signage mode (Default View)
  if (activeTab === 'tv-mode') {
    return (
      <TvModePage
        onExit={() => {
          if (user && user.role !== 'tv_display') {
            setActiveTab('dashboard');
          } else {
            setActiveTab('login');
          }
        }}
        onOpenLogin={() => setActiveTab('login')}
      />
    );
  }

  // 2. If on dedicated Login page
  if (activeTab === 'login') {
    return (
      <LoginPage
        onBackToDashboard={() => setActiveTab('tv-mode')}
        onLoginSuccess={() => setActiveTab('dashboard')}
      />
    );
  }

  // 3. Protected Management Portal: Must be logged in to edit or see management datas
  if (!user || user.role === 'tv_display') {
    return (
      <LoginPage
        onBackToDashboard={() => setActiveTab('tv-mode')}
        onLoginSuccess={() => setActiveTab('dashboard')}
      />
    );
  }

  // 4. Authenticated Staff Management Portal
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Left Sidebar Shell */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShift={activeShift}
        setActiveShift={setActiveShift}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar with Full Screen, TV Mode, and Login/User Profile */}
        <TopHeader
          onOpenLogin={() => setActiveTab('login')}
          onOpenTvMode={() => setActiveTab('tv-mode')}
        />

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              activeShift={activeShift}
              onSwitchToTv={() => setActiveTab('tv-mode')}
              onGoToUpload={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'operations' && (
            <OperationsPage
              activeShift={activeShift}
              setActiveShift={setActiveShift}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage
              activeShift={activeShift}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollPage />
          )}

          {activeTab === 'admin' && (
            <AdminPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { StaffPage } from './pages/StaffPage';
import { FaceEnrollmentPage } from './pages/FaceEnrollmentPage';
import { GeofencePage } from './pages/GeofencePage';
import { LeavePage } from './pages/LeavePage';
import { ShiftsPage } from './pages/ShiftsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDebugPage } from './pages/AdminDebugPage';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Set default tab based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'staff') {
        setCurrentTab('attendance');
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-500">
          Loading Staff FRS & Attendance System...
        </p>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-x-hidden min-w-0">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'attendance' && <AttendancePage />}
          {currentTab === 'staff' && <StaffPage />}
          {currentTab === 'enrollment' && <FaceEnrollmentPage />}
          {currentTab === 'geofence' && <GeofencePage />}
          {currentTab === 'leaves' && <LeavePage />}
          {currentTab === 'shifts' && <ShiftsPage />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'audit' && <AuditLogsPage />}
          {currentTab === 'diagnostics' && <AdminDebugPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


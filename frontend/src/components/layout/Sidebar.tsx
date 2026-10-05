import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Camera,
  MapPin,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  Bell,
  X,
  ScanFace,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'staff';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'principal', 'attendance_manager'],
    },
    {
      id: 'staff',
      label: 'Staff Directory',
      icon: Users,
      roles: ['super_admin', 'admin', 'principal', 'attendance_manager'],
    },
    {
      id: 'attendance',
      label: 'Attendance (FRS)',
      icon: ScanFace,
      roles: ['super_admin', 'admin', 'principal', 'attendance_manager', 'staff'],
    },
    {
      id: 'enrollment',
      label: 'Face Recognition',
      icon: Camera,
      roles: ['super_admin', 'admin'],
    },
    {
      id: 'leaves',
      label: 'Leave',
      icon: CalendarDays,
      roles: ['super_admin', 'admin', 'principal', 'attendance_manager', 'staff'],
    },
    {
      id: 'shifts',
      label: 'Shifts & Hours',
      icon: Clock,
      roles: ['super_admin', 'admin', 'principal'],
    },
    {
      id: 'geofence',
      label: 'Campuses & Geofences',
      icon: MapPin,
      roles: ['super_admin', 'admin'],
    },
    {
      id: 'reports',
      label: 'Reports & Muster',
      icon: FileSpreadsheet,
      roles: ['super_admin', 'admin', 'principal', 'attendance_manager'],
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: ShieldCheck,
      roles: ['super_admin', 'admin'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: ['super_admin', 'admin'],
    },
  ];

  const allowedItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-[57px] left-0 h-screen md:h-[calc(100vh-57px)] w-56 bg-white border-r border-slate-200 flex flex-col z-30 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="p-3.5 border-b border-slate-200 md:hidden flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Navigation</span>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Compact Footer Status */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-medium text-[11px]">System Active • FRS Enforced</span>
          </div>
        </div>
      </aside>
    </>
  );
};


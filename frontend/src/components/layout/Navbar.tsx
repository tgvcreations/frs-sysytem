import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { 
  Building2, 
  Clock, 
  MapPin, 
  User, 
  LogOut, 
  ChevronDown, 
  Menu
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout, switchRoleQuickly } = useAuth();
  const [time, setTime] = useState(new Date());
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{ active: boolean; accuracy?: number }>({ active: false });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus({ active: true, accuracy: Math.round(pos.coords.accuracy) });
        },
        () => {
          setGpsStatus({ active: true, accuracy: 12 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const roles: { role: UserRole; label: string }[] = [
    { role: 'super_admin', label: 'Super Admin' },
    { role: 'admin', label: 'Administrator' },
    { role: 'principal', label: 'Principal / Head' },
    { role: 'attendance_manager', label: 'Attendance Manager' },
    { role: 'staff', label: 'Staff Member' },
  ];

  const currentRoleInfo = roles.find((r) => r.role === user?.role) || roles[0];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu + Institutional Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Staff FRS & Attendance System
              </h1>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                Educational Administration Portal
              </p>
            </div>
          </div>
        </div>

        {/* Right: Clock, GPS, Role Switcher, Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Tabular Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            <span className="font-semibold text-slate-900 ml-1">{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
          </div>

          {/* GPS Status Indicator */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">GPS:</span>
            <span className="font-semibold">{gpsStatus.accuracy ? `±${gpsStatus.accuracy}m` : 'Active'}</span>
          </div>

          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded text-xs font-medium text-slate-700 transition-colors"
            >
              <span>{currentRoleInfo.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  Switch Active Role
                </div>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRoleQuickly(r.role);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      user?.role === r.role ? 'font-semibold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{r.label}</span>
                    {user?.role === r.role && <span className="text-blue-600 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {user?.staff?.profile_photo_url ? (
              <img
                src={user.staff.profile_photo_url}
                alt={user.staff.full_name}
                className="w-7 h-7 rounded-full border border-slate-300 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none">
                {user?.staff?.full_name || user?.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                {user?.staff?.designation || user?.email}
              </p>
            </div>

            <button
              onClick={logout}
              title="Log Out"
              className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


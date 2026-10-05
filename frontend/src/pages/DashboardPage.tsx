import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats, AttendanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarDays,
  Plus,
  ScanFace,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [recentFeed, setRecentFeed] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, chartsData, feedData] = await Promise.all([
        api.getDashboardStats(),
        api.getDashboardCharts(),
        api.getRecentFeed(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setRecentFeed(feedData.recent || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const adminName = user?.staff?.full_name || (user?.email ? user.email.split('@')[0] : 'Admin');

  const totalStaff = stats?.total_staff || 0;
  const presentToday = stats?.present_today || 0;
  const absentToday = stats?.absent_today || 0;
  const onLeaveToday = stats?.on_leave_today || 0;
  const lateToday = stats?.late_today || 0;

  const presentPercent = totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0;
  const latePercent = totalStaff > 0 ? Math.round((lateToday / totalStaff) * 100) : 0;
  const absentPercent = totalStaff > 0 ? Math.round((absentToday / totalStaff) * 100) : 0;
  const onLeavePercent = totalStaff > 0 ? Math.round((onLeaveToday / totalStaff) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Section: Greeting & Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {greeting}, {adminName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Institutional Attendance Overview for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('attendance')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ScanFace className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => onNavigate('staff')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Staff</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Export Report</span>
          </button>
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-md text-xs transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Row (5 Clean Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Staff */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{totalStaff}</span>
            <span className="text-xs text-slate-500">registered</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700">{presentToday}</span>
            <span className="text-xs text-emerald-600">({presentPercent}%)</span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Absent Today</span>
            <UserX className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-red-700">{absentToday}</span>
            <span className="text-xs text-red-600">({absentPercent}%)</span>
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>On Leave</span>
            <CalendarDays className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-700">{onLeaveToday}</span>
            <span className="text-xs text-purple-600">approved</span>
          </div>
        </div>

        {/* Late Today */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Late Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-700">{lateToday}</span>
            <span className="text-xs text-amber-600">past grace</span>
          </div>
        </div>
      </div>

      {/* Attendance Overview & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Attendance Overview & Department Summary (7 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Today's Attendance Overview</h2>
            <p className="text-xs text-slate-500">Breakdown of active staff status for today</p>
          </div>

          {/* Clean Segmented Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${presentPercent}%` }} className="bg-emerald-600" title={`Present: ${presentPercent}%`} />
              <div style={{ width: `${latePercent}%` }} className="bg-amber-500" title={`Late: ${latePercent}%`} />
              <div style={{ width: `${onLeavePercent}%` }} className="bg-purple-500" title={`On Leave: ${onLeavePercent}%`} />
              <div style={{ width: `${absentPercent}%` }} className="bg-red-500" title={`Absent: ${absentPercent}%`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                <span>Present ({presentPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Late ({latePercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                <span>On Leave ({onLeavePercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                <span>Absent ({absentPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Department Attendance
            </h3>
            <div className="space-y-2 text-xs">
              {charts?.department_breakdown?.map((d: any, idx: number) => {
                const total = parseInt(d.total_staff, 10) || 1;
                const pres = parseInt(d.present_today, 10) || 0;
                const pct = Math.round((pres / total) * 100);
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-800 w-44 truncate">{d.department}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-slate-600 w-16 text-right">
                      {pres}/{total} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Attendance Feed (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Attendance</h2>
                <p className="text-xs text-slate-500">Latest recorded check-ins and check-outs</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">{recentFeed.length} records today</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {recentFeed.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No attendance records logged today yet.
                </div>
              ) : (
                recentFeed.slice(0, 8).map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={r.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name || 'Staff')}`}
                        alt={r.full_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{r.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {r.staff_code} • {r.department}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          r.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'Late'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : r.status === 'Half Day'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {r.status}
                      </span>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {r.check_out_time ? `Out: ${r.check_out_time}` : `In: ${r.check_in_time}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Full Muster Roll →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

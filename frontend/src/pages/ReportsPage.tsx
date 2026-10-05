import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CampusGeofence } from '../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  UserCheck,
  Building2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [campuses, setCampuses] = useState<CampusGeofence[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [department, setDepartment] = useState<string>('all');
  const [campusId, setCampusId] = useState<string>('all');

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [musterData, campusData] = await Promise.all([
        api.getMusterRoll({
          start_date: startDate,
          end_date: endDate,
          department,
          campus_id: campusId,
        }),
        api.getCampuses(),
      ]);

      setRecords(musterData.records || []);
      setCampuses(campusData.campuses || []);
    } catch (err: any) {
      console.error('Failed to load muster roll:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate, department, campusId]);

  const handleExportCsv = async () => {
    try {
      const csvData = await api.exportCsv({
        start_date: startDate,
        end_date: endDate,
        department,
        campus_id: campusId,
      });
      const blob = new Blob([typeof csvData === 'string' ? csvData : JSON.stringify(csvData)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_muster_roll_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const url = api.getExportCsvUrl({
        start_date: startDate,
        end_date: endDate,
        department,
        campus_id: campusId,
      });
      window.open(url, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Aggregates
  const totalPresent = records.filter((r) => r.status === 'Present' || r.status === 'Full Day').length;
  const totalLate = records.filter((r) => r.status === 'Late').length;
  const totalHours = Math.round(records.reduce((acc, r) => acc + (parseFloat(r.working_hours) || 0), 0) * 10) / 10;

  return (
    <div className="space-y-5">
      {/* Printable Institutional Header (Hidden on screen, visible on print) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-xl font-black uppercase font-serif">
          Staff FRS & Attendance System
        </h1>
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-700">
          Staff Biometric Facial Recognition & Attendance Muster Roll
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Date Range: {startDate} to {endDate} • Generated on {new Date().toLocaleString('en-IN')}
        </p>
      </div>

      {/* Screen Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Muster Roll & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query biometric check-in/out records, cumulative working hours, and export official muster roll sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="print:hidden bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Departments</option>
              <option value="Prathamika Patashala">Prathamika Patashala</option>
              <option value="Kalashala Junior College">Kalashala Junior College</option>
              <option value="Kalashala Degree College">Kalashala Degree College</option>
              <option value="Administration">Administration</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campus</label>
            <select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Filtered Records</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{records.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Present</p>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalPresent}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{totalLate}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cumulative Hours</p>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{totalHours} hrs</p>
        </div>
      </div>

      {/* Muster Roll Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3.5">Staff Details</th>
                <th className="py-2.5 px-3.5">Check In</th>
                <th className="py-2.5 px-3.5">Check Out</th>
                <th className="py-2.5 px-3.5">Total Hours</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Verification</th>
                <th className="py-2.5 px-3.5">Campus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading muster roll entries...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No attendance records for the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-700">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-bold text-slate-900">{r.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        <span className="text-blue-700">{r.staff_code}</span> • {r.department}
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-800">
                      {r.check_in_time || '—'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-800">
                      {r.check_out_time || '—'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {r.working_hours ? `${r.working_hours}h` : '—'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'Present' || r.status === 'Full Day'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'Half Day'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : r.status === 'Late'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : r.status === 'On Leave'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="text-[11px] font-mono text-slate-700">
                        {r.verification_method}
                      </span>
                      {r.face_match_confidence && (
                        <span className="ml-1 text-[10px] text-emerald-700 font-semibold">
                          ({r.face_match_confidence}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {r.campus_name || 'Main Campus'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Signature Blocks */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-12 text-center text-xs text-slate-700">
        <div>
          <div className="border-t border-slate-900 pt-2 font-bold">Attendance In-Charge</div>
          <p className="text-[10px] text-slate-500">Prathamika Patashala / Kalashala</p>
        </div>
        <div>
          <div className="border-t border-slate-900 pt-2 font-bold">Administrative Officer</div>
          <p className="text-[10px] text-slate-500">Administration Office</p>
        </div>
        <div>
          <div className="border-t border-slate-900 pt-2 font-bold">Principal & Correspondent</div>
          <p className="text-[10px] text-slate-500">Head of Institution</p>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Shift } from '../types';
import { Clock, Plus, Edit2, Trash2, Save, X, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<Partial<Shift>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getShifts();
      setShifts(data.shifts || []);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleOpenAdd = () => {
    setActiveShift(null);
    setFormData({
      name: 'New Shift Schedule',
      code: `SH-NEW-${Date.now().toString().slice(-3)}`,
      start_time: '09:00',
      end_time: '16:30',
      grace_period_minutes: 15,
      half_day_threshold_hours: 4.0,
      full_day_threshold_hours: 6.5,
      is_active: true,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sh: Shift) => {
    setActiveShift(sh);
    setFormData({ ...sh });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.start_time || !formData.end_time) {
      setErrorMsg('Name, code, start time, and end time are required.');
      return;
    }

    try {
      if (activeShift) {
        await api.updateShift(activeShift.id, formData);
      } else {
        await api.createShift(formData);
      }
      setModalOpen(false);
      loadShifts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save shift.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete shift '${name}'?`)) return;
    try {
      await api.deleteShift(id);
      loadShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete shift.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Shift Management & Work Schedules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational hours, check-in grace windows, and daily attendance threshold rules.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shift Schedule</span>
        </button>
      </div>

      {/* Policy Guidance Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-700 shrink-0" />
          <p className="text-slate-700">
            <strong>Attendance Policy:</strong> Arrival within the grace window is recorded on-time. Check-ins beyond the grace period are automatically marked as <strong>Late</strong>. Total hours between check-in & check-out dictate <strong>Full Day (≥7.0h)</strong> vs <strong>Half Day (≥4.0h)</strong>.
          </p>
        </div>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map((sh) => (
          <div
            key={sh.id}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {sh.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{sh.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    sh.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {sh.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-md space-y-1.5 text-xs text-slate-700 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Working Window:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {sh.start_time} - {sh.end_time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-in Grace:</span>
                  <span className="font-semibold text-slate-900">{sh.grace_period_minutes} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Half-day Threshold:</span>
                  <span className="font-medium text-slate-800">{sh.half_day_threshold_hours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Full-day Threshold:</span>
                  <span className="font-medium text-slate-800">{sh.full_day_threshold_hours} hrs</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>Assigned Staff:</span>
                  <span className="font-semibold text-slate-700">{sh.staff_count || 0} members</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenEdit(sh)}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(sh.id, sh.name)}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete Shift"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h2 className="font-bold text-slate-900 text-sm">
                {activeShift ? 'Edit Shift Schedule' : 'Add Shift Schedule'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Identification Code</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    value={formData.start_time || '09:00'}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    value={formData.end_time || '16:30'}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grace (mins)</label>
                  <input
                    type="number"
                    value={formData.grace_period_minutes || 15}
                    onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value, 10) || 15 })}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Half Day (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.half_day_threshold_hours || 4.0}
                    onChange={(e) => setFormData({ ...formData, half_day_threshold_hours: parseFloat(e.target.value) || 4.0 })}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Day (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.full_day_threshold_hours || 6.5}
                    onChange={(e) => setFormData({ ...formData, full_day_threshold_hours: parseFloat(e.target.value) || 6.5 })}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 font-mono text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700"
                />
                <span className="font-semibold text-slate-700">Shift Schedule Is Active</span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Save Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


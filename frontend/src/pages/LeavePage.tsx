import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeaveRequest, Staff } from '../types';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  X,
  AlertCircle,
} from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Maternity Leave'>('Casual Leave');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [applyError, setApplyError] = useState<string | null>(null);

  // Review Remarks Modal State
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [remarks, setRemarks] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leaveData, staffData] = await Promise.all([
        api.getLeaves({ status: selectedStatus }),
        api.getStaffList(),
      ]);
      setLeaves(leaveData.leaves || []);
      setStaffList(staffData.staff || []);

      if (user?.role === 'staff' && user.staff_id) {
        setTargetStaffId(user.staff_id);
      } else if (staffData.staff && staffData.staff.length > 0 && !targetStaffId) {
        setTargetStaffId(staffData.staff[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load leaves:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const handleApplyLeave = async () => {
    setApplyError(null);
    if (!targetStaffId || !startDate || !endDate || !reason) {
      setApplyError('Please fill all fields.');
      return;
    }

    try {
      await api.applyLeave({
        staff_id: targetStaffId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      setShowApplyModal(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      loadData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave.');
    }
  };

  const handleConfirmReview = async () => {
    if (!reviewingLeave) return;

    try {
      await api.updateLeaveStatus(reviewingLeave.id, {
        status: actionType,
        reviewer_remarks: remarks,
      });
      setReviewingLeave(null);
      setRemarks('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update leave.');
    }
  };

  const canApprove = ['super_admin', 'admin', 'principal'].includes(user?.role || '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Management & Absence Approvals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit leave requests, review faculty absences, and synchronize approved time-off with attendance records.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
              selectedStatus === status
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status === 'all' ? 'All Applications' : status}
          </button>
        ))}
      </div>

      {/* Leaves Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Staff Member</th>
                <th className="py-2.5 px-3.5">Leave Type</th>
                <th className="py-2.5 px-3.5">Duration</th>
                <th className="py-2.5 px-3.5">Reason</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Reviewer Remarks</th>
                {canApprove && <th className="py-2.5 px-3.5 text-right">Review Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading leave applications...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No leave requests found for the selected filter.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <p className="font-bold text-slate-900">{l.full_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {l.department} • <span className="font-mono text-blue-700">{l.staff_code}</span>
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                      {l.leave_type}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-700">
                      {l.start_date} <span className="text-slate-400">to</span> {l.end_date}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">
                      {l.reason}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          l.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : l.status === 'Rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[11px] text-slate-500">
                      {l.reviewer_remarks || (l.approved_by ? `Reviewed by ${l.approved_by}` : '—')}
                    </td>
                    {canApprove && (
                      <td className="py-2.5 px-3.5 text-right">
                        {l.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setReviewingLeave(l);
                                setActionType('Approved');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setReviewingLeave(l);
                                setActionType('Rejected');
                              }}
                              className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Decided</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h2 className="font-bold text-slate-900 text-sm">
                Submit Leave Application
              </h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{applyError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {user?.role !== 'staff' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff Member</label>
                  <select
                    value={targetStaffId}
                    onChange={(e) => setTargetStaffId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.staff_id} - {s.full_name} ({s.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                  <option value="Maternity Leave">Maternity / Special Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  placeholder="Provide justification..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLeave}
                className="px-4 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Remarks Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <h2 className="font-bold text-slate-900 text-sm">
              Confirm {actionType} for {reviewingLeave.full_name}
            </h2>
            <p className="text-xs text-slate-500">
              {reviewingLeave.leave_type} ({reviewingLeave.start_date} to {reviewingLeave.end_date})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reviewer Remarks / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Optional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setReviewingLeave(null)}
                className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReview}
                className={`px-4 py-1.5 rounded-md font-semibold text-xs text-white shadow-sm transition-colors ${
                  actionType === 'Approved' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


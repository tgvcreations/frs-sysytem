import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Staff, CampusGeofence, Shift } from '../types';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Eye,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
  Filter,
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [campuses, setCampuses] = useState<CampusGeofence[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFaceStatus, setSelectedFaceStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('full_name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Modal State (Add / Edit / View Profile)
  const [modalMode, setModalMode] = useState<'none' | 'add' | 'edit' | 'view'>('none');
  const [activeStaff, setActiveStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffData, campusData, shiftData] = await Promise.all([
        api.getStaffList({
          search,
          department: selectedDept,
          campus_id: selectedCampus,
          employment_status: selectedStatus,
          face_status: selectedFaceStatus,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        api.getCampuses(),
        api.getShifts(),
      ]);

      setStaffList(staffData.staff || []);
      setCampuses(campusData.campuses || []);
      setShifts(shiftData.shifts || []);
    } catch (err: any) {
      console.error('Failed to load staff records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedDept, selectedCampus, selectedStatus, selectedFaceStatus, sortBy, sortOrder]);

  const handleOpenAddModal = () => {
    setFormData({
      staff_id: `VPP-2026-${String(staffList.length + 1).padStart(3, '0')}`,
      full_name: '',
      gender: 'Male',
      date_of_birth: '1990-01-01',
      phone: '+91 ',
      email: '',
      address: 'Telangana, India',
      designation: 'Assistant Teacher',
      department: 'Prathamika Patashala',
      joining_date: new Date().toISOString().split('T')[0],
      employment_status: 'Active',
      assigned_shift_id: shifts[0]?.id || 'shift_primary_morning',
      assigned_campus_id: campuses[0]?.id || 'campus_main',
      face_enrollment_status: 'Not Enrolled',
    });
    setFormError(null);
    setModalMode('add');
  };

  const handleOpenEditModal = (st: Staff) => {
    setActiveStaff(st);
    setFormData({ ...st });
    setFormError(null);
    setModalMode('edit');
  };

  const handleOpenViewModal = (st: Staff) => {
    setActiveStaff(st);
    setModalMode('view');
  };

  const handleSaveStaff = async () => {
    setFormError(null);
    if (!formData.staff_id || !formData.full_name || !formData.email || !formData.phone) {
      setFormError('Staff ID, Full Name, Email, and Phone number are required.');
      return;
    }

    try {
      if (modalMode === 'add') {
        await api.createStaff(formData);
      } else if (modalMode === 'edit' && activeStaff) {
        await api.updateStaff(activeStaff.id, formData);
      }
      setModalMode('none');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff record.');
    }
  };

  const handleToggleStatus = async (st: Staff) => {
    const newStatus = st.employment_status === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Are you sure you want to change status of ${st.full_name} to ${newStatus}?`)) {
      return;
    }

    try {
      await api.toggleStaffStatus(st.id, newStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteStaff = async (st: Staff) => {
    if (!confirm(`CAUTION: Are you sure you want to completely remove ${st.full_name} (${st.staff_id})? All associated biometric data, attendance records, and login access will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await api.deleteStaff(st.id);
      setModalMode('none');
      await loadData();
      alert(res.message || `Staff member ${st.full_name} removed successfully.`);
    } catch (err: any) {
      console.error('Delete staff error:', err);
      alert(err.message || 'Failed to delete staff record.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Registry & Personnel Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty, administration, and support staff records management, face enrollment, and shift assignments.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, ID, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Departments</option>
              <option value="Prathamika Patashala">Prathamika Patashala</option>
             
          
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Probation">On Probation</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Biometric Status Filter */}
          <div>
            <select
              value={selectedFaceStatus}
              onChange={(e) => setSelectedFaceStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="all">All FRS Status</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Not Enrolled">Not Enrolled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3.5">Staff Details</th>
                <th className="py-2.5 px-3.5">Staff ID & Dept</th>
                <th className="py-2.5 px-3.5">Contact</th>
                <th className="py-2.5 px-3.5">Campus & Shift</th>
                <th className="py-2.5 px-3.5">FRS Enrollment</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading personnel records...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No staff records found matching search filters.
                  </td>
                </tr>
              ) : (
                staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/85 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={st.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(st.full_name)}`}
                          alt={st.full_name}
                          className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{st.full_name}</p>
                          <p className="text-[11px] text-slate-500">{st.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="font-mono font-semibold text-blue-700">{st.staff_id}</span>
                      <p className="text-[11px] text-slate-500">{st.department}</p>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <p className="font-mono">{st.phone}</p>
                      <p className="text-[11px] text-slate-400">{st.email}</p>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-medium text-slate-800">{st.campus_name || 'Main Campus'}</p>
                      <p className="text-[11px] text-slate-500">{st.shift_name || 'Regular Shift'}</p>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          st.face_enrollment_status === 'Enrolled'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {st.face_enrollment_status === 'Enrolled' ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{st.face_enrollment_status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          st.employment_status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {st.employment_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenViewModal(st)}
                          title="View Profile Dossier"
                          className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(st)}
                          title="Edit Staff Member"
                          className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(st)}
                          title={st.employment_status === 'Active' ? 'Deactivate' : 'Reactivate'}
                          className={`p-1 rounded transition-colors ${
                            st.employment_status === 'Active'
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                              : 'text-amber-600 hover:text-emerald-700 hover:bg-slate-100'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(st)}
                          title="Delete Staff Member"
                          className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Add / Edit Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h2 className="font-bold text-slate-900 text-sm">
                {modalMode === 'add' ? 'Register New Staff Member' : `Edit Profile: ${formData.full_name}`}
              </h2>
              <button
                onClick={() => setModalMode('none')}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff ID Code</label>
                <input
                  type="text"
                  value={formData.staff_id || ''}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={formData.department || 'Prathamika Patashala'}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Prathamika Patashala">Prathamika Patashala</option>
                  
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Shift</label>
                <select
                  value={formData.assigned_shift_id || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_shift_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {shifts.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} ({sh.start_time} - {sh.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Campus</label>
                <select
                  value={formData.assigned_campus_id || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_campus_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={formData.joining_date || ''}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                <select
                  value={formData.employment_status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Active">Active</option>
                  <option value="On Probation">On Probation</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Profile Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.profile_photo_url || ''}
                  onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalMode('none')}
                className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaff}
                className="px-4 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Staff Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Profile Dossier Modal (4 Distinct Sections) */}
      {modalMode === 'view' && activeStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Staff Profile Dossier</h2>
                <p className="text-[11px] text-slate-500 font-mono">{activeStaff.staff_id}</p>
              </div>
              <button
                onClick={() => setModalMode('none')}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <img
                src={activeStaff.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}`}
                alt={activeStaff.full_name}
                className="w-16 h-16 rounded-md object-cover border border-slate-300 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                  {activeStaff.full_name}
                </h3>
                <p className="text-xs text-slate-600">{activeStaff.designation}</p>
                <p className="text-xs text-blue-700 font-medium">{activeStaff.department}</p>
              </div>
            </div>

            {/* 4 Distinct Sections */}
            <div className="space-y-3 text-xs">
              {/* Section 1: Personal Information */}
              <div className="border border-slate-200 rounded-md p-3">
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-2 text-blue-700">
                  1. Personal Information
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Gender:</span>
                    <p className="font-medium text-slate-800">{activeStaff.gender}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Date of Birth:</span>
                    <p className="font-medium text-slate-800">{activeStaff.date_of_birth}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Residential Address:</span>
                    <p className="font-medium text-slate-800">{activeStaff.address}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Employment & Shift */}
              <div className="border border-slate-200 rounded-md p-3">
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-2 text-blue-700">
                  2. Employment & Shift
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Joining Date:</span>
                    <p className="font-medium text-slate-800">{activeStaff.joining_date}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Employment Status:</span>
                    <p className="font-semibold text-slate-900">{activeStaff.employment_status}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Campus Assignment:</span>
                    <p className="font-medium text-slate-800">{activeStaff.campus_name || 'Main Campus'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Shift:</span>
                    <p className="font-medium text-slate-800">{activeStaff.shift_name || 'Regular Shift'}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Face Recognition & Security */}
              <div className="border border-slate-200 rounded-md p-3">
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-2 text-blue-700">
                  3. Face Recognition System (FRS)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Enrollment Status:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {activeStaff.face_enrollment_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Vector Embeddings:</span>
                    <p className="font-mono text-slate-800">
                      {activeStaff.face_enrollment_status === 'Enrolled' ? '128-D Biometric Registered' : 'Pending Capture'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Contact Details */}
              <div className="border border-slate-200 rounded-md p-3">
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-2 text-blue-700">
                  4. Contact Details
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-mono font-medium text-slate-800">{activeStaff.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium text-slate-800 truncate">{activeStaff.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setModalMode('none');
                  handleOpenEditModal(activeStaff);
                }}
                className="flex-1 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => handleDeleteStaff(activeStaff)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setModalMode('none')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


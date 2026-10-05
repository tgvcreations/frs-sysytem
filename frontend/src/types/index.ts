export type UserRole = 'super_admin' | 'admin' | 'principal' | 'attendance_manager' | 'staff';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  staff_id?: string | null;
  staff?: Staff | null;
}

export interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  profile_photo_url?: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  designation: string;
  department: string;
  joining_date: string;
  employment_status: 'Active' | 'On Probation' | 'Inactive' | 'Suspended';
  assigned_shift_id: string;
  assigned_campus_id: string;
  face_enrollment_status: 'Enrolled' | 'Not Enrolled' | 'Pending';
  enrolled_at?: string | null;
  campus_name?: string;
  shift_name?: string;
  shift_start?: string;
  shift_end?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CampusGeofence {
  id: string;
  name: string;
  code: string;
  address: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  geofence_type: 'circle' | 'polygon' | 'both';
  polygon_coordinates: [number, number][];
  allowed_accuracy_meters: number;
  tolerance_meters: number;
  is_active: boolean;
  staff_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  half_day_threshold_hours: number;
  full_day_threshold_hours: number;
  is_active: boolean;
  staff_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  staff_code?: string;
  full_name?: string;
  department?: string;
  designation?: string;
  profile_photo_url?: string;
  campus_name?: string;
  shift_name?: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_accuracy?: number | null;
  check_in_campus_id?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  status: 'Present' | 'Late' | 'Early Departure' | 'Half Day' | 'Full Day' | 'Absent' | 'On Leave';
  verification_method: 'FRS_GPS' | 'Manual_Correction' | 'Admin_Adjustment';
  face_match_confidence?: number | null;
  working_hours?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  staff_code?: string;
  full_name?: string;
  department?: string;
  designation?: string;
  profile_photo_url?: string;
  leave_type: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Maternity Leave' | 'Special Leave';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string | null;
  reviewer_remarks?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  event_type: string;
  staff_id?: string | null;
  staff_code?: string | null;
  staff_name?: string | null;
  user_email?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  details: any;
  ip_address?: string | null;
  created_at: string;
}

export interface DashboardStats {
  today: string;
  total_staff: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  checked_in_today: number;
  checked_out_today: number;
  attendance_percentage: number;
  total_working_hours: number;
  face_verification_attempts: number;
  face_verification_success: number;
  geofence_failures: number;
}


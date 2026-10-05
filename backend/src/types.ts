export type UserRole = 'super_admin' | 'admin' | 'principal' | 'attendance_manager' | 'staff';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  staff_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  staff_id: string; // Institutional ID e.g. VPP-2024-001
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
  created_at: string;
  updated_at: string;
}

export interface StaffBiometric {
  id: string;
  staff_id: string;
  face_descriptor: number[]; // 128D or 512D float array
  sample_count: number;
  consent_given: boolean;
  consent_timestamp: string;
  enrolled_by: string;
  updated_at: string;
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
  polygon_coordinates: [number, number][]; // Array of [lat, lng]
  allowed_accuracy_meters: number;
  tolerance_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string; // HH:MM (24h)
  end_time: string;   // HH:MM (24h)
  grace_period_minutes: number;
  half_day_threshold_hours: number;
  full_day_threshold_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_accuracy?: number | null;
  check_in_campus_id?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  check_out_accuracy?: number | null;
  check_out_campus_id?: string | null;
  status: 'Present' | 'Late' | 'Early Departure' | 'Half Day' | 'Full Day' | 'Absent' | 'On Leave';
  verification_method: 'FRS_GPS' | 'Manual_Correction' | 'Admin_Adjustment';
  face_match_confidence?: number | null;
  working_hours?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Maternity Leave' | 'Special Leave';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string | null;
  reviewer_remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  event_type: 'FACE_VERIFICATION' | 'GEOFENCE_VIOLATION' | 'ATTENDANCE_CORRECTION' | 'STAFF_UPDATE' | 'GEOFENCE_UPDATE' | 'BIOMETRIC_ENROLLMENT';
  staff_id?: string | null;
  user_email?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  details: any;
  ip_address?: string | null;
  created_at: string;
}

export type ChallengeType = 'blink_once' | 'blink_twice' | 'turn_left' | 'turn_right' | 'look_up' | 'look_down' | 'face_presence';

export interface VerificationSession {
  id: string;
  session_token: string;
  user_id?: string | null;
  staff_id: string;
  challenge_type: ChallengeType;
  challenge_params?: any;
  liveness_verified: boolean;
  identity_verified: boolean;
  location_verified: boolean;
  telemetry?: any;
  expires_at: string;
  used: boolean;
  created_at: string;
}


// ============================================================================
// LOCAL BROWSER ENGINE (VS CODE LIVE SERVER & OFFLINE COMPATIBILITY)
// Allows the entire Staff FRS & Attendance System to run in VS Code Live Server
// without requiring any backend terminal commands or external database servers.
// ============================================================================

import { Staff, CampusGeofence, Shift, AttendanceRecord, LeaveRequest, AuditLog } from '../types';

const STORAGE_KEYS = {
  STAFF: 'vuppala_local_staff',
  CAMPUSES: 'vuppala_local_campuses',
  SHIFTS: 'vuppala_local_shifts',
  ATTENDANCE: 'vuppala_local_attendance',
  LEAVES: 'vuppala_local_leaves',
  SETTINGS: 'vuppala_local_settings',
  AUDIT_LOGS: 'vuppala_local_audit_logs',
  USERS: 'vuppala_local_users',
  BIOMETRICS: 'vuppala_local_biometrics',
};

// Initial Seed Data
const INITIAL_STAFF: Staff[] = [
  {
    id: 'staff_001',
    staff_id: 'VPP-2024-001',
    full_name: 'Dr. K. R. Vuppala',
    gender: 'Male',
    date_of_birth: '1972-05-14',
    phone: '+91 98480 12345',
    email: 'principal@vuppala.edu',
    address: 'Plot 42, Vuppala Enclave, Hyderabad',
    designation: 'Principal & Head of Institutions',
    department: 'Kalashala Degree College',
    joining_date: '2015-06-01',
    employment_status: 'Active',
    assigned_shift_id: 'shift_kalashala_regular',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Kalashala College Regular Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_002',
    staff_id: 'VPP-2024-002',
    full_name: 'Suresh Kumar Sharma',
    gender: 'Male',
    date_of_birth: '1980-08-22',
    phone: '+91 98480 23456',
    email: 'suresh.sharma@vuppala.edu',
    address: 'Flat 301, Vuppala Residency, Hyderabad',
    designation: 'Headmaster - Primary School',
    department: 'Primary School (Prathamika Patashala)',
    joining_date: '2017-04-10',
    employment_status: 'Active',
    assigned_shift_id: 'shift_primary_morning',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Primary School Morning Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_003',
    staff_id: 'VPP-2024-003',
    full_name: 'Dr. Lakshmi Prasanna',
    gender: 'Female',
    date_of_birth: '1985-11-30',
    phone: '+91 98480 34567',
    email: 'lakshmi.prasanna@vuppala.edu',
    address: 'House 12, Teachers Colony, Hyderabad',
    designation: 'Senior Lecturer - Physical Sciences',
    department: 'Kalashala Degree College',
    joining_date: '2018-07-15',
    employment_status: 'Active',
    assigned_shift_id: 'shift_kalashala_regular',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Kalashala College Regular Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_004',
    staff_id: 'VPP-2024-004',
    full_name: 'Venkat Rao Chilukuri',
    gender: 'Male',
    date_of_birth: '1979-02-18',
    phone: '+91 98480 45678',
    email: 'venkat.rao@vuppala.edu',
    address: 'Villa 7, Green Meadows, Hyderabad',
    designation: 'Lecturer in Mathematics',
    department: 'Kalashala Degree College',
    joining_date: '2016-09-01',
    employment_status: 'Active',
    assigned_shift_id: 'shift_kalashala_regular',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Kalashala College Regular Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_005',
    staff_id: 'VPP-2024-005',
    full_name: 'Anitha Madhav',
    gender: 'Female',
    date_of_birth: '1991-06-05',
    phone: '+91 98480 56789',
    email: 'anitha.madhav@vuppala.edu',
    address: 'B-14, Shanti Nagar, Hyderabad',
    designation: 'Primary School Teacher - Science & Telugu',
    department: 'Primary School (Prathamika Patashala)',
    joining_date: '2019-06-10',
    employment_status: 'Active',
    assigned_shift_id: 'shift_primary_morning',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Primary School Morning Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_006',
    staff_id: 'VPP-2024-006',
    full_name: 'Deepa Sharma',
    gender: 'Female',
    date_of_birth: '1987-03-25',
    phone: '+91 98480 67890',
    email: 'deepa.sharma@vuppala.edu',
    address: 'Flat 102, Sri Sai Towers, Hyderabad',
    designation: 'Administrative Superintendent & Attendance In-charge',
    department: 'Administration & Finance',
    joining_date: '2018-01-05',
    employment_status: 'Active',
    assigned_shift_id: 'shift_admin_general',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Administrative General Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff_007',
    staff_id: 'VPP-2026-001',
    full_name: 'HJSVF',
    gender: 'Male',
    date_of_birth: '1995-04-12',
    phone: '+91 98480 78901',
    email: 'hjsvf@vuppala.edu',
    address: 'Campus Staff Quarters, Telangana',
    designation: 'Assistant Teacher',
    department: 'Primary School (Prathamika Patashala)',
    joining_date: '2022-08-01',
    employment_status: 'Active',
    assigned_shift_id: 'shift_primary_morning',
    assigned_campus_id: 'campus_main',
    face_enrollment_status: 'Enrolled',
    profile_photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
    shift_name: 'Primary School Morning Shift',
    campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CAMPUSES: CampusGeofence[] = [
  {
    id: 'campus_main',
    name: 'Vuppala Main Campus (Primary & Kalashala)',
    code: 'VPP-MAIN',
    address: 'Vuppala Educational Complex, Campus Road, Near Gandhi Nagar, Telangana - 500001',
    center_latitude: 16.887333,
    center_longitude: 78.443028,
    radius_meters: 350,
    geofence_type: 'both',
    polygon_coordinates: [
      [16.890833, 78.439528],
      [16.890833, 78.446528],
      [16.883833, 78.446528],
      [16.883833, 78.439528],
    ],
    allowed_accuracy_meters: 50,
    tolerance_meters: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'campus_new',
    name: 'New Institution Campus',
    code: 'VPP-8216',
    address: 'Telangana Educational Zone',
    center_latitude: 16.887333,
    center_longitude: 78.443028,
    radius_meters: 175,
    geofence_type: 'both',
    polygon_coordinates: [
      [16.890833, 78.439528],
      [16.890833, 78.446528],
      [16.883833, 78.446528],
      [16.883833, 78.439528],
    ],
    allowed_accuracy_meters: 50,
    tolerance_meters: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'campus_north',
    name: 'Vuppala Kalashala North Wing',
    code: 'VPP-NORTH',
    address: 'Vuppala North College Campus, Science & Sports Annex, Telangana - 500002',
    center_latitude: 17.3912,
    center_longitude: 78.4925,
    radius_meters: 250,
    geofence_type: 'circle',
    polygon_coordinates: [
      [17.393, 78.4905],
      [17.393, 78.4945],
      [17.3895, 78.4945],
      [17.3895, 78.4905],
    ],
    allowed_accuracy_meters: 50,
    tolerance_meters: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shift_primary_morning',
    name: 'Primary School Morning Shift',
    code: 'SH-PRIM-01',
    start_time: '08:30',
    end_time: '15:30',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_threshold_hours: 6.5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'shift_kalashala_regular',
    name: 'Kalashala College Regular Shift',
    code: 'SH-KALA-01',
    start_time: '09:00',
    end_time: '16:30',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_threshold_hours: 7.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'shift_admin_general',
    name: 'Administrative General Shift',
    code: 'SH-ADMIN-01',
    start_time: '09:00',
    end_time: '17:00',
    grace_period_minutes: 20,
    half_day_threshold_hours: 4.0,
    full_day_threshold_hours: 7.5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SETTINGS = {
  institute_name: 'Staff FRS & Attendance System',
  institute_code: 'FRS-INST-01',
  contact_email: 'contact@vuppala.edu',
  contact_phone: '+91 40 2765 4321',
  face_match_threshold: 0.48,
  liveness_strictness: 'standard',
  default_accuracy_threshold: 50,
  default_tolerance_meters: 15,
  allow_early_checkout: true,
  present_min_hours: 7.0,
  half_day_min_hours: 4.0,
  absent_below_hours: 2.0,
  grace_period_minutes: 15,
};

// Storage Helpers
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

export function addAuditLog(
  eventType: string,
  staffId: string | null,
  status: 'SUCCESS' | 'FAILED' | 'WARNING',
  details: any,
  userEmail: string = 'system@vuppala.edu'
): void {
  try {
    const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const st = staffId ? staffList.find((s) => s.id === staffId || s.staff_id === staffId) : null;
    const newLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event_type: eventType,
      staff_id: st?.id || staffId,
      staff_code: st?.staff_id || (staffId ? 'VPP-001' : null),
      staff_name: st?.full_name || null,
      user_email: userEmail,
      status,
      details,
      ip_address: '127.0.0.1 (Local Terminal)',
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.length = 100;
    setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  } catch (e) {
    console.warn('Audit log write error:', e);
  }
}

// Initialize seed data once with self-healing for empty states
export function initLocalStorage(): void {
  const existingStaff = getItem<Staff[]>(STORAGE_KEYS.STAFF, []);
  if (!existingStaff || existingStaff.length === 0) {
    setItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  }

  const existingCampuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, []);
  if (!existingCampuses || existingCampuses.length === 0) {
    setItem(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
  }

  const existingShifts = getItem<Shift[]>(STORAGE_KEYS.SHIFTS, []);
  if (!existingShifts || existingShifts.length === 0) {
    setItem(STORAGE_KEYS.SHIFTS, INITIAL_SHIFTS);
  }

  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  // Self-heal attendance: purge any fake mock records for today so today starts clean
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let existingAtt = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  
  // Remove any legacy fake initial records that were set to today's date
  if (existingAtt && existingAtt.length > 0) {
    const cleanedAtt = existingAtt.filter(
      (a) => !(a.date === today && (a.id === 'att_01' || a.id === 'att_02'))
    );
    if (cleanedAtt.length !== existingAtt.length) {
      existingAtt = cleanedAtt;
      setItem(STORAGE_KEYS.ATTENDANCE, existingAtt);
    }
  }

  if (!existingAtt || existingAtt.length === 0) {
    // Generate standard historical attendance records strictly for yesterday (NOT today)
    const initialAttendance: AttendanceRecord[] = [
      {
        id: 'att_01',
        staff_id: 'staff_001',
        date: yesterday,
        check_in_time: '08:45',
        check_out_time: '16:30',
        check_in_latitude: 16.887333,
        check_in_longitude: 78.443028,
        check_in_accuracy: 12,
        check_in_campus_id: 'campus_main',
        status: 'Present',
        verification_method: 'FRS_GPS',
        face_match_confidence: 98.6,
        working_hours: 7.75,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'att_02',
        staff_id: 'staff_002',
        date: yesterday,
        check_in_time: '08:28',
        check_out_time: '15:35',
        check_in_latitude: 16.887333,
        check_in_longitude: 78.443028,
        check_in_accuracy: 10,
        check_in_campus_id: 'campus_main',
        status: 'Present',
        verification_method: 'FRS_GPS',
        face_match_confidence: 99.1,
        working_hours: 7.1,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setItem(STORAGE_KEYS.ATTENDANCE, initialAttendance);
  }

  // Initialize initial biometric templates for enrolled staff
  const existingBiometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
  let biometricsChanged = false;
  for (const st of INITIAL_STAFF) {
    if (st.face_enrollment_status === 'Enrolled' && !existingBiometrics[st.id]) {
      const seed = parseInt(st.staff_id.replace(/\D/g, '')) || 1;
      const desc: number[] = [];
      for (let i = 0; i < 128; i++) {
        desc.push(Math.round(Math.sin((i + 1) * seed) * 0.1 * 10000) / 10000);
      }
      const norm = Math.sqrt(desc.reduce((sum, v) => sum + v * v, 0)) || 1;
      existingBiometrics[st.id] = {
        face_descriptor: desc.map((v) => Math.round((v / norm) * 10000) / 10000),
        profile_photo: st.profile_photo_url,
        sample_count: 3,
        enrolled_at: new Date().toISOString(),
        enrolled_by: 'System Initial Seed',
      };
      biometricsChanged = true;
    }
  }
  if (biometricsChanged) {
    setItem(STORAGE_KEYS.BIOMETRICS, existingBiometrics);
  }

  const existingLeaves = getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, []);
  if (!existingLeaves || existingLeaves.length === 0) {
    const initialLeaves: LeaveRequest[] = [
      {
        id: 'leave_01',
        staff_id: 'staff_005',
        leave_type: 'Casual Leave',
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: 'Family function in native village.',
        status: 'Approved',
        approved_by: 'Principal Dr. K. R. Vuppala',
        reviewer_remarks: 'Sanctioned.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setItem(STORAGE_KEYS.LEAVES, initialLeaves);
  }

  const existingLogs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  if (!existingLogs || existingLogs.length === 0) {
    setItem(STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: 'audit_01',
        event_type: 'FACE_VERIFICATION',
        staff_id: 'staff_001',
        staff_code: 'VPP-2024-001',
        staff_name: 'Dr. K. R. Vuppala',
        user_email: 'principal@vuppala.edu',
        status: 'SUCCESS',
        details: { confidence: 98.6, match: true, distance_meters: 0 },
        ip_address: '127.0.0.1 (Local Terminal)',
        created_at: new Date().toISOString(),
      },
      {
        id: 'audit_02',
        event_type: 'FACE_VERIFICATION',
        staff_id: 'staff_002',
        staff_code: 'VPP-2024-002',
        staff_name: 'Suresh Kumar Sharma',
        user_email: 'suresh.k@vuppala.edu',
        status: 'SUCCESS',
        details: { confidence: 99.1, match: true, distance_meters: 0 },
        ip_address: '127.0.0.1 (Local Terminal)',
        created_at: new Date().toISOString(),
      },
    ]);
  }
}

// Distance Calculation Helper
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Handle all mock API requests when running in VS Code Live Server
export async function handleLocalApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  initLocalStorage();
  const method = (options.method || 'GET').toUpperCase();
  const [pathname, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');
  const body = options.body ? JSON.parse(options.body as string) : {};

  // Artificial short delay for realistic snappy response (60ms)
  await new Promise((r) => setTimeout(r, 60));

  // 1. AUTH
  if (pathname === '/auth/login' && method === 'POST') {
    const { email } = body;
    let role: any = 'admin';
    let staff_id: string | null = null;
    let name = 'Administrator';

    const normalizedEmail = (email || '').toLowerCase().trim();

    if (normalizedEmail === 'superadmin@vuppala.edu') {
      role = 'super_admin';
      name = 'Super Administrator';
    } else if (normalizedEmail === 'principal@vuppala.edu') {
      role = 'principal';
      staff_id = 'staff_001';
      name = 'Dr. K. R. Vuppala';
    } else if (normalizedEmail === 'manager@vuppala.edu') {
      role = 'attendance_manager';
      staff_id = 'staff_006';
      name = 'Deepa Sharma';
    } else if (
      normalizedEmail === 'staff@vuppala.edu' ||
      normalizedEmail === 'suresh.k@vuppala.edu' ||
      normalizedEmail === 'suresh.sharma@vuppala.edu'
    ) {
      role = 'staff';
      staff_id = 'staff_002';
      name = 'Suresh Kumar Sharma';
    } else {
      // Find staff in directory
      const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
      const matched = staffList.find((s) => s.email.toLowerCase() === normalizedEmail);
      if (matched) {
        role = 'staff';
        staff_id = matched.id;
        name = matched.full_name;
      }
    }

    const token = `local_token_${Date.now()}_${role}`;
    const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const staffProfile = staff_id ? staffList.find((s) => s.id === staff_id) : null;

    const userObj = {
      id: `user_${role}_${staff_id || '0'}`,
      email: email || 'admin@vuppala.edu',
      role,
      staff_id,
      name,
      staff: staffProfile || null,
    };

    setItem('vuppala_current_user', userObj);
    addAuditLog('USER_LOGIN', staff_id, 'SUCCESS', { role, email: normalizedEmail }, email);

    return {
      token,
      user: userObj,
    };
  }

  if (pathname === '/auth/me') {
    const savedUser = getItem<any>('vuppala_current_user', null);
    const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    if (savedUser) {
      const staff = savedUser.staff_id ? staffList.find((s) => s.id === savedUser.staff_id) : null;
      return {
        user: {
          ...savedUser,
          staff,
        },
      };
    }
    return {
      user: {
        id: 'user_super_admin',
        email: 'superadmin@vuppala.edu',
        role: 'super_admin',
        staff_id: null,
        name: 'Super Administrator',
        staff: null,
      },
    };
  }

  if (pathname === '/auth/change-password') {
    return { message: 'Password updated successfully.' };
  }

  // 2. STAFF
  if (pathname === '/staff') {
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    if (method === 'GET') {
      let result = [...staff];
      const dept = params.get('department');
      const campusId = params.get('campus_id');
      const empStatus = params.get('employment_status');
      const faceStatus = params.get('face_status');
      const search = params.get('search');
      const sortBy = params.get('sort_by') || 'full_name';
      const sortOrder = (params.get('sort_order') || 'ASC').toUpperCase();

      if (dept && dept !== 'all') {
        result = result.filter((s) => s.department === dept);
      }
      if (campusId && campusId !== 'all') {
        result = result.filter((s) => s.assigned_campus_id === campusId);
      }
      if (empStatus && empStatus !== 'all') {
        result = result.filter((s) => s.employment_status === empStatus);
      }
      if (faceStatus && faceStatus !== 'all') {
        result = result.filter((s) => s.face_enrollment_status === faceStatus);
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        result = result.filter((s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.staff_id.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.designation && s.designation.toLowerCase().includes(q))
        );
      }

      result.sort((a: any, b: any) => {
        const valA = (a[sortBy] || '').toString().toLowerCase();
        const valB = (b[sortBy] || '').toString().toLowerCase();
        return sortOrder === 'DESC' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      });

      return { staff: result, count: result.length, total: result.length };
    }
    if (method === 'POST') {
      const newStaff: Staff = {
        id: `staff_${Date.now()}`,
        staff_id: body.staff_id || `VPP-${Date.now().toString().slice(-4)}`,
        full_name: body.full_name,
        gender: body.gender || 'Other',
        date_of_birth: body.date_of_birth || '1990-01-01',
        phone: body.phone || '+91 98480 00000',
        email: body.email,
        address: body.address || 'Hyderabad',
        designation: body.designation,
        department: body.department,
        joining_date: body.joining_date || new Date().toISOString().split('T')[0],
        employment_status: body.employment_status || 'Active',
        assigned_shift_id: body.assigned_shift_id || 'shift_kalashala_regular',
        assigned_campus_id: body.assigned_campus_id || 'campus_main',
        face_enrollment_status: 'Not Enrolled',
        profile_photo_url: body.profile_photo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      staff.push(newStaff);
      setItem(STORAGE_KEYS.STAFF, staff);
      return { message: 'Staff member created successfully.', staff: newStaff };
    }
  }

  // /staff/:id
  const staffMatch = pathname.match(/^\/staff\/([^/]+)$/);
  if (staffMatch) {
    const sId = staffMatch[1];
    let staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    if (method === 'GET') {
      const found = staff.find((s) => s.id === sId || s.staff_id === sId);
      if (!found) throw new Error('Staff member not found.');
      return { staff: found };
    }
    if (method === 'PUT') {
      const idx = staff.findIndex((s) => s.id === sId);
      if (idx !== -1) {
        staff[idx] = { ...staff[idx], ...body, updated_at: new Date().toISOString() };
        setItem(STORAGE_KEYS.STAFF, staff);
        return { message: 'Staff updated successfully.', staff: staff[idx] };
      }
      throw new Error('Staff not found.');
    }
    if (method === 'DELETE') {
      staff = staff.filter((s) => s.id !== sId && s.staff_id !== sId);
      setItem(STORAGE_KEYS.STAFF, staff);
      return { message: 'Staff member deleted successfully.' };
    }
  }

  // /staff/:id/status
  const staffStatusMatch = pathname.match(/^\/staff\/([^/]+)\/status$/);
  if (staffStatusMatch && method === 'PATCH') {
    const sId = staffStatusMatch[1];
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const idx = staff.findIndex((s) => s.id === sId);
    if (idx !== -1) {
      staff[idx].employment_status = body.status;
      setItem(STORAGE_KEYS.STAFF, staff);
      return { message: 'Status updated.', staff: staff[idx] };
    }
    throw new Error('Staff not found.');
  }

  // 3. CAMPUSES / GEOFENCE
  if (pathname === '/campuses') {
    const campuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
    if (method === 'GET') {
      return { campuses };
    }
    if (method === 'POST') {
      const newCampus: CampusGeofence = {
        id: `campus_${Date.now()}`,
        name: body.name,
        code: body.code || `VPP-${Math.floor(1000 + Math.random() * 9000)}`,
        address: body.address || 'Telangana',
        center_latitude: parseFloat(body.center_latitude) || 16.887333,
        center_longitude: parseFloat(body.center_longitude) || 78.443028,
        radius_meters: parseFloat(body.radius_meters) || 350,
        geofence_type: body.geofence_type || 'both',
        polygon_coordinates: body.polygon_coordinates || [
          [16.890833, 78.439528],
          [16.890833, 78.446528],
          [16.883833, 78.446528],
          [16.883833, 78.439528],
        ],
        allowed_accuracy_meters: body.allowed_accuracy_meters || 50,
        tolerance_meters: body.tolerance_meters || 15,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      campuses.push(newCampus);
      setItem(STORAGE_KEYS.CAMPUSES, campuses);
      return { message: 'Campus created.', campus: newCampus };
    }
  }

  if (pathname === '/campuses/test-coordinate' && method === 'POST') {
    const { campus_id, latitude, longitude } = body;
    const campuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
    const target = campuses.find((c) => c.id === campus_id) || campuses[0];
    const dist = haversineMeters(latitude, longitude, target.center_latitude, target.center_longitude);
    const inside = dist <= target.radius_meters + target.tolerance_meters;
    return {
      campus_name: target.name,
      test_coordinates: { latitude, longitude },
      distance_meters: dist,
      inside_radius: inside,
      inside_polygon: inside,
      is_inside_geofence: inside,
      accuracy_sufficient: true,
      result_message: inside
        ? '✅ Coordinates are INSIDE the authorized campus geofence boundary.'
        : `❌ Coordinates are ${dist}m away from the campus center (exceeds ${target.radius_meters}m perimeter).`,
    };
  }

  const campusMatch = pathname.match(/^\/campuses\/([^/]+)$/);
  if (campusMatch) {
    const cId = campusMatch[1];
    let campuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
    if (method === 'GET') {
      const c = campuses.find((x) => x.id === cId);
      return { campus: c };
    }
    if (method === 'PUT') {
      const idx = campuses.findIndex((x) => x.id === cId);
      if (idx !== -1) {
        campuses[idx] = { ...campuses[idx], ...body, updated_at: new Date().toISOString() };
        setItem(STORAGE_KEYS.CAMPUSES, campuses);
        return { message: 'Campus updated.', campus: campuses[idx] };
      }
    }
    if (method === 'DELETE') {
      campuses = campuses.filter((x) => x.id !== cId);
      setItem(STORAGE_KEYS.CAMPUSES, campuses);
      return { message: 'Campus removed.' };
    }
  }

  // 4. BIOMETRICS
  if (pathname === '/biometrics/enroll' && method === 'POST') {
    const { staff_id, face_descriptor, profile_photo } = body;
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const idx = staff.findIndex((s) => s.id === staff_id);
    if (idx !== -1) {
      staff[idx].face_enrollment_status = 'Enrolled';
      if (profile_photo) {
        staff[idx].profile_photo_url = profile_photo;
      }
      setItem(STORAGE_KEYS.STAFF, staff);
    }
    const biometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
    biometrics[staff_id] = {
      face_descriptor,
      profile_photo,
      sample_count: body.sample_count || 3,
      enrolled_at: new Date().toISOString(),
      enrolled_by: 'Administrator',
    };
    setItem(STORAGE_KEYS.BIOMETRICS, biometrics);
    return { message: 'Biometric face descriptor enrolled successfully.' };
  }

  const bioStatusMatch = pathname.match(/^\/biometrics\/status\/([^/]+)$/);
  if (bioStatusMatch && method === 'GET') {
    const staffId = bioStatusMatch[1];
    const biometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
    const b = biometrics[staffId];
    return {
      is_enrolled: Boolean(b),
      sample_count: b?.sample_count || 3,
      enrolled_by: b?.enrolled_by || 'Administrator',
      enrolled_at: b?.enrolled_at || new Date().toISOString(),
      consent_given: true,
    };
  }

  const bioDeleteMatch = pathname.match(/^\/biometrics\/([^/]+)$/);
  if (bioDeleteMatch && method === 'DELETE') {
    const staffId = bioDeleteMatch[1];
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const idx = staff.findIndex((s) => s.id === staffId);
    if (idx !== -1) {
      staff[idx].face_enrollment_status = 'Not Enrolled';
      setItem(STORAGE_KEYS.STAFF, staff);
    }
    const biometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
    delete biometrics[staffId];
    setItem(STORAGE_KEYS.BIOMETRICS, biometrics);
    return { message: 'Biometric enrollment disabled.' };
  }

  // Get all enrolled biometric descriptors for 1:N real-time matching
  if (pathname === '/biometrics/all' && method === 'GET') {
    const biometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const templates = Object.entries(biometrics).map(([sId, data]: [string, any]) => {
      const matched = staff.find((s) => s.id === sId || s.staff_id === sId);
      return {
        staff_id: sId,
        staff: matched,
        face_descriptor: data.face_descriptor,
        profile_photo: data.profile_photo || matched?.profile_photo_url,
      };
    });
    return { templates };
  }

  // 1:N Face Identification against enrolled staff registry
  if (pathname === '/attendance/identify' && method === 'POST') {
    const { face_descriptor } = body;
    if (!face_descriptor || !Array.isArray(face_descriptor)) {
      return { matched: false, message: 'Invalid face descriptor' };
    }
    const biometrics = getItem<any>(STORAGE_KEYS.BIOMETRICS, {});
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);

    let bestMatch: any = null;
    let minDistance = 999;

    for (const [sId, data] of Object.entries<any>(biometrics)) {
      if (!data.face_descriptor || !Array.isArray(data.face_descriptor)) continue;
      const enrolled = data.face_descriptor;
      let sum = 0;
      for (let i = 0; i < Math.min(face_descriptor.length, enrolled.length); i++) {
        const d = face_descriptor[i] - enrolled[i];
        sum += d * d;
      }
      const dist = Math.sqrt(sum);
      if (dist < minDistance) {
        minDistance = dist;
        const matchedStaff = staff.find((s) => s.id === sId || s.staff_id === sId);
        if (matchedStaff && matchedStaff.employment_status === 'Active') {
          bestMatch = {
            staff: matchedStaff,
            distance: Math.round(dist * 1000) / 1000,
            confidence: Math.round(Math.max(0, Math.min(100, (1 - dist / (0.70 * 1.25)) * 100)) * 10) / 10,
          };
        }
      }
    }

    if (bestMatch && minDistance <= 0.72) {
      return {
        matched: true,
        staff: bestMatch.staff,
        distance: bestMatch.distance,
        confidence: bestMatch.confidence,
        message: `Identified ${bestMatch.staff.full_name}`,
      };
    }

    return {
      matched: false,
      message: 'Face not recognized in staff registry.',
      minDistance: Math.round(minDistance * 1000) / 1000,
    };
  }

  // 5. ATTENDANCE & VERIFICATION PIPELINE
  if (pathname === '/attendance/verification/start' && method === 'POST') {
    const { staff_id } = body;
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    if (!staff || staff.length === 0) {
      throw new Error('No staff registered in the institutional registry. Please add staff members first.');
    }
    const target = (staff_id ? staff.find((s) => s.id === staff_id) : null) || staff[0];
    const sessionToken = `local_token_${Date.now()}_${target.id}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      session_token: sessionToken,
      challenge_type: 'face_presence',
      challenge_instruction: 'Face positioned steadily for attendance verification',
      expires_at: new Date(Date.now() + 90000).toISOString(),
      expires_at_epoch: Date.now() + 90000,
      staff_id: target.id,
      staff_code: target.staff_id,
      staff_name: target.full_name,
      campus_name: target.campus_name || 'Vuppala Main Campus (Primary & Kalashala)',
    };
  }

  if (pathname === '/attendance/verification/liveness' && method === 'POST') {
    if (body.is_spoof) {
      throw new Error(`Presentation attack rejected: ${body.spoof_type === 'phone_screen' ? 'Digital phone/screen' : 'Static photograph'} detected.`);
    }
    return {
      success: true,
      message: 'Face presence confirmed successfully.',
      challenge_type: 'face_presence',
    };
  }

  if (pathname === '/attendance/verification/identity' && method === 'POST') {
    return {
      success: true,
      confidence: 99.2,
      message: '1:1 facial biometric identity match verified.',
    };
  }

  if (pathname === '/attendance/verification/location' && method === 'POST') {
    const { session_token, latitude, longitude, accuracy } = body;
    const campuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
    const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);

    let assignedCampus = campuses[0];
    if (session_token) {
      const matchedStaff = staffList.find((s) => session_token.includes(s.id));
      if (matchedStaff && matchedStaff.assigned_campus_id) {
        const found = campuses.find((c) => c.id === matchedStaff.assigned_campus_id);
        if (found) assignedCampus = found;
      }
    }

    const testLat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    const testLng = typeof longitude === 'number' ? longitude : parseFloat(longitude);
    const testAcc = typeof accuracy === 'number' ? accuracy : parseFloat(accuracy || '10');

    if (isNaN(testLat) || isNaN(testLng)) {
      throw new Error('Valid GPS coordinates (latitude, longitude) are required for verification.');
    }

    const dist = haversineMeters(testLat, testLng, assignedCampus.center_latitude, assignedCampus.center_longitude);
    const allowedRadius = (assignedCampus.radius_meters || 350) + (assignedCampus.tolerance_meters || 15);
    const maxAccuracy = assignedCampus.allowed_accuracy_meters || 50;

    const inside = dist <= allowedRadius;

    if (!inside) {
      addAuditLog(
        'GEOFENCE_VIOLATION',
        session_token ? session_token.split('_')[2] || null : null,
        'FAILED',
        {
          distance_meters: dist,
          allowed_radius: assignedCampus.radius_meters,
          campus_name: assignedCampus.name,
          latitude: testLat,
          longitude: testLng,
        }
      );
      throw new Error(
        `Geofence validation failed: You are ${dist}m away from ${assignedCampus.name} (exceeds ${assignedCampus.radius_meters}m boundary). Attendance can only be recorded within campus grounds.`
      );
    }

    if (testAcc > maxAccuracy) {
      throw new Error(
        `GPS accuracy degraded (±${Math.round(testAcc)}m). Accuracy must be within ±${maxAccuracy}m to mark attendance.`
      );
    }

    return {
      success: true,
      is_inside: true,
      distance_meters: dist,
      campus_name: assignedCampus.name,
      message: `Coordinates validated inside ${assignedCampus.name} perimeter (${dist}m from center).`,
    };
  }

  if (pathname === '/attendance/verification/finalize' && method === 'POST') {
    const { session_token, latitude, longitude, staff_id, bypass_geofence } = body;
    const staffList = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    if (!staffList || staffList.length === 0) {
      throw new Error('No staff registered in the institutional registry.');
    }
    const settings = getItem<any>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Pick target staff
    let targetStaff = staffList[0];
    if (staff_id) {
      const match = staffList.find((s) => s.id === staff_id);
      if (match) targetStaff = match;
    } else if (session_token) {
      const match = staffList.find((s) => session_token.includes(s.id));
      if (match) targetStaff = match;
    }

    // Strict geofence enforcement unless admin bypass
    const campuses = getItem<CampusGeofence[]>(STORAGE_KEYS.CAMPUSES, INITIAL_CAMPUSES);
    const assignedCampus = campuses.find((c) => c.id === targetStaff.assigned_campus_id) || campuses[0];
    const testLat = typeof latitude === 'number' ? latitude : parseFloat(latitude || '0');
    const testLng = typeof longitude === 'number' ? longitude : parseFloat(longitude || '0');
    const dist = haversineMeters(testLat, testLng, assignedCampus.center_latitude, assignedCampus.center_longitude);
    const allowedRadius = (assignedCampus.radius_meters || 350) + (assignedCampus.tolerance_meters || 15);

    if (!bypass_geofence && dist > allowedRadius) {
      addAuditLog(
        'GEOFENCE_VIOLATION',
        targetStaff.id,
        'FAILED',
        {
          distance_meters: dist,
          allowed_radius: assignedCampus.radius_meters,
          campus_name: assignedCampus.name,
          attempted_action: 'ATTENDANCE_RECORDING',
        },
        targetStaff.email
      );
      throw new Error(
        `Cannot record attendance: You are outside the authorized campus perimeter (${dist}m away from ${assignedCampus.name}, allowed: ${assignedCampus.radius_meters}m).`
      );
    }
    const existing = attendance.find((a) => a.staff_id === targetStaff.id && a.date === today);

    let action = 'CHECK_IN';
    let status = 'Present';
    let working_hours: number | undefined = undefined;

    if (!existing || !existing.check_in_time) {
      // Check-In
      action = 'CHECK_IN';
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}`,
        staff_id: targetStaff.id,
        date: today,
        check_in_time: nowTime,
        check_out_time: null,
        check_in_latitude: latitude || 16.887333,
        check_in_longitude: longitude || 78.443028,
        check_in_accuracy: 12,
        check_in_campus_id: 'campus_main',
        status: 'Present',
        verification_method: 'FRS_GPS',
        face_match_confidence: 99.2,
        working_hours: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      attendance.unshift(newRec);
      setItem(STORAGE_KEYS.ATTENDANCE, attendance);
    } else {
      // Check-Out
      action = 'CHECK_OUT';
      const checkInParts = existing.check_in_time.split(':').map(Number);
      const nowParts = nowTime.split(':').map(Number);
      const diffHours = Math.max(0.5, Math.round(((nowParts[0] * 60 + nowParts[1] - (checkInParts[0] * 60 + checkInParts[1])) / 60) * 10) / 10);
      working_hours = diffHours > 0 ? diffHours : 7.5;

      const presentThreshold = settings.present_min_hours || 7.0;
      const halfDayThreshold = settings.half_day_min_hours || 4.0;
      const absentThreshold = settings.absent_below_hours || 2.0;

      if (working_hours >= presentThreshold) {
        status = 'Present';
      } else if (working_hours >= halfDayThreshold) {
        status = 'Half Day';
      } else if (working_hours < absentThreshold) {
        status = 'Absent';
      } else {
        status = 'Half Day';
      }

      existing.check_out_time = nowTime;
      existing.check_out_latitude = latitude || 16.887333;
      existing.check_out_longitude = longitude || 78.443028;
      existing.working_hours = working_hours;
      existing.status = status as any;
      existing.updated_at = new Date().toISOString();
      setItem(STORAGE_KEYS.ATTENDANCE, attendance);
    }

    addAuditLog(
      action === 'CHECK_IN' ? 'ATTENDANCE_CHECK_IN' : 'ATTENDANCE_CHECK_OUT',
      targetStaff.id,
      'SUCCESS',
      {
        action,
        status,
        time: nowTime,
        working_hours,
        campus: 'Vuppala Main Campus (Primary & Kalashala)',
        method: 'FRS_GPS',
        confidence: 99.2,
      },
      targetStaff.email
    );

    return {
      success: true,
      action,
      status,
      staff_name: targetStaff.full_name,
      staff_id: targetStaff.staff_id,
      date: today,
      time: nowTime,
      campus_name: 'Vuppala Main Campus (Primary & Kalashala)',
      confidence: 99.2,
      working_hours,
      message: `${action === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded and verified successfully!`,
    };
  }

  if (pathname === '/attendance/today') {
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const today = new Date().toISOString().split('T')[0];
    const todayList = attendance
      .filter((a) => a.date === today)
      .map((a) => {
        const s = staff.find((x) => x.id === a.staff_id);
        return {
          ...a,
          full_name: s?.full_name || 'Staff Member',
          designation: s?.designation || 'Teacher',
          department: s?.department || 'Primary',
        };
      });
    return { attendance: todayList, count: todayList.length };
  }

  if (pathname === '/attendance/history') {
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const history = attendance.map((a) => {
      const s = staff.find((x) => x.id === a.staff_id);
      return {
        ...a,
        full_name: s?.full_name || 'Staff Member',
        designation: s?.designation || 'Teacher',
        department: s?.department || 'Primary',
      };
    });
    return { attendance: history, total: history.length };
  }

  if (pathname === '/attendance/verification/diagnostics') {
    const logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return {
      stats: { total_sessions: 14, liveness_passed: 14, identity_passed: 14, completed_attendances: 12 },
      sessions: [],
      thresholds: { euclidean: 0.48, max_gps: 50, ttl: 90 },
      recent_audits: logs.slice(0, 10),
    };
  }

  // 6. DASHBOARD
  if (pathname === '/dashboard/stats') {
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const leaves = getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, []);
    const today = new Date().toISOString().split('T')[0];

    const presentToday = attendance.filter((a) => a.date === today && a.check_in_time).length;
    const leavesToday = leaves.filter((l) => l.status === 'Approved').length;
    const checkedOutToday = attendance.filter((a) => a.date === today && a.check_out_time).length;
    const totalStaff = staff.length;
    const absentToday = Math.max(0, totalStaff - presentToday - leavesToday);
    const lateToday = 1;
    const attendancePercentage = totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0;

    return {
      today,
      total_staff: totalStaff,
      present_today: presentToday,
      absent_today: absentToday,
      late_today: lateToday,
      on_leave_today: leavesToday,
      checked_in_today: presentToday,
      checked_out_today: checkedOutToday,
      attendance_percentage: attendancePercentage,
      total_working_hours: 42.5,
      face_verification_attempts: 14,
      face_verification_success: 14,
      geofence_failures: 0,
      // camelCase aliases for backwards compatibility
      totalStaff,
      presentToday,
      absentToday,
      onLeaveToday: leavesToday,
      lateArrivals: lateToday,
      attendanceRate: attendancePercentage,
      averageWorkingHours: '7.4',
    };
  }

  if (pathname === '/dashboard/charts') {
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const today = new Date().toISOString().split('T')[0];

    const deptMap: Record<string, { total: number; present: number }> = {};
    staff.forEach((s) => {
      const d = s.department || 'General';
      if (!deptMap[d]) deptMap[d] = { total: 0, present: 0 };
      deptMap[d].total++;
      if (attendance.some((a) => a.staff_id === s.id && a.date === today && a.check_in_time)) {
        deptMap[d].present++;
      }
    });

    const department_breakdown = Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      total_staff: data.total,
      present_today: data.present,
    }));

    return {
      weeklyTrend: [
        { day: 'Mon', present: 6, absent: 1 },
        { day: 'Tue', present: 7, absent: 0 },
        { day: 'Wed', present: 7, absent: 0 },
        { day: 'Thu', present: 6, absent: 1 },
        { day: 'Fri', present: 7, absent: 0 },
      ],
      weekly_trend: [
        { day: 'Mon', present: 6, absent: 1 },
        { day: 'Tue', present: 7, absent: 0 },
        { day: 'Wed', present: 7, absent: 0 },
        { day: 'Thu', present: 6, absent: 1 },
        { day: 'Fri', present: 7, absent: 0 },
      ],
      department_breakdown,
      departments: department_breakdown.map((d) => ({
        name: d.department,
        count: d.total_staff,
        present: d.present_today,
      })),
    };
  }

  if (pathname === '/dashboard/recent-feed') {
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const feed = attendance.slice(0, 10).map((a) => {
      const s = staff.find((x) => x.id === a.staff_id);
      return {
        ...a,
        id: a.id,
        staff_name: s?.full_name || 'Staff Member',
        staff_id: s?.staff_id || 'VPP-001',
        time: a.check_out_time || a.check_in_time || '09:00',
        type: a.check_out_time ? 'Check-Out' : 'Check-In',
        status: a.status,
        campus: 'Vuppala Main Campus',
      };
    });
    return { recent: feed, feed };
  }

  // 7. LEAVES
  if (pathname === '/leaves') {
    let leaves = getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, []);
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const statusFilter = params.get('status');
    if (statusFilter && statusFilter !== 'all') {
      leaves = leaves.filter((l) => l.status === statusFilter);
    }
    if (method === 'GET') {
      const populated = leaves.map((l) => {
        const s = staff.find((x) => x.id === l.staff_id);
        return {
          ...l,
          staff_name: s?.full_name || 'Staff Member',
          staff_code: s?.staff_id || 'VPP-001',
          department: s?.department || 'Primary Patashala',
        };
      });
      return { leaves: populated };
    }
    if (method === 'POST') {
      const newLeave: LeaveRequest = {
        id: `leave_${Date.now()}`,
        staff_id: body.staff_id || staff[0].id,
        leave_type: body.leave_type || 'Casual Leave',
        start_date: body.start_date,
        end_date: body.end_date,
        reason: body.reason || 'Personal leave',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      leaves.unshift(newLeave);
      setItem(STORAGE_KEYS.LEAVES, leaves);
      addAuditLog('LEAVE_APPLICATION', newLeave.staff_id, 'SUCCESS', { leave_type: newLeave.leave_type, days: `${newLeave.start_date} to ${newLeave.end_date}` });
      return { message: 'Leave application submitted successfully.', leave: newLeave };
    }
  }

  const leaveStatusMatch = pathname.match(/^\/leaves\/([^/]+)\/status$/);
  if (leaveStatusMatch && method === 'PATCH') {
    const lId = leaveStatusMatch[1];
    const leaves = getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVES, []);
    const idx = leaves.findIndex((l) => l.id === lId);
    if (idx !== -1) {
      leaves[idx].status = body.status;
      leaves[idx].approved_by = body.approved_by || 'Principal Dr. K. R. Vuppala';
      leaves[idx].reviewer_remarks = body.reviewer_remarks || '';
      setItem(STORAGE_KEYS.LEAVES, leaves);
      addAuditLog('LEAVE_STATUS_UPDATE', leaves[idx].staff_id, 'SUCCESS', { status: body.status, approved_by: leaves[idx].approved_by });
      return { message: `Leave status updated to ${body.status}.`, leave: leaves[idx] };
    }
  }

  // 8. SHIFTS
  if (pathname === '/shifts') {
    let shifts = getItem<Shift[]>(STORAGE_KEYS.SHIFTS, INITIAL_SHIFTS);
    if (method === 'GET') {
      return { shifts };
    }
    if (method === 'POST') {
      const newShift: Shift = {
        id: `shift_${Date.now()}`,
        name: body.name,
        code: body.code || `SH-${Math.floor(100 + Math.random() * 900)}`,
        start_time: body.start_time || '09:00',
        end_time: body.end_time || '16:30',
        grace_period_minutes: body.grace_period_minutes || 15,
        half_day_threshold_hours: body.half_day_threshold_hours || 4.0,
        full_day_threshold_hours: body.full_day_threshold_hours || 7.0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      shifts.push(newShift);
      setItem(STORAGE_KEYS.SHIFTS, shifts);
      addAuditLog('SHIFT_SCHEDULE_CREATED', null, 'SUCCESS', { name: newShift.name, code: newShift.code });
      return { message: 'Shift schedule created.', shift: newShift };
    }
  }

  const shiftMatch = pathname.match(/^\/shifts\/([^/]+)$/);
  if (shiftMatch) {
    const shId = shiftMatch[1];
    let shifts = getItem<Shift[]>(STORAGE_KEYS.SHIFTS, INITIAL_SHIFTS);
    if (method === 'PUT') {
      const idx = shifts.findIndex((s) => s.id === shId);
      if (idx !== -1) {
        shifts[idx] = { ...shifts[idx], ...body, updated_at: new Date().toISOString() };
        setItem(STORAGE_KEYS.SHIFTS, shifts);
        return { message: 'Shift updated successfully.', shift: shifts[idx] };
      }
    }
    if (method === 'DELETE') {
      shifts = shifts.filter((s) => s.id !== shId);
      setItem(STORAGE_KEYS.SHIFTS, shifts);
      return { message: 'Shift removed.' };
    }
  }

  // 9. REPORTS & AUDIT
  if (pathname === '/reports/muster-roll') {
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    let records = attendance.map((a) => {
      const s = staff.find((x) => x.id === a.staff_id);
      return {
        ...a,
        full_name: s?.full_name || 'Staff Member',
        staff_code: s?.staff_id || 'VPP-001',
        department: s?.department || 'Primary School',
        designation: s?.designation || 'Teacher',
        campus_name: 'Vuppala Main Campus',
      };
    });

    const dept = params.get('department');
    if (dept && dept !== 'all') {
      records = records.filter((r) => r.department === dept);
    }
    const campus = params.get('campus_id');
    if (campus && campus !== 'all') {
      records = records.filter((r) => r.check_in_campus_id === campus);
    }
    const startDate = params.get('start_date');
    const endDate = params.get('end_date');
    if (startDate) records = records.filter((r) => r.date >= startDate);
    if (endDate) records = records.filter((r) => r.date <= endDate);

    return { records, muster_roll: records, total: records.length, count: records.length };
  }

  if (pathname === '/reports/audit-logs') {
    let logs = getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const evType = params.get('event_type');
    const st = params.get('status');
    if (evType && evType !== 'all') {
      logs = logs.filter((l) => l.event_type === evType);
    }
    if (st && st !== 'all') {
      logs = logs.filter((l) => l.status === st);
    }
    return { logs, total: logs.length };
  }

  if (pathname === '/reports/export-csv') {
    const attendance = getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const staff = getItem<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    let csv = 'Date,Staff ID,Full Name,Department,Designation,Check In,Check Out,Working Hours,Status,Verification Method\n';
    attendance.forEach((a) => {
      const s = staff.find((x) => x.id === a.staff_id);
      csv += `"${a.date}","${s?.staff_id || ''}","${s?.full_name || ''}","${s?.department || ''}","${s?.designation || ''}","${a.check_in_time || ''}","${a.check_out_time || ''}","${a.working_hours || ''}","${a.status || ''}","${a.verification_method || 'FRS_GPS'}"\n`;
    });
    return csv;
  }

  // 10. SETTINGS
  if (pathname === '/settings') {
    let settings = getItem<any>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    if (method === 'GET') {
      return { settings };
    }
    if (method === 'PUT') {
      settings = { ...settings, ...body };
      setItem(STORAGE_KEYS.SETTINGS, settings);
      addAuditLog('SYSTEM_SETTINGS_UPDATE', null, 'SUCCESS', { present_min_hours: settings.present_min_hours, half_day_min_hours: settings.half_day_min_hours });
      return { message: 'Settings saved successfully.', settings };
    }
  }

  return { ok: true };
}


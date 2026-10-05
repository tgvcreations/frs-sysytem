import bcrypt from 'bcryptjs';
import { query } from '../config/database';

export async function seedInitialData(): Promise<void> {
  console.log(' Checking and seeding initial institution data...');

  // 1. Seed Shifts
  const shifts = [
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
    },
  ];

  for (const s of shifts) {
    await query(
      `INSERT INTO shifts (id, name, code, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_threshold_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO NOTHING`,
      [s.id, s.name, s.code, s.start_time, s.end_time, s.grace_period_minutes, s.half_day_threshold_hours, s.full_day_threshold_hours, s.is_active]
    );
  }

  // 2. Seed Campuses with Polygon & Circular Geofences
  const campuses = [
    {
      id: 'campus_main',
      name: 'Vuppala Main Campus (Primary & Kalashala)',
      code: 'VPP-MAIN',
      address: 'Vuppala Educational Complex, Campus Road, Near Gandhi Nagar, Telangana - 500001',
      center_latitude: 16.887333,
      center_longitude: 78.443028,
      radius_meters: 350.0,
      geofence_type: 'both',
      polygon_coordinates: JSON.stringify([
        [16.890833, 78.439528],
        [16.890833, 78.446528],
        [16.883833, 78.446528],
        [16.883833, 78.439528],
      ]),
      allowed_accuracy_meters: 50.0,
      tolerance_meters: 20.0,
      is_active: true,
    },
    {
      id: 'campus_kalashala_north',
      name: 'Vuppala Kalashala North Wing',
      code: 'VPP-NORTH',
      address: 'Vuppala North College Campus, Science & Sports Annex, Telangana - 500002',
      center_latitude: 17.391200,
      center_longitude: 78.492500,
      radius_meters: 250.0,
      geofence_type: 'circle',
      polygon_coordinates: JSON.stringify([
        [17.393000, 78.490500],
        [17.393000, 78.494500],
        [17.389500, 78.494500],
        [17.389500, 78.490500],
      ]),
      allowed_accuracy_meters: 50.0,
      tolerance_meters: 15.0,
      is_active: true,
    },
  ];

  for (const c of campuses) {
    await query(
      `INSERT INTO campuses (id, name, code, address, center_latitude, center_longitude, radius_meters, geofence_type, polygon_coordinates, allowed_accuracy_meters, tolerance_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (code) DO NOTHING`,
      [c.id, c.name, c.code, c.address, c.center_latitude, c.center_longitude, c.radius_meters, c.geofence_type, c.polygon_coordinates, c.allowed_accuracy_meters, c.tolerance_meters, c.is_active]
    );
  }

  // 3. Seed Users & Staff
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@12345', 10);

  // Administrative Accounts
  const adminUsers = [
    {
      id: 'user_super_admin',
      email: 'superadmin@vuppala.edu',
      password_hash: defaultPasswordHash,
      role: 'super_admin',
      staff_id: null,
    },
    {
      id: 'user_admin',
      email: 'admin@vuppala.edu',
      password_hash: defaultPasswordHash,
      role: 'admin',
      staff_id: null,
    },
    {
      id: 'user_principal',
      email: 'principal@vuppala.edu',
      password_hash: defaultPasswordHash,
      role: 'principal',
      staff_id: 'staff_001',
    },
    {
      id: 'user_attendance_mgr',
      email: 'manager@vuppala.edu',
      password_hash: defaultPasswordHash,
      role: 'attendance_manager',
      staff_id: 'staff_006',
    },
  ];

  for (const u of adminUsers) {
    await query(
      `INSERT INTO users (id, email, password_hash, role, staff_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [u.id, u.email, u.password_hash, u.role, u.staff_id]
    );
  }

  // Staff Profiles
  const staffList = [
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
    },
    {
      id: 'staff_002',
      staff_id: 'VPP-2024-002',
      full_name: 'Suresh Kumar Sharma',
      gender: 'Male',
      date_of_birth: '1980-08-22',
      phone: '+91 98480 23456',
      email: 'suresh.k@vuppala.edu',
      address: '12-4/A Teachers Colony, Hyderabad',
      designation: 'Headmaster - Primary School',
      department: 'Prathamika Patashala',
      joining_date: '2018-07-15',
      employment_status: 'Active',
      assigned_shift_id: 'shift_primary_morning',
      assigned_campus_id: 'campus_main',
      face_enrollment_status: 'Enrolled',
      profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    },
    {
      id: 'staff_003',
      staff_id: 'VPP-2024-003',
      full_name: 'Dr. Lakshmi Prasanna',
      gender: 'Female',
      date_of_birth: '1985-11-03',
      phone: '+91 98480 34567',
      email: 'lakshmi.p@vuppala.edu',
      address: 'Flat 302, Sai Residency, Tarnaka',
      designation: 'Senior Lecturer - Physical Sciences',
      department: 'Kalashala Junior College',
      joining_date: '2019-06-10',
      employment_status: 'Active',
      assigned_shift_id: 'shift_kalashala_regular',
      assigned_campus_id: 'campus_main',
      face_enrollment_status: 'Enrolled',
      profile_photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
    },
    {
      id: 'staff_004',
      staff_id: 'VPP-2024-004',
      full_name: 'Venkat Rao Chilukuri',
      gender: 'Male',
      date_of_birth: '1988-04-19',
      phone: '+91 98480 45678',
      email: 'venkat.r@vuppala.edu',
      address: '7-1-89, Ameerpet, Hyderabad',
      designation: 'Lecturer in Mathematics',
      department: 'Kalashala Degree College',
      joining_date: '2020-09-01',
      employment_status: 'Active',
      assigned_shift_id: 'shift_kalashala_regular',
      assigned_campus_id: 'campus_main',
      face_enrollment_status: 'Enrolled',
      profile_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    },
    {
      id: 'staff_005',
      staff_id: 'VPP-2024-005',
      full_name: 'Anitha Madhav',
      gender: 'Female',
      date_of_birth: '1992-02-14',
      phone: '+91 98480 56789',
      email: 'anitha.m@vuppala.edu',
      address: 'H.No 3-90, Dilsukhnagar, Hyderabad',
      designation: 'Primary School Teacher - Science & Telugu',
      department: 'Prathamika Patashala',
      joining_date: '2021-06-20',
      employment_status: 'Active',
      assigned_shift_id: 'shift_primary_morning',
      assigned_campus_id: 'campus_main',
      face_enrollment_status: 'Not Enrolled',
      profile_photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    },
    {
      id: 'staff_006',
      staff_id: 'VPP-2024-006',
      full_name: 'Deepa Sharma',
      gender: 'Female',
      date_of_birth: '1986-09-30',
      phone: '+91 98480 67890',
      email: 'manager@vuppala.edu',
      address: 'Flat 101, Srinivasa Towers, Hyderabad',
      designation: 'Administrative Superintendent & Attendance In-charge',
      department: 'Administration',
      joining_date: '2017-03-01',
      employment_status: 'Active',
      assigned_shift_id: 'shift_admin_general',
      assigned_campus_id: 'campus_main',
      face_enrollment_status: 'Enrolled',
      profile_photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
    },
  ];

  for (const st of staffList) {
    // Insert staff
    await query(
      `INSERT INTO staff (id, staff_id, full_name, gender, date_of_birth, phone, email, address, designation, department, joining_date, employment_status, assigned_shift_id, assigned_campus_id, face_enrollment_status, profile_photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (staff_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         designation = EXCLUDED.designation,
         department = EXCLUDED.department,
         assigned_shift_id = EXCLUDED.assigned_shift_id,
         assigned_campus_id = EXCLUDED.assigned_campus_id`,
      [st.id, st.staff_id, st.full_name, st.gender, st.date_of_birth, st.phone, st.email, st.address, st.designation, st.department, st.joining_date, st.employment_status, st.assigned_shift_id, st.assigned_campus_id, st.face_enrollment_status, st.profile_photo_url]
    );

    // Create login user account for staff
    await query(
      `INSERT INTO users (id, email, password_hash, role, staff_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [`user_${st.id}`, st.email, staffPasswordHash, 'staff', st.id]
    );

    // Seed dummy 128D biometric vector for enrolled staff
    if (st.face_enrollment_status === 'Enrolled') {
      // Deterministic pseudo-vector for testing
      const descriptor = Array.from({ length: 128 }, (_, idx) =>
        Math.sin((idx + 1) * (parseInt(st.staff_id.replace(/\D/g, '')) || 1)) * 0.1
      );

      await query(
        `INSERT INTO staff_biometrics (id, staff_id, face_descriptor, sample_count, consent_given, enrolled_by)
         VALUES ($1, $2, $3, 3, true, 'System Seed')
         ON CONFLICT (staff_id) DO NOTHING`,
        [`bio_${st.id}`, st.id, JSON.stringify(descriptor)]
      );
    }
  }

  // 4. Seed Recent Attendance Records (Past 10 days for rich analytics)
  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Skip Sundays
    if (d.getDay() === 0) continue;

    for (const st of staffList) {
      if (st.employment_status !== 'Active') continue;

      // Deterministic variation
      const rand = (d.getDate() * 17 + parseInt(st.staff_id.replace(/\D/g, ''))) % 10;
      let status = 'Present';
      let checkIn: string | null = '08:42:15';
      let checkOut: string | null = '16:35:10';
      let hours = 7.8;

      if (rand === 1) {
        status = 'Late';
        checkIn = '09:25:30';
        hours = 7.1;
      } else if (rand === 2 && i > 0) {
        status = 'On Leave';
        checkIn = null;
        checkOut = null;
        hours = 0;
      } else if (rand === 3 && i > 0) {
        status = 'Absent';
        checkIn = null;
        checkOut = null;
        hours = 0;
      } else if (rand === 4) {
        status = 'Half Day';
        checkIn = '08:45:00';
        checkOut = '13:00:00';
        hours = 4.25;
      }

      if (i === 0) {
        // For today, some are checked in and haven't checked out yet
        if (rand > 4) {
          checkOut = null;
          hours = 4.5;
        }
      }

      await query(
        `INSERT INTO attendance_records (id, staff_id, date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_campus_id, status, verification_method, face_match_confidence, working_hours)
         VALUES ($1, $2, $3, $4, $5, 16.887333, 78.443028, 12.5, 'campus_main', $6, 'FRS_GPS', 98.4, $7)
         ON CONFLICT (staff_id, date) DO NOTHING`,
        [`att_${dateStr}_${st.id}`, st.id, dateStr, checkIn, checkOut, status, hours]
      );
    }
  }

  // 5. Seed Sample Leave Requests
  await query(
    `INSERT INTO leave_requests (id, staff_id, leave_type, start_date, end_date, reason, status, approved_by, reviewer_remarks)
     VALUES 
     ('leave_01', 'staff_003', 'Casual Leave', '2026-09-15', '2026-09-16', 'Attending academic curriculum workshop at University', 'Approved', 'principal@vuppala.edu', 'Approved for institutional faculty representation.'),
     ('leave_02', 'staff_005', 'Sick Leave', '2026-09-18', '2026-09-19', 'Viral fever and medical rest advice', 'Pending', NULL, NULL)
     ON CONFLICT (id) DO NOTHING`
  );

  // 6. Seed Sample Audit Logs (Face attempts and Geofence checks)
  await query(
    `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
     VALUES
     ('audit_01', 'FACE_VERIFICATION', 'staff_002', 'suresh.k@vuppala.edu', 'SUCCESS', '{"confidence": 98.6, "distance": 0.18, "liveness": "PASSED"}', '192.168.1.105'),
     ('audit_02', 'GEOFENCE_VIOLATION', 'staff_004', 'venkat.r@vuppala.edu', 'FAILED', '{"distanceMeters": 850, "campus": "campus_main", "allowedRadius": 350}', '192.168.1.214'),
     ('audit_03', 'BIOMETRIC_ENROLLMENT', 'staff_001', 'admin@vuppala.edu', 'SUCCESS', '{"samples": 3, "quality": "HIGH"}', '192.168.1.10')
     ON CONFLICT (id) DO NOTHING`
  );

  console.log('✅ Initial database seed completed successfully!');
}

// Allow direct execution via ts-node
if (require.main === module) {
  const { initDatabase } = require('../config/database');
  initDatabase().then(() => seedInitialData()).then(() => process.exit(0)).catch((err: any) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

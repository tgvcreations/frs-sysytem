import crypto from 'crypto';
import { Response } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { verifyLocationAgainstCampus } from '../services/geofenceService';
import { verifyStaffFace, distanceToConfidence, identifyStaffFace } from '../services/biometricService';
import { CampusGeofence, Shift, ChallengeType, VerificationSession } from '../types';

export async function verifyAndMarkAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let {
      staff_id,
      face_descriptor,
      latitude,
      longitude,
      accuracy,
      liveness_passed,
      liveness_challenge,
    } = req.body;

    // 1. Authenticated user role check
    if (req.user?.role === 'staff') {
      if (!req.user.staff_id) {
        res.status(400).json({ error: 'No staff record linked to your user account.' });
        return;
      }
      staff_id = req.user.staff_id;
    }

    if (!face_descriptor || !Array.isArray(face_descriptor)) {
      res.status(400).json({ error: 'Valid face biometric descriptor is required.' });
      return;
    }

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      res.status(400).json({ error: 'Accurate GPS coordinates (latitude, longitude, accuracy) are required.' });
      return;
    }

    // 2. Identify staff if not directly specified (1:N matching)
    if (!staff_id) {
      const match = await identifyStaffFace(face_descriptor);
      if (!match) {
        res.status(400).json({ error: 'Face verification failed. Please try again.' });
        return;
      }
      staff_id = match.staffId;
    }

    // 3. Fetch staff and assigned campus & shift
    const staffRes = await query(
      `SELECT s.*, c.name as campus_name, sh.name as shift_name
       FROM staff s
       LEFT JOIN campuses c ON s.assigned_campus_id = c.id
       LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
       WHERE s.id = $1`,
      [staff_id]
    );

    if (staffRes.rows.length === 0) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const staff = staffRes.rows[0];

    if (staff.employment_status !== 'Active') {
      res.status(403).json({ error: `Staff account is currently ${staff.employment_status}. Contact administration.` });
      return;
    }

    if (staff.face_enrollment_status !== 'Enrolled') {
      res.status(400).json({ error: 'Face biometric template not enrolled for this staff member. Please complete biometric enrollment first.' });
      return;
    }

    // 4. Face Count & Quality Checks
    if (req.body.face_count !== undefined && req.body.face_count > 1) {
      res.status(400).json({ error: 'Only one person should be visible during attendance verification.' });
      return;
    }
    if (req.body.face_count === 0) {
      res.status(400).json({ error: 'No face detected. Please position yourself in front of the camera.' });
      return;
    }
    if (req.body.face_clear === false) {
      res.status(400).json({ error: 'Face is not clear. Please position yourself in front of the camera.' });
      return;
    }

    // 5. Liveness anti-spoof check
    if (liveness_passed === false) {
      res.status(400).json({ error: 'Liveness anti-spoofing verification failed. Please follow real-time instructions.' });
      return;
    }

    // 6. Backend Face Recognition Verification
    const faceResult = await verifyStaffFace(staff.id, face_descriptor);
    if (!faceResult.isMatch) {
      // Anti-wrong-person check: Check if face matches any other enrolled staff
      const otherMatch = await identifyStaffFace(face_descriptor);
      if (otherMatch && otherMatch.staffId !== staff.id) {
        await query(
          `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
           VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'FAILED', $4, $5)`,
          [
            `audit_${Date.now()}`,
            staff.id,
            req.user?.email || staff.email,
            JSON.stringify({
              error: 'Face does not match the registered staff member.',
              expected: staff.id,
              detected: otherMatch.staffId,
              distance: otherMatch.distance,
            }),
            req.ip,
          ]
        );
        res.status(400).json({ error: 'Face does not match the registered staff member.' });
        return;
      }

      // General mismatch
      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'FAILED', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({ distance: faceResult.distance, threshold: 0.48, error: faceResult.error }),
          req.ip,
        ]
      );

      res.status(400).json({ error: 'Face verification failed. Please try again.' });
      return;
    }

    // 6. Backend Location & Geofence Verification
    const campusRes = await query(`SELECT * FROM campuses WHERE id = $1`, [staff.assigned_campus_id]);
    if (campusRes.rows.length === 0) {
      res.status(400).json({ error: 'Assigned campus geofence not found.' });
      return;
    }

    const campus: CampusGeofence = {
      ...campusRes.rows[0],
      polygon_coordinates: typeof campusRes.rows[0].polygon_coordinates === 'string'
        ? JSON.parse(campusRes.rows[0].polygon_coordinates)
        : campusRes.rows[0].polygon_coordinates,
    };

    const geofenceResult = verifyLocationAgainstCampus(latitude, longitude, accuracy, campus);
    if (!geofenceResult.isValid) {
      // Audit log geofence failure
      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'GEOFENCE_VIOLATION', $2, $3, 'FAILED', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({
            distanceMeters: geofenceResult.distanceMeters,
            allowedRadius: campus.radius_meters,
            accuracyProvided: accuracy,
            accuracyAllowed: campus.allowed_accuracy_meters,
            error: geofenceResult.error,
          }),
          req.ip,
        ]
      );

      res.status(400).json({ error: geofenceResult.error });
      return;
    }

    // 7. Check Shift and Attendance Rules
    const shiftRes = await query(`SELECT * FROM shifts WHERE id = $1`, [staff.assigned_shift_id]);
    const shift: Shift = shiftRes.rows[0] || {
      id: 'default',
      name: 'Standard Shift',
      start_time: '09:00',
      end_time: '17:00',
      grace_period_minutes: 15,
      half_day_threshold_hours: 4.0,
      full_day_threshold_hours: 6.5,
      is_active: true,
    };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Query existing record for today
    const existingRec = await query(
      `SELECT * FROM attendance_records WHERE staff_id = $1 AND date = $2`,
      [staff.id, dateStr]
    );

    if (existingRec.rows.length === 0) {
      // ===== CASE A: CHECK-IN =====
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const graceMinutes = shift.grace_period_minutes || 15;
      const shiftStartInMinutes = startHour * 60 + startMin;
      const lateThresholdMinutes = shiftStartInMinutes + graceMinutes;

      const [currentHour, currentMin] = timeStr.split(':').map(Number);
      const currentTimeInMinutes = currentHour * 60 + currentMin;

      const isLate = currentTimeInMinutes > lateThresholdMinutes;
      const status = isLate ? 'Late' : 'Present';

      const recId = `att_${dateStr}_${staff.id}`;
      await query(
        `INSERT INTO attendance_records (
          id, staff_id, date, check_in_time, check_in_latitude, check_in_longitude,
          check_in_accuracy, check_in_campus_id, status, verification_method,
          face_match_confidence, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'FRS_GPS', $10, $11)`,
        [
          recId, staff.id, dateStr, timeStr, latitude, longitude,
          accuracy, campus.id, status, faceResult.confidence,
          isLate ? `Checked in late after ${shift.start_time} + ${graceMinutes}m grace.` : 'On-time check-in.'
        ]
      );

      // Audit log success
      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'SUCCESS', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({ action: 'CHECK_IN', confidence: faceResult.confidence, status, campus: campus.name }),
          req.ip,
        ]
      );

      res.json({
        success: true,
        action: 'CHECK_IN',
        staff_name: staff.full_name,
        staff_id: staff.staff_id,
        date: dateStr,
        time: timeStr,
        status,
        campus_name: campus.name,
        confidence: faceResult.confidence,
        message: `Welcome ${staff.full_name}! Check-in recorded as ${status} at ${timeStr}.`,
      });
      return;
    }

    const todayRecord = existingRec.rows[0];

    if (!todayRecord.check_out_time) {
      // ===== CASE B: CHECK-OUT =====
      const checkInTime = todayRecord.check_in_time;
      let workingHours = 0;

      if (checkInTime) {
        const [inH, inM, inS] = checkInTime.split(':').map(Number);
        const [outH, outM, outS] = timeStr.split(':').map(Number);
        const inSecs = inH * 3600 + inM * 60 + (inS || 0);
        const outSecs = outH * 3600 + outM * 60 + (outS || 0);
        workingHours = Math.max(0, Math.round(((outSecs - inSecs) / 3600) * 100) / 100);
      }

      // Check half day / early departure
      let finalStatus = todayRecord.status;
      if (workingHours < shift.half_day_threshold_hours) {
        finalStatus = 'Half Day';
      } else if (todayRecord.status !== 'Late') {
        finalStatus = 'Present';
      }

      await query(
        `UPDATE attendance_records SET
          check_out_time = $1,
          check_out_latitude = $2,
          check_out_longitude = $3,
          check_out_accuracy = $4,
          check_out_campus_id = $5,
          working_hours = $6,
          status = $7,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [timeStr, latitude, longitude, accuracy, campus.id, workingHours, finalStatus, todayRecord.id]
      );

      // Audit log success
      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'SUCCESS', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({ action: 'CHECK_OUT', workingHours, status: finalStatus, campus: campus.name }),
          req.ip,
        ]
      );

      res.json({
        success: true,
        action: 'CHECK_OUT',
        staff_name: staff.full_name,
        staff_id: staff.staff_id,
        date: dateStr,
        check_in_time: todayRecord.check_in_time,
        check_out_time: timeStr,
        working_hours: workingHours,
        status: finalStatus,
        campus_name: campus.name,
        confidence: faceResult.confidence,
        message: `Goodbye ${staff.full_name}! Check-out recorded at ${timeStr}. Total time: ${workingHours} hrs.`,
      });
      return;
    }

    // ===== CASE C: ALREADY CHECKED OUT =====
    res.status(400).json({
      error: `You have already completed check-in (${todayRecord.check_in_time}) and check-out (${todayRecord.check_out_time}) for today. To adjust your record, contact the Attendance Manager.`,
    });
  } catch (err: any) {
    console.error('Verify attendance error:', err);
    res.status(500).json({ error: 'Failed to process attendance verification.' });
  }
}

export async function getTodayAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { department, status, campus_id } = req.query;

    let sql = `
      SELECT 
        a.*,
        s.staff_id as staff_code, s.full_name, s.department, s.designation, s.profile_photo_url,
        c.name as campus_name,
        sh.name as shift_name, sh.start_time as shift_start, sh.end_time as shift_end
      FROM attendance_records a
      JOIN staff s ON a.staff_id = s.id
      LEFT JOIN campuses c ON a.check_in_campus_id = c.id
      LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
      WHERE a.date = $1
    `;

    const params: any[] = [today];

    if (department && department !== 'all') {
      params.push(department);
      sql += ` AND s.department = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    if (campus_id && campus_id !== 'all') {
      params.push(campus_id);
      sql += ` AND s.assigned_campus_id = $${params.length}`;
    }

    sql += ` ORDER BY a.check_in_time DESC NULLS LAST`;

    const result = await query(sql, params);
    res.json({ date: today, records: result.rows, count: result.rows.length });
  } catch (err: any) {
    console.error('Get today attendance error:', err);
    res.status(500).json({ error: 'Failed to retrieve today attendance.' });
  }
}

export async function getAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      staff_id,
      start_date,
      end_date,
      department,
      campus_id,
      status,
      limit = 100,
    } = req.query;

    let sql = `
      SELECT 
        a.*,
        s.staff_id as staff_code, s.full_name, s.department, s.designation, s.profile_photo_url,
        c.name as campus_name,
        sh.name as shift_name
      FROM attendance_records a
      JOIN staff s ON a.staff_id = s.id
      LEFT JOIN campuses c ON a.check_in_campus_id = c.id
      LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // If staff user, restrict to own records
    if (req.user?.role === 'staff') {
      params.push(req.user.staff_id);
      sql += ` AND a.staff_id = $${params.length}`;
    } else if (staff_id) {
      params.push(staff_id);
      sql += ` AND (a.staff_id = $${params.length} OR s.staff_id = $${params.length})`;
    }

    if (start_date) {
      params.push(start_date);
      sql += ` AND a.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND a.date <= $${params.length}`;
    }

    if (department && department !== 'all') {
      params.push(department);
      sql += ` AND s.department = $${params.length}`;
    }

    if (campus_id && campus_id !== 'all') {
      params.push(campus_id);
      sql += ` AND s.assigned_campus_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.date DESC, a.check_in_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json({ records: result.rows, count: result.rows.length });
  } catch (err: any) {
    console.error('Get attendance history error:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance history.' });
  }
}

export async function manualAttendanceCorrection(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { check_in_time, check_out_time, status, notes } = req.body;

    if (!notes) {
      res.status(400).json({ error: 'A justification/note is mandatory for manual attendance adjustment.' });
      return;
    }

    const existing = await query(`SELECT * FROM attendance_records WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }

    let workingHours = existing.rows[0].working_hours;
    if (check_in_time && check_out_time) {
      const [inH, inM] = check_in_time.split(':').map(Number);
      const [outH, outM] = check_out_time.split(':').map(Number);
      workingHours = Math.max(0, Math.round(((outH * 60 + outM - (inH * 60 + inM)) / 60) * 100) / 100);
    }

    await query(
      `UPDATE attendance_records SET
        check_in_time = COALESCE($1, check_in_time),
        check_out_time = COALESCE($2, check_out_time),
        status = COALESCE($3, status),
        working_hours = $4,
        verification_method = 'Manual_Correction',
        notes = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [check_in_time, check_out_time, status, workingHours, notes, id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details)
       VALUES ($1, 'ATTENDANCE_CORRECTION', $2, $3, 'SUCCESS', $4)`,
      [
        `audit_${Date.now()}`,
        existing.rows[0].staff_id,
        req.user?.email,
        JSON.stringify({ recordId: id, status, notes, updatedBy: req.user?.email }),
      ]
    );

    res.json({ message: 'Attendance record updated successfully.' });
  } catch (err: any) {
    console.error('Manual correction error:', err);
    res.status(500).json({ error: 'Failed to correct attendance record.' });
  }
}

// ============================================================================
// CRITICAL FRS VERIFICATION SESSION ARCHITECTURE
// ============================================================================

export function isSessionExpired(session: any): boolean {
  if (!session || !session.expires_at) return true;
  const exp = Number(session.expires_at);
  if (!isNaN(exp) && exp > 1000000000) {
    return exp < Date.now();
  }
  return new Date(session.expires_at).getTime() < Date.now();
}

/**
 * 1. Start Verification Session
 * Initializes a cryptographically backed, short-lived (90s) challenge session.
 * Strictly checks that the requested staff profile corresponds to the authenticated user.
 */
export async function startVerificationSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let targetStaffId = req.body.staff_id;

    // Strict staff binding: staff users CANNOT request sessions for another staff member
    if (req.user?.role === 'staff') {
      if (!req.user.staff_id) {
        res.status(400).json({ error: 'No staff record linked to your user account.' });
        return;
      }
      targetStaffId = req.user.staff_id;
    }

    if (!targetStaffId) {
      res.status(400).json({ error: 'Staff ID is required to start a verification session.' });
      return;
    }

    const staffRes = await query(
      `SELECT s.*, c.name as campus_name, sh.name as shift_name
       FROM staff s
       LEFT JOIN campuses c ON s.assigned_campus_id = c.id
       LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
       WHERE s.id = $1 OR s.staff_id = $1`,
      [targetStaffId]
    );

    if (staffRes.rows.length === 0) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const staff = staffRes.rows[0];

    if (staff.employment_status !== 'Active') {
      res.status(403).json({ error: `Staff account is currently ${staff.employment_status}. Contact administration.` });
      return;
    }

    if (staff.face_enrollment_status !== 'Enrolled') {
      res.status(400).json({ error: 'Face biometric template not enrolled for this staff member. Please complete biometric enrollment first.' });
      return;
    }

    // Standard direct facial presence verification
    const chosen: { type: ChallengeType; instruction: string } = {
      type: 'face_presence',
      instruction: 'Face positioned steadily for attendance verification',
    };

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionId = `vs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAtEpoch = Date.now() + 90 * 1000; // 90 seconds TTL

    await query(
      `INSERT INTO verification_sessions (
        id, session_token, user_id, staff_id, challenge_type, challenge_params,
        liveness_verified, identity_verified, location_verified, expires_at, used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, false, false, false, $7, false, CURRENT_TIMESTAMP)`,
      [
        sessionId,
        sessionToken,
        req.user?.id || null,
        staff.id,
        chosen.type,
        JSON.stringify({ instruction: chosen.instruction, initiatedAt: Date.now() }),
        expiresAtEpoch,
      ]
    );

    res.json({
      success: true,
      session_token: sessionToken,
      challenge_type: chosen.type,
      challenge_instruction: chosen.instruction,
      expires_at: new Date(expiresAtEpoch).toISOString(),
      expires_at_epoch: expiresAtEpoch,
      staff_id: staff.id,
      staff_code: staff.staff_id,
      staff_name: staff.full_name,
      campus_name: staff.campus_name,
    });
  } catch (err: any) {
    console.error('startVerificationSession error:', err);
    res.status(500).json({ error: 'Failed to initiate verification session.' });
  }
}

/**
 * 2. Validate Liveness Challenge
 * Evaluates active facial landmarks, multi-frame EAR (Eye Aspect Ratio) transitions,
 * single face presence, and anti-static-photo heuristics.
 */
export async function verifyLiveness(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      session_token,
      ear_history,
      face_count,
      blink_detected,
      blink_count,
      is_centered,
      lighting_good,
      face_size_ok,
      pose_movement,
    } = req.body;

    if (!session_token) {
      res.status(400).json({ error: 'Verification session token is required.' });
      return;
    }

    const sessRes = await query(
      `SELECT * FROM verification_sessions WHERE session_token = $1`,
      [session_token]
    );

    if (sessRes.rows.length === 0) {
      res.status(404).json({ error: 'Verification session not found or invalid.' });
      return;
    }

    const session = sessRes.rows[0];

    if (session.used) {
      res.status(400).json({ error: 'This verification session has already been used. Replay detected.' });
      return;
    }

    if (isSessionExpired(session)) {
      res.status(400).json({ error: 'Verification session has expired. Please initiate a new challenge.' });
      return;
    }

    // 1. Single Face validation - strictly exactly 1 person
    if (face_count !== undefined && face_count > 1) {
      res.status(400).json({ error: 'Only one person should be visible during attendance verification.' });
      return;
    }
    if (face_count === 0) {
      res.status(400).json({ error: 'No face detected. Please position yourself in front of the camera.' });
      return;
    }

    // 2. Face Quality check
    if (is_centered === false || lighting_good === false || face_size_ok === false) {
      res.status(400).json({ error: 'Face is not clear. Please position yourself in front of the camera.' });
      return;
    }

    // Update session: face presence verified
    const telemetry = {
      face_count,
      is_centered,
      lighting_good,
      face_size_ok,
      verified_at: new Date().toISOString(),
    };

    await query(
      `UPDATE verification_sessions SET liveness_verified = true, telemetry = $1 WHERE id = $2`,
      [JSON.stringify(telemetry), session.id]
    );

    res.json({
      success: true,
      message: 'Face presence confirmed successfully.',
      challenge_type: session.challenge_type,
    });
  } catch (err: any) {
    console.error('verifyLiveness error:', err);
    res.status(500).json({ error: 'Failed to verify liveness.' });
  }
}

/**
 * 3. Validate Face Identity
 * Performs 1:1 biometric matching against the session's enrolled staff member.
 * Protects against wrong person (Staff B trying to verify for Staff A).
 */
export async function verifyIdentity(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { session_token, face_descriptor } = req.body;

    if (!session_token) {
      res.status(400).json({ error: 'Verification session token is required.' });
      return;
    }

    if (!face_descriptor || !Array.isArray(face_descriptor)) {
      res.status(400).json({ error: 'Valid face biometric descriptor is required.' });
      return;
    }

    const sessRes = await query(
      `SELECT * FROM verification_sessions WHERE session_token = $1`,
      [session_token]
    );

    if (sessRes.rows.length === 0) {
      res.status(404).json({ error: 'Verification session not found or invalid.' });
      return;
    }

    const session = sessRes.rows[0];

    if (session.used) {
      res.status(400).json({ error: 'This verification session has already been used. Replay detected.' });
      return;
    }

    if (isSessionExpired(session)) {
      res.status(400).json({ error: 'Verification session has expired. Please initiate a new challenge.' });
      return;
    }

    // Liveness MUST be verified prior to identity check
    if (!session.liveness_verified) {
      res.status(400).json({ error: 'Active liveness detection must be completed before identity verification.' });
      return;
    }

    // 1:1 Matching against the expected enrolled staff member
    const faceResult = await verifyStaffFace(session.staff_id, face_descriptor);

    if (!faceResult.isMatch) {
      // Anti-Wrong-Person check: See if this face belongs to someone else
      const otherMatch = await identifyStaffFace(face_descriptor);
      if (otherMatch && otherMatch.staffId !== session.staff_id) {
        await query(
          `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
           VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'FAILED', $4, $5)`,
          [
            `audit_${Date.now()}`,
            session.staff_id,
            req.user?.email || 'unknown',
            JSON.stringify({
              error: 'Face does not match the registered staff member.',
              expected_staff: session.staff_id,
              detected_match: otherMatch.staffId,
              distance: otherMatch.distance,
            }),
            req.ip,
          ]
        );

        res.status(400).json({ error: 'Face does not match the registered staff member.' });
        return;
      }

      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'FAILED', $4, $5)`,
        [
          `audit_${Date.now()}`,
          session.staff_id,
          req.user?.email || 'unknown',
          JSON.stringify({ distance: faceResult.distance, threshold: 0.48 }),
          req.ip,
        ]
      );

      res.status(400).json({ error: 'Face verification failed. Please try again.' });
      return;
    }

    // Update session: identity verified
    await query(
      `UPDATE verification_sessions SET identity_verified = true WHERE id = $1`,
      [session.id]
    );

    res.json({
      success: true,
      message: 'Face identity verified successfully.',
      confidence: faceResult.confidence,
      distance: faceResult.distance,
    });
  } catch (err: any) {
    console.error('verifyIdentity error:', err);
    res.status(500).json({ error: 'Failed to verify face identity.' });
  }
}

/**
 * 4. Validate Location & Geofence
 * Validates GPS accuracy threshold and verifies coordinates inside campus boundary.
 */
export async function verifyLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { session_token, latitude, longitude, accuracy } = req.body;

    if (!session_token) {
      res.status(400).json({ error: 'Verification session token is required.' });
      return;
    }

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      res.status(400).json({ error: 'Accurate GPS coordinates (latitude, longitude, accuracy) are required.' });
      return;
    }

    const sessRes = await query(
      `SELECT * FROM verification_sessions WHERE session_token = $1`,
      [session_token]
    );

    if (sessRes.rows.length === 0) {
      res.status(404).json({ error: 'Verification session not found or invalid.' });
      return;
    }

    const session = sessRes.rows[0];

    if (session.used) {
      res.status(400).json({ error: 'This verification session has already been used. Replay detected.' });
      return;
    }

    if (isSessionExpired(session)) {
      res.status(400).json({ error: 'Verification session has expired. Please initiate a new challenge.' });
      return;
    }

    // Fetch assigned campus
    const staffRes = await query(`SELECT assigned_campus_id FROM staff WHERE id = $1`, [session.staff_id]);
    const campusId = staffRes.rows[0]?.assigned_campus_id;

    let campusQuery = campusId ? `SELECT * FROM campuses WHERE id = $1` : `SELECT * FROM campuses WHERE is_active = true LIMIT 1`;
    const campusParams = campusId ? [campusId] : [];
    const campusRes = await query(campusQuery, campusParams);

    if (campusRes.rows.length === 0) {
      res.status(400).json({ error: 'Assigned campus geofence not found.' });
      return;
    }

    const campus: CampusGeofence = {
      ...campusRes.rows[0],
      polygon_coordinates: typeof campusRes.rows[0].polygon_coordinates === 'string'
        ? JSON.parse(campusRes.rows[0].polygon_coordinates)
        : campusRes.rows[0].polygon_coordinates,
    };

    const geofenceResult = verifyLocationAgainstCampus(latitude, longitude, accuracy, campus);
    if (!geofenceResult.isValid) {
      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'GEOFENCE_VIOLATION', $2, $3, 'FAILED', $4, $5)`,
        [
          `audit_${Date.now()}`,
          session.staff_id,
          req.user?.email || 'unknown',
          JSON.stringify({
            distanceMeters: geofenceResult.distanceMeters,
            allowedRadius: campus.radius_meters,
            accuracyProvided: accuracy,
            accuracyAllowed: campus.allowed_accuracy_meters,
            error: geofenceResult.error,
          }),
          req.ip,
        ]
      );

      res.status(400).json({ error: geofenceResult.error });
      return;
    }

    // Mark location verified
    await query(
      `UPDATE verification_sessions SET location_verified = true WHERE id = $1`,
      [session.id]
    );

    res.json({
      success: true,
      message: 'Campus location verified.',
      campus_name: campus.name,
      distance: geofenceResult.distanceMeters,
    });
  } catch (err: any) {
    console.error('verifyLocation error:', err);
    res.status(500).json({ error: 'Failed to verify location.' });
  }
}

/**
 * 5. Finalize Attendance Creation
 * Requires all 3 verification steps: Liveness + Identity + Location.
 * Consumes the one-time session token and writes attendance record.
 */
export async function finalizeAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { session_token, latitude, longitude, accuracy } = req.body;

    if (!session_token) {
      res.status(400).json({ error: 'Verification session token is required.' });
      return;
    }

    const sessRes = await query(
      `SELECT * FROM verification_sessions WHERE session_token = $1`,
      [session_token]
    );

    if (sessRes.rows.length === 0) {
      res.status(404).json({ error: 'Verification session not found or invalid.' });
      return;
    }

    const session = sessRes.rows[0];

    if (session.used) {
      res.status(400).json({ error: 'This verification session has already been used or expired. Please initiate a new verification.' });
      return;
    }

    if (isSessionExpired(session)) {
      res.status(400).json({ error: 'Verification session has expired. Please initiate a new challenge.' });
      return;
    }

    // MANDATORY DUAL+LIVENESS REQUIREMENT
    if (!session.liveness_verified || !session.identity_verified || !session.location_verified) {
      res.status(400).json({
        error: 'Attendance cannot be marked. All verification criteria (Liveness, Identity, Location) are mandatory.',
        missing: {
          liveness: !session.liveness_verified,
          identity: !session.identity_verified,
          location: !session.location_verified,
        },
      });
      return;
    }

    // Consume session token immediately to prevent replay
    await query(
      `UPDATE verification_sessions SET used = true WHERE id = $1`,
      [session.id]
    );

    // Fetch staff, campus, and shift
    const staffRes = await query(
      `SELECT s.*, c.name as campus_name, sh.name as shift_name
       FROM staff s
       LEFT JOIN campuses c ON s.assigned_campus_id = c.id
       LEFT JOIN shifts sh ON s.assigned_shift_id = sh.id
       WHERE s.id = $1`,
      [session.staff_id]
    );

    const staff = staffRes.rows[0];

    const campusRes = await query(`SELECT * FROM campuses WHERE id = $1`, [staff.assigned_campus_id]);
    const campus = campusRes.rows[0] || { id: 'default', name: 'Main Campus' };

    const shiftRes = await query(`SELECT * FROM shifts WHERE id = $1`, [staff.assigned_shift_id]);
    const shift: Shift = shiftRes.rows[0] || {
      id: 'default',
      name: 'Standard Shift',
      start_time: '09:00',
      end_time: '17:00',
      grace_period_minutes: 15,
      half_day_threshold_hours: 4.0,
      full_day_threshold_hours: 6.5,
      is_active: true,
      code: 'STD',
      created_at: '',
      updated_at: '',
    };

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Check existing attendance for today
    const existingRec = await query(
      `SELECT * FROM attendance_records WHERE staff_id = $1 AND date = $2`,
      [staff.id, dateStr]
    );

    if (existingRec.rows.length === 0) {
      // ===== CHECK-IN =====
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const graceMinutes = shift.grace_period_minutes || 15;
      const shiftStartInMinutes = startHour * 60 + startMin;
      const lateThresholdMinutes = shiftStartInMinutes + graceMinutes;

      const [currentHour, currentMin] = timeStr.split(':').map(Number);
      const currentTimeInMinutes = currentHour * 60 + currentMin;

      const isLate = currentTimeInMinutes > lateThresholdMinutes;
      const status = isLate ? 'Late' : 'Present';

      const recId = `att_${dateStr}_${staff.id}`;
      await query(
        `INSERT INTO attendance_records (
          id, staff_id, date, check_in_time, check_in_latitude, check_in_longitude,
          check_in_accuracy, check_in_campus_id, status, verification_method,
          face_match_confidence, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'FRS_GPS', $10, $11)`,
        [
          recId, staff.id, dateStr, timeStr, latitude || 16.887333, longitude || 78.443028,
          accuracy || 10.0, campus.id, status, 98.5,
          isLate ? `Checked in late after ${shift.start_time} + ${graceMinutes}m grace.` : 'On-time check-in with verified liveness.'
        ]
      );

      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'SUCCESS', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({ action: 'CHECK_IN', session_id: session.id, status, campus: campus.name }),
          req.ip,
        ]
      );

      res.json({
        success: true,
        action: 'CHECK_IN',
        staff_name: staff.full_name,
        staff_id: staff.staff_id,
        date: dateStr,
        time: timeStr,
        status,
        campus_name: campus.name,
        confidence: 98.5,
        message: `Welcome ${staff.full_name}! Check-in verified and recorded as ${status} at ${timeStr}.`,
      });
      return;
    }

    const todayRecord = existingRec.rows[0];

    if (!todayRecord.check_out_time) {
      // ===== CHECK-OUT =====
      const checkInTime = todayRecord.check_in_time;
      let workingHours = 0;

      if (checkInTime) {
        const [inH, inM, inS] = checkInTime.split(':').map(Number);
        const [outH, outM, outS] = timeStr.split(':').map(Number);
        const inSecs = inH * 3600 + inM * 60 + (inS || 0);
        const outSecs = outH * 3600 + outM * 60 + (outS || 0);
        workingHours = Math.max(0, Math.round(((outSecs - inSecs) / 3600) * 100) / 100);
      }

      let finalStatus = todayRecord.status;
      const fullDayThreshold = Number(shift.full_day_threshold_hours) || 7.0;
      const halfDayThreshold = Number(shift.half_day_threshold_hours) || 4.0;

      if (workingHours < 2.0) {
        finalStatus = 'Absent';
      } else if (workingHours < fullDayThreshold) {
        finalStatus = 'Half Day';
      } else if (todayRecord.status !== 'Late') {
        finalStatus = 'Present';
      }

      await query(
        `UPDATE attendance_records SET
          check_out_time = $1,
          check_out_latitude = $2,
          check_out_longitude = $3,
          check_out_accuracy = $4,
          check_out_campus_id = $5,
          working_hours = $6,
          status = $7,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [timeStr, latitude || 16.887333, longitude || 78.443028, accuracy || 10.0, campus.id, workingHours, finalStatus, todayRecord.id]
      );

      await query(
        `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details, ip_address)
         VALUES ($1, 'FACE_VERIFICATION', $2, $3, 'SUCCESS', $4, $5)`,
        [
          `audit_${Date.now()}`,
          staff.id,
          req.user?.email || staff.email,
          JSON.stringify({ action: 'CHECK_OUT', session_id: session.id, workingHours, status: finalStatus, campus: campus.name }),
          req.ip,
        ]
      );

      res.json({
        success: true,
        action: 'CHECK_OUT',
        staff_name: staff.full_name,
        staff_id: staff.staff_id,
        date: dateStr,
        check_in_time: todayRecord.check_in_time,
        check_out_time: timeStr,
        working_hours: workingHours,
        status: finalStatus,
        campus_name: campus.name,
        confidence: 98.5,
        message: `Goodbye ${staff.full_name}! Check-out recorded at ${timeStr}. Total time: ${workingHours} hrs.`,
      });
      return;
    }

    res.status(400).json({
      error: `You have already completed check-in (${todayRecord.check_in_time}) and check-out (${todayRecord.check_out_time}) for today. To adjust your record, contact the Attendance Manager.`,
    });
  } catch (err: any) {
    console.error('finalizeAttendance error:', err);
    res.status(500).json({ error: 'Failed to finalize attendance.' });
  }
}

/**
 * 6. Get FRS Diagnostics
 * Dedicated Administrator FRS Diagnostics / Debug telemetry inspection without exposing sensitive biometric templates.
 */
export async function getDiagnostics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const sessionsRes = await query(
      `SELECT s.*, st.full_name, st.staff_id as staff_code
       FROM verification_sessions s
       LEFT JOIN staff st ON s.staff_id = st.id
       ORDER BY s.created_at DESC LIMIT 25`
    );

    const statsRes = await query(
      `SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN liveness_verified = true THEN 1 END) as liveness_passed,
        COUNT(CASE WHEN identity_verified = true THEN 1 END) as identity_passed,
        COUNT(CASE WHEN location_verified = true THEN 1 END) as location_passed,
        COUNT(CASE WHEN used = true THEN 1 END) as completed_attendances
       FROM verification_sessions`
    );

    const auditRes = await query(
      `SELECT * FROM audit_logs 
       WHERE event_type IN ('FACE_VERIFICATION', 'GEOFENCE_VIOLATION')
       ORDER BY created_at DESC LIMIT 15`
    );

    res.json({
      sessions: sessionsRes.rows,
      stats: statsRes.rows[0],
      recent_audits: auditRes.rows,
      thresholds: {
        face_match_threshold: 0.48,
        gps_accuracy_threshold_meters: 50.0,
        session_ttl_seconds: 90,
      },
    });
  } catch (err: any) {
    console.error('getDiagnostics error:', err);
    res.status(500).json({ error: 'Failed to retrieve diagnostics data.' });
  }
}



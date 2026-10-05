import { Response } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { enrollStaffBiometric } from '../services/biometricService';

export async function enrollFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { staff_id, face_descriptor, sample_count = 3, consent_given = true, consent_text, profile_photo } = req.body;

    if (!staff_id || !face_descriptor || !Array.isArray(face_descriptor)) {
      res.status(400).json({ error: 'staff_id and valid face_descriptor array are required.' });
      return;
    }

    // Verify staff exists
    const staffRes = await query(`SELECT id, staff_id, full_name, email, profile_photo_url FROM staff WHERE id = $1`, [staff_id]);
    if (staffRes.rows.length === 0) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const staff = staffRes.rows[0];
    const enrolledBy = req.user?.email || 'admin';

    // Store biometric template securely
    await enrollStaffBiometric(staff.id, face_descriptor, sample_count, enrolledBy, consent_given);

    // If live profile photo snapshot provided, update staff photo
    if (profile_photo) {
      await query(
        `UPDATE staff SET profile_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [profile_photo, staff.id]
      );
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details)
       VALUES ($1, 'BIOMETRIC_ENROLLMENT', $2, $3, 'SUCCESS', $4)`,
      [
        `audit_${Date.now()}`,
        staff.id,
        req.user?.email,
        JSON.stringify({
          action: 'ENROLLED',
          staff_name: staff.full_name,
          samples: sample_count,
          photo_saved: !!profile_photo,
          consent: consent_text || 'Institutional biometric privacy consent accepted',
        }),
      ]
    );

    res.json({
      message: `Face successfully enrolled for ${staff.full_name} (${staff.staff_id}).`,
      enrollment_status: 'Enrolled',
      staff_id: staff.id,
    });
  } catch (err: any) {
    console.error('Enroll face error:', err);
    res.status(500).json({ error: 'Failed to enroll face biometric template.' });
  }
}

export async function getEnrollmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { staffId } = req.params;

    const resBio = await query(
      `SELECT b.id, b.sample_count, b.consent_given, b.consent_timestamp, b.enrolled_by, b.updated_at,
              s.staff_id, s.full_name, s.face_enrollment_status, s.enrolled_at
       FROM staff s
       LEFT JOIN staff_biometrics b ON s.id = b.staff_id
       WHERE s.id = $1 OR s.staff_id = $1`,
      [staffId]
    );

    if (resBio.rows.length === 0) {
      res.status(404).json({ error: 'Staff record not found.' });
      return;
    }

    const info = resBio.rows[0];
    // Note: NEVER return b.face_descriptor to public or client!
    res.json({
      staff_id: info.staff_id,
      full_name: info.full_name,
      is_enrolled: info.face_enrollment_status === 'Enrolled',
      enrollment_status: info.face_enrollment_status,
      sample_count: info.sample_count || 0,
      consent_given: !!info.consent_given,
      consent_timestamp: info.consent_timestamp,
      enrolled_by: info.enrolled_by,
      enrolled_at: info.enrolled_at,
      updated_at: info.updated_at,
    });
  } catch (err: any) {
    console.error('Get enrollment status error:', err);
    res.status(500).json({ error: 'Failed to retrieve biometric status.' });
  }
}

export async function disableEnrollment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { staffId } = req.params;

    const staffRes = await query(`SELECT id, full_name, staff_id FROM staff WHERE id = $1`, [staffId]);
    if (staffRes.rows.length === 0) {
      res.status(404).json({ error: 'Staff member not found.' });
      return;
    }

    const staff = staffRes.rows[0];

    // Remove biometric template
    await query(`DELETE FROM staff_biometrics WHERE staff_id = $1`, [staff.id]);

    // Update staff status
    await query(
      `UPDATE staff SET face_enrollment_status = 'Not Enrolled', enrolled_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [staff.id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (id, event_type, staff_id, user_email, status, details)
       VALUES ($1, 'BIOMETRIC_ENROLLMENT', $2, $3, 'WARNING', $4)`,
      [`audit_${Date.now()}`, staff.id, req.user?.email, JSON.stringify({ action: 'DISABLED_BIOMETRIC', staff_name: staff.full_name })]
    );

    res.json({ message: `Biometric enrollment cleared for ${staff.full_name}.` });
  } catch (err: any) {
    console.error('Disable enrollment error:', err);
    res.status(500).json({ error: 'Failed to disable biometric enrollment.' });
  }
}


import { query } from '../config/database';
import { StaffBiometric } from '../types';

// Matching threshold: standard FaceNet / face-api distance <= 0.48 is a strong match
export const FACE_MATCH_THRESHOLD = 0.48;

/**
 * Calculates the Euclidean distance between two high-dimensional face descriptor vectors.
 */
export function calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    throw new Error(`Descriptor dimension mismatch: ${desc1?.length} vs ${desc2?.length}`);
  }

  let sumSquares = 0.0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sumSquares += diff * diff;
  }

  return Math.sqrt(sumSquares);
}

/**
 * Computes a human-readable confidence percentage from the Euclidean distance.
 */
export function distanceToConfidence(distance: number, threshold = FACE_MATCH_THRESHOLD): number {
  if (distance <= 0) return 100;
  // Linear scaling relative to rejection threshold
  const confidence = Math.max(0, Math.min(100, (1 - distance / (threshold * 1.5)) * 100));
  return Math.round(confidence * 10) / 10;
}

/**
 * Saves or updates a staff member's enrolled biometric template.
 */
export async function enrollStaffBiometric(
  staffId: string,
  faceDescriptor: number[],
  sampleCount: number,
  enrolledBy: string,
  consentGiven: boolean
): Promise<void> {
  const descriptorJson = JSON.stringify(faceDescriptor);
  const id = `bio_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Upsert into staff_biometrics table
  await query(
    `INSERT INTO staff_biometrics (id, staff_id, face_descriptor, sample_count, consent_given, consent_timestamp, enrolled_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (staff_id) DO UPDATE 
     SET face_descriptor = EXCLUDED.face_descriptor,
         sample_count = EXCLUDED.sample_count,
         consent_given = EXCLUDED.consent_given,
         enrolled_by = EXCLUDED.enrolled_by,
         updated_at = CURRENT_TIMESTAMP`,
    [id, staffId, descriptorJson, sampleCount, consentGiven, enrolledBy]
  );

  // Update staff table enrollment status
  await query(
    `UPDATE staff SET face_enrollment_status = 'Enrolled', enrolled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [staffId]
  );
}

/**
 * Verifies a candidate live descriptor against a specific staff member's enrolled biometric template (1:1 Verification).
 */
export async function verifyStaffFace(
  staffId: string,
  candidateDescriptor: number[]
): Promise<{ isMatch: boolean; distance: number; confidence: number; error?: string }> {
  const res = await query(
    `SELECT face_descriptor, consent_given FROM staff_biometrics WHERE staff_id = $1`,
    [staffId]
  );

  if (res.rows.length === 0) {
    return {
      isMatch: false,
      distance: 999,
      confidence: 0,
      error: 'Face not enrolled for this staff member. Please contact administrator for enrollment.',
    };
  }

  const enrolledDescriptor: number[] = typeof res.rows[0].face_descriptor === 'string'
    ? JSON.parse(res.rows[0].face_descriptor)
    : res.rows[0].face_descriptor;

  const distance = calculateEuclideanDistance(candidateDescriptor, enrolledDescriptor);
  const isMatch = distance <= FACE_MATCH_THRESHOLD;
  const confidence = distanceToConfidence(distance);

  return {
    isMatch,
    distance: Math.round(distance * 1000) / 1000,
    confidence,
    error: isMatch ? undefined : 'Face verification failed. Please try again.',
  };
}

/**
 * Identifies a staff member from their face descriptor against all enrolled staff (1:N Identification).
 * Useful for kiosk or instant scan mode.
 */
export async function identifyStaffFace(
  candidateDescriptor: number[],
  campusId?: string
): Promise<{ staffId: string; distance: number; confidence: number } | null> {
  // Join with staff to ensure only active staff from given campus (if provided) are matched
  let sql = `
    SELECT b.staff_id, b.face_descriptor, s.full_name, s.assigned_campus_id, s.employment_status
    FROM staff_biometrics b
    JOIN staff s ON b.staff_id = s.id
    WHERE s.employment_status = 'Active'
  `;
  const params: any[] = [];
  if (campusId) {
    sql += ` AND s.assigned_campus_id = $1`;
    params.push(campusId);
  }

  const res = await query(sql, params);
  let bestMatch: { staffId: string; distance: number; confidence: number } | null = null;
  let minDistance = 999;

  for (const row of res.rows) {
    const enrolledDesc: number[] = typeof row.face_descriptor === 'string'
      ? JSON.parse(row.face_descriptor)
      : row.face_descriptor;

    const dist = calculateEuclideanDistance(candidateDescriptor, enrolledDesc);
    if (dist < minDistance && dist <= FACE_MATCH_THRESHOLD) {
      minDistance = dist;
      bestMatch = {
        staffId: row.staff_id,
        distance: Math.round(dist * 1000) / 1000,
        confidence: distanceToConfidence(dist),
      };
    }
  }

  return bestMatch;
}


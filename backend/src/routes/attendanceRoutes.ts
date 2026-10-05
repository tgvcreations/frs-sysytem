import { Router } from 'express';
import {
  verifyAndMarkAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  manualAttendanceCorrection,
  startVerificationSession,
  verifyLiveness,
  verifyIdentity,
  verifyLocation,
  finalizeAttendance,
  getDiagnostics,
} from '../controllers/attendanceController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Multi-Step FRS Liveness & Attendance Verification Session Endpoints
router.post('/verification/start', startVerificationSession);
router.post('/verification/liveness', verifyLiveness);
router.post('/verification/identity', verifyIdentity);
router.post('/verification/location', verifyLocation);
router.post('/verification/finalize', finalizeAttendance);
router.get('/verification/diagnostics', requireRole(['super_admin', 'admin', 'principal']), getDiagnostics);

// Legacy Single-Step Endpoint (backwards compatibility)
router.post('/verify', verifyAndMarkAttendance);

// Attendance Management & History
router.get('/today', requireRole(['super_admin', 'admin', 'principal', 'attendance_manager']), getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.post('/manual-correction/:id', requireRole(['super_admin', 'admin', 'attendance_manager']), manualAttendanceCorrection);

export default router;


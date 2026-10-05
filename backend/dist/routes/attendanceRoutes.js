"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = require("../controllers/attendanceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Multi-Step FRS Liveness & Attendance Verification Session Endpoints
router.post('/verification/start', attendanceController_1.startVerificationSession);
router.post('/verification/liveness', attendanceController_1.verifyLiveness);
router.post('/verification/identity', attendanceController_1.verifyIdentity);
router.post('/verification/location', attendanceController_1.verifyLocation);
router.post('/verification/finalize', attendanceController_1.finalizeAttendance);
router.get('/verification/diagnostics', (0, authMiddleware_1.requireRole)(['super_admin', 'admin', 'principal']), attendanceController_1.getDiagnostics);
// Legacy Single-Step Endpoint (backwards compatibility)
router.post('/verify', attendanceController_1.verifyAndMarkAttendance);
// Attendance Management & History
router.get('/today', (0, authMiddleware_1.requireRole)(['super_admin', 'admin', 'principal', 'attendance_manager']), attendanceController_1.getTodayAttendance);
router.get('/history', attendanceController_1.getAttendanceHistory);
router.post('/manual-correction/:id', (0, authMiddleware_1.requireRole)(['super_admin', 'admin', 'attendance_manager']), attendanceController_1.manualAttendanceCorrection);
exports.default = router;

import { Router } from 'express';
import {
  getDashboardStats,
  getDashboardCharts,
  getRecentAttendanceFeed,
} from '../controllers/dashboardController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', requireRole(['admin', 'principal', 'attendance_manager']), getDashboardStats);
router.get('/charts', requireRole(['admin', 'principal', 'attendance_manager']), getDashboardCharts);
router.get('/recent-feed', requireRole(['admin', 'principal', 'attendance_manager']), getRecentAttendanceFeed);

export default router;


import { Router } from 'express';
import { getMusterRoll, exportCsv, getAuditLogs } from '../controllers/reportController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/muster-roll', requireRole(['admin', 'principal', 'attendance_manager']), getMusterRoll);
router.get('/export-csv', requireRole(['admin', 'principal', 'attendance_manager']), exportCsv);
router.get('/audit-logs', requireRole(['admin']), getAuditLogs);

export default router;


import { Router } from 'express';
import { getLeaves, applyLeave, updateLeaveStatus } from '../controllers/leaveController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getLeaves);
router.post('/', applyLeave);
router.patch('/:id/status', requireRole(['admin', 'principal']), updateLeaveStatus);

export default router;


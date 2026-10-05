import { Router } from 'express';
import { getShifts, createShift, updateShift, deleteShift } from '../controllers/shiftController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getShifts);
router.post('/', requireRole(['admin']), createShift);
router.put('/:id', requireRole(['admin']), updateShift);
router.delete('/:id', requireRole(['admin']), deleteShift);

export default router;


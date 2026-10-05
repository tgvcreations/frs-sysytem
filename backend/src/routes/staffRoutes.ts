import { Router } from 'express';
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from '../controllers/staffController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['super_admin', 'admin', 'principal', 'attendance_manager']), getAllStaff);
router.get('/:id', getStaffById);
router.post('/', requireRole(['super_admin', 'admin']), createStaff);
router.put('/:id', requireRole(['super_admin', 'admin']), updateStaff);
router.patch('/:id/status', requireRole(['super_admin', 'admin']), toggleStaffStatus);
router.delete('/:id', requireRole(['super_admin', 'admin']), deleteStaff);

export default router;


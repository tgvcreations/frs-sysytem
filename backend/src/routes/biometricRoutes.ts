import { Router } from 'express';
import { enrollFace, getEnrollmentStatus, disableEnrollment } from '../controllers/biometricController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/enroll', requireRole(['admin']), enrollFace);
router.get('/status/:staffId', getEnrollmentStatus);
router.delete('/:staffId', requireRole(['admin']), disableEnrollment);

export default router;


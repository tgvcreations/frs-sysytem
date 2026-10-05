import { Router } from 'express';
import {
  getAllCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus,
  testCoordinate,
} from '../controllers/geofenceController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllCampuses);
router.get('/:id', getCampusById);
router.post('/test-coordinate', testCoordinate);
router.post('/', requireRole(['admin']), createCampus);
router.put('/:id', requireRole(['admin']), updateCampus);
router.delete('/:id', requireRole(['admin']), deleteCampus);

export default router;


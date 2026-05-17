import { Router } from 'express';
import { exportProject } from '../controllers/exportController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/:projectId', protect, exportProject);

export default router;

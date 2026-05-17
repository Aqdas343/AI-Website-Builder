import { Router } from 'express';
import {
  getAll,
  getOne,
  create,
  update,
  deleteProject,
  duplicate,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, deleteProject);
router.post('/:id/duplicate', protect, duplicate);

export default router;

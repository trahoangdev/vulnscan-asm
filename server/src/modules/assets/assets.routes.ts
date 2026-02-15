import { Router } from 'express';
import { assetsController } from './assets.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', assetsController.list);
router.get('/stats', assetsController.getStats);
router.get('/:id', assetsController.getById);

export default router;

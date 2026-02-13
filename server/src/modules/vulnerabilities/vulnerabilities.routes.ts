import { Router } from 'express';
import { vulnerabilitiesController } from './vulnerabilities.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', vulnerabilitiesController.list);
router.get('/stats', vulnerabilitiesController.getStats);
router.get('/:id', vulnerabilitiesController.getById);
router.put('/:id/status', vulnerabilitiesController.updateStatus);

export default router;

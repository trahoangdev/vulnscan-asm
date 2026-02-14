import { Router } from 'express';
import { vulnerabilitiesController } from './vulnerabilities.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { updateVulnStatusSchema } from './vulnerabilities.schema';

const router = Router();

router.use(authenticate);

router.get('/', vulnerabilitiesController.list);
router.get('/stats', vulnerabilitiesController.getStats);
router.get('/export', vulnerabilitiesController.exportFindings);
router.get('/:id', vulnerabilitiesController.getById);
router.put('/:id/status', validateBody(updateVulnStatusSchema), vulnerabilitiesController.updateStatus);

export default router;

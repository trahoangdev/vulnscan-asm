import { Router } from 'express';
import { scansController } from './scans.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { scanRateLimiter } from '../../middleware/rateLimiter';
import { createScanSchema } from './scans.schema';

const router = Router();

router.use(authenticate);

router.get('/', scansController.list);
router.post('/', scanRateLimiter, validateBody(createScanSchema), scansController.create);
router.get('/:id', scansController.getById);
router.post('/:id/cancel', scansController.cancel);
router.get('/:id/findings', scansController.getFindings);
router.get('/:id/results', scansController.getResults);
router.get('/:id/diff', scansController.diff);

export default router;

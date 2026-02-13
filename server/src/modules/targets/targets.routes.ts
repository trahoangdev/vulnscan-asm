import { Router } from 'express';
import { targetsController } from './targets.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createTargetSchema, updateTargetSchema, verifyTargetSchema } from './targets.schema';

const router = Router();

router.use(authenticate);

router.get('/', targetsController.list);
router.post('/', validateBody(createTargetSchema), targetsController.create);
router.get('/:id', targetsController.getById);
router.put('/:id', validateBody(updateTargetSchema), targetsController.update);
router.delete('/:id', targetsController.delete);
router.post('/:id/verify', validateBody(verifyTargetSchema), targetsController.verify);
router.post('/:id/verify/skip', targetsController.skipVerify);
router.get('/:id/verify/status', targetsController.getVerifyStatus);
router.get('/:id/assets', targetsController.getAssets);

export default router;

import { Router } from 'express';
import { apiKeysController } from './apikeys.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createApiKeySchema } from './apikeys.schema';

const router = Router();

router.use(authenticate);

router.get('/', apiKeysController.list);
router.post('/', validateBody(createApiKeySchema), apiKeysController.create);
router.delete('/:id', apiKeysController.revoke);

export default router;

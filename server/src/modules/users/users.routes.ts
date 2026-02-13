import { Router } from 'express';
import { usersController } from './users.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { updateProfileSchema, changePasswordSchema } from './users.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/me', usersController.getMe);
router.put('/me', validateBody(updateProfileSchema), usersController.updateMe);
router.put('/me/password', validateBody(changePasswordSchema), usersController.changePassword);

export default router;

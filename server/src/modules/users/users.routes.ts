import { Router } from 'express';
import multer from 'multer';
import { usersController } from './users.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { updateProfileSchema, changePasswordSchema, notificationPrefsSchema } from './users.schema';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

router.get('/me', usersController.getMe);
router.put('/me', validateBody(updateProfileSchema), usersController.updateMe);
router.put('/me/password', validateBody(changePasswordSchema), usersController.changePassword);
router.post('/me/avatar', upload.single('avatar'), usersController.uploadAvatar);
router.get('/me/notification-preferences', usersController.getNotificationPrefs);
router.put('/me/notification-preferences', validateBody(notificationPrefsSchema), usersController.updateNotificationPrefs);
router.get('/me/activity', usersController.getActivityLog);

export default router;

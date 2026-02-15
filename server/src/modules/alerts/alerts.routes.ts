import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { alertsController } from './alerts.controller';

const router = Router();

router.use(authenticate);

router.get('/', alertsController.list);
router.get('/:id', alertsController.getById);
router.post('/', alertsController.create);
router.put('/:id', alertsController.update);
router.delete('/:id', alertsController.remove);

export default router;

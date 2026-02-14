import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { generateReportSchema } from './reports.schema';

const router = Router();

router.use(authenticate);

router.get('/', reportsController.list);
router.post('/', validateBody(generateReportSchema), reportsController.generate);
router.get('/:id', reportsController.getById);
router.get('/:id/download', reportsController.download);
router.delete('/:id', reportsController.delete);

export default router;

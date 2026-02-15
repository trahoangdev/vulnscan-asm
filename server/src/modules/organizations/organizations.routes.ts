import { Router } from 'express';
import { organizationsController } from './organizations.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import {
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './organizations.schema';

const router = Router();

router.use(authenticate);

// Organization settings
router.get('/', organizationsController.getOrg);
router.put('/', authorize('OWNER', 'ADMIN'), validateBody(updateOrgSchema), organizationsController.updateOrg);
router.get('/usage', organizationsController.getUsage);

// Team / Member management
router.get('/members', organizationsController.listMembers);
router.post('/members', authorize('OWNER', 'ADMIN'), validateBody(inviteMemberSchema), organizationsController.inviteMember);
router.put('/members/:memberId', authorize('OWNER', 'ADMIN'), validateBody(updateMemberRoleSchema), organizationsController.updateMemberRole);
router.delete('/members/:memberId', authorize('OWNER', 'ADMIN'), organizationsController.removeMember);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { integrationsController } from './integrations.controller';

const router = Router();

router.use(authenticate);

// Jira integration
router.post('/jira/test', integrationsController.jiraTestConnection);
router.post('/jira/projects', integrationsController.jiraGetProjects);
router.post('/jira/issue-types', integrationsController.jiraGetIssueTypes);
router.post('/jira/issues', integrationsController.jiraCreateIssue);

export default router;

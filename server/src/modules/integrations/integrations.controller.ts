import { Request, Response, NextFunction } from 'express';
import { jiraService } from './jira.service';
import { slackService } from './slack.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class IntegrationsController {
  async jiraTestConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const { baseUrl, email, apiToken } = req.body;
      const result = await jiraService.testConnection({ baseUrl, email, apiToken });
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async jiraGetProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { baseUrl, email, apiToken } = req.body;
      const projects = await jiraService.getProjects({ baseUrl, email, apiToken });
      return ApiResponse.success(res, projects);
    } catch (error) { next(error); }
  }

  async jiraGetIssueTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const { baseUrl, email, apiToken, projectKey } = req.body;
      const types = await jiraService.getIssueTypes({ baseUrl, email, apiToken }, projectKey);
      return ApiResponse.success(res, types);
    } catch (error) { next(error); }
  }

  async jiraCreateIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const { baseUrl, email, apiToken, projectKey, findingId } = req.body;
      const result = await jiraService.createIssueFromFinding(
        { baseUrl, email, apiToken },
        projectKey,
        findingId,
      );
      return ApiResponse.success(res, result, 201);
    } catch (error) { next(error); }
  }

  // ── Slack integration ───────────────────────────────────────────────────

  async slackTestConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        return ApiResponse.error(res, 400, 'INVALID_WEBHOOK', 'Invalid Slack webhook URL');
      }
      const result = await slackService.testConnection(webhookUrl);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async slackSendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookUrl, eventType, data } = req.body;
      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        return ApiResponse.error(res, 400, 'INVALID_WEBHOOK', 'Invalid Slack webhook URL');
      }
      await slackService.notifyOrg((req as any).user.orgId, eventType, data);
      return ApiResponse.success(res, { sent: true });
    } catch (error) { next(error); }
  }
}

export const integrationsController = new IntegrationsController();

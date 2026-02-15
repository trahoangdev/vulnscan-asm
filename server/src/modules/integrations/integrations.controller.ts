import { Request, Response, NextFunction } from 'express';
import { jiraService } from './jira.service';
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
}

export const integrationsController = new IntegrationsController();

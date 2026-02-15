import { Request, Response, NextFunction } from 'express';
import { alertRulesService } from './alerts.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class AlertsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await alertRulesService.list(orgId, req.query);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const rule = await alertRulesService.getById(orgId, req.params.id);
      return ApiResponse.success(res, rule);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.userId;
      const rule = await alertRulesService.create(orgId, userId, req.body);
      return ApiResponse.success(res, rule, 201);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const rule = await alertRulesService.update(orgId, req.params.id, req.body);
      return ApiResponse.success(res, rule);
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await alertRulesService.delete(orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }
}

export const alertsController = new AlertsController();

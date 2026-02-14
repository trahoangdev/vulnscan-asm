import { Request, Response, NextFunction } from 'express';
import { scansService } from './scans.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class ScansController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { scans, total, page, limit } = await scansService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, scans, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scansService.create(req.user!.orgId, req.user!.userId, req.body);
      return ApiResponse.accepted(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scansService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scansService.cancel(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getFindings(req: Request, res: Response, next: NextFunction) {
    try {
      const { findings, total, page, limit } = await scansService.getFindings(
        req.user!.orgId,
        req.params.id,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, findings, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await scansService.getResults(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, results);
    } catch (error) {
      next(error);
    }
  }
}

export const scansController = new ScansController();

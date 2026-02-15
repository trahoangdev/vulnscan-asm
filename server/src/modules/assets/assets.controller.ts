import { Request, Response, NextFunction } from 'express';
import { assetsService } from './assets.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class AssetsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { assets, total, page, limit } = await assetsService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, assets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assetsService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async listByTarget(req: Request, res: Response, next: NextFunction) {
    try {
      const { assets, total, page, limit } = await assetsService.listByTarget(
        req.user!.orgId,
        req.params.targetId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, assets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assetsService.getStats(req.user!.orgId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const assetsController = new AssetsController();

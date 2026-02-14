import { Request, Response, NextFunction } from 'express';
import { targetsService } from './targets.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class TargetsController {
  /**
   * GET /targets
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { targets, total, page, limit } = await targetsService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, targets, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /targets
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.create(req.user!.orgId, req.body);
      return ApiResponse.created(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /targets/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /targets/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.update(req.user!.orgId, req.params.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /targets/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.delete(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /targets/:id/verify/skip (dev only)
   */
  async skipVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.skipVerification(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /targets/:id/verify
   */
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.verify(
        req.user!.orgId,
        req.params.id,
        req.body.method,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /targets/:id/verify/status
   */
  async getVerifyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.getVerifyStatus(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /targets/:id/assets
   */
  async getAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.getAssets(
        req.user!.orgId,
        req.params.id,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, result.assets, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /targets/:id/schedule — Set scan schedule
   */
  async setSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await targetsService.setSchedule(
        req.user!.orgId,
        req.params.id,
        req.body,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /targets/import — Bulk import targets from CSV
   */
  async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const csvData = req.body.csv || req.body.data;
      if (!csvData || typeof csvData !== 'string') {
        return ApiResponse.error(res, 'CSV data is required in the "csv" field', 400);
      }
      const result = await targetsService.bulkImport(req.user!.orgId, csvData);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const targetsController = new TargetsController();

import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { ApiResponse } from '@utils/ApiResponse';

export const dashboardController = {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats(req.user!.orgId);
      ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  },
};

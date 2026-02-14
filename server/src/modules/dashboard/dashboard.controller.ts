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

  async getRiskTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trend = await dashboardService.getRiskTrend(req.user!.orgId, days);
      ApiResponse.success(res, trend);
    } catch (error) {
      next(error);
    }
  },
};

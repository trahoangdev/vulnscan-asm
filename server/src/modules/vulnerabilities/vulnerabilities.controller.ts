import { Request, Response, NextFunction } from 'express';
import { vulnerabilitiesService } from './vulnerabilities.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class VulnerabilitiesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { findings, total, page, limit } = await vulnerabilitiesService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, findings, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vulnerabilitiesService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vulnerabilitiesService.updateStatus(
        req.user!.orgId,
        req.params.id,
        req.body.status,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vulnerabilitiesService.getStats(req.user!.orgId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async exportFindings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vulnerabilitiesService.exportFindings(
        req.user!.orgId,
        req.query as Record<string, any>,
      );

      if (result.format === 'CSV') {
        res.setHeader('Content-Disposition', 'attachment; filename="vulnerabilities.csv"');
        res.setHeader('Content-Type', 'text/csv');
        return res.send(result.data);
      }

      return ApiResponse.success(res, { findings: result.data, count: result.count });
    } catch (error) {
      next(error);
    }
  }
}

export const vulnerabilitiesController = new VulnerabilitiesController();

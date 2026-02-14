import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class ReportsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { reports, total, page, limit } = await reportsService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, reports, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.generate(req.user!.orgId, req.body);
      return ApiResponse.accepted(res, result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await reportsService.delete(req.user!.orgId, req.params.id);
      return ApiResponse.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.download(req.user!.orgId, req.params.id);
      if (result.data) {
        const filename = `${result.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(result.data);
      }
      // Future: redirect to S3 URL
      return ApiResponse.success(res, { url: result.url });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();

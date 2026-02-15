import { Request, Response, NextFunction } from 'express';
import { webhooksService } from './webhooks.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class WebhooksController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhooks, total, page, limit } = await webhooksService.list(
        req.user!.orgId, req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, webhooks, total, page, limit);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await webhooksService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await webhooksService.create(req.user!.orgId, req.body);
      return ApiResponse.created(res, result);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await webhooksService.update(req.user!.orgId, req.params.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await webhooksService.delete(req.user!.orgId, req.params.id);
      return ApiResponse.noContent(res);
    } catch (error) { next(error); }
  }

  async test(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await webhooksService.test(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }
}

export const webhooksController = new WebhooksController();

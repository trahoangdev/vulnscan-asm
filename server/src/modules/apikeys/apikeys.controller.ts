import { Request, Response, NextFunction } from 'express';
import { apiKeysService } from './apikeys.service';

class ApiKeysController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await apiKeysService.list(req.user!.orgId, req.user!.userId);
      res.json({ data: keys });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await apiKeysService.create(
        req.user!.orgId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await apiKeysService.revoke(
        req.user!.orgId,
        req.user!.userId,
        req.params.id,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const apiKeysController = new ApiKeysController();

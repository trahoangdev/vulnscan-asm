import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { notifications, total, page, limit } = await notificationsService.list(
        req.user!.userId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, notifications, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.markAsRead(
        req.user!.userId,
        req.params.id,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.markAllAsRead(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.getUnreadCount(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();

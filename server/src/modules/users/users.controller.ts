import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class UsersController {
  /**
   * GET /users/me
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getProfile(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /users/me
   */
  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.updateProfile(req.user!.userId, req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /users/me/password
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.changePassword(req.user!.userId, req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/notification-preferences
   */
  async getNotificationPrefs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getNotificationPrefs(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /users/me/notification-preferences
   */
  async updateNotificationPrefs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.updateNotificationPrefs(req.user!.userId, req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();

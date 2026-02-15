import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { uploadAvatar } from '../../utils/storage';

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

  /**
   * POST /users/me/avatar — Upload avatar
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return ApiResponse.error(res, 400, 'VALIDATION_ERROR', 'No file uploaded');
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return ApiResponse.error(res, 400, 'VALIDATION_ERROR', 'Only JPEG, PNG, GIF, and WebP images are allowed');
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return ApiResponse.error(res, 400, 'VALIDATION_ERROR', 'File size must be less than 5MB');
      }
      const uploaded = await uploadAvatar(req.user!.userId, file.buffer, file.mimetype);
      // Update user profile with avatar URL
      const result = await usersService.updateProfile(req.user!.userId, { avatar: uploaded.url });
      return ApiResponse.success(res, { avatarUrl: uploaded.url, user: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/activity
   */
  async getActivityLog(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getActivityLog(req.user!.userId, req.query as Record<string, any>);
      return ApiResponse.success(res, result.data, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();

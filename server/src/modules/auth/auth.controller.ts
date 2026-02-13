import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { getClientIp } from '../../utils/helpers';

export class AuthController {
  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body, getClientIp(req));
      return ApiResponse.created(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, getClientIp(req));
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const result = await authService.verifyEmail(token);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      // In a stateless JWT setup, logout is handled client-side
      // If using Redis blacklist, the token would be added here
      return ApiResponse.success(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me — Get current user profile
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getProfile(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

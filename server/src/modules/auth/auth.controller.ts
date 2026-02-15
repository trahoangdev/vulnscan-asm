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

  /**
   * POST /auth/google — Google OAuth login
   */
  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.googleLogin(req.body.idToken, getClientIp(req));
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/github — GitHub OAuth login
   */
  async githubLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.githubLogin(req.body.code, getClientIp(req));
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/2fa/setup — Generate 2FA secret + QR code
   */
  async setup2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.setup2fa(req.user!.userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/2fa/enable — Verify TOTP and enable 2FA
   */
  async enable2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.enable2fa(req.user!.userId, req.body.token);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/2fa/disable — Disable 2FA
   */
  async disable2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.disable2fa(req.user!.userId, req.body.token, req.body.password);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/2fa/verify — Verify 2FA token during login
   */
  async verify2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verify2faLogin(
        req.body.email,
        req.body.password,
        req.body.token,
        getClientIp(req),
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  googleLoginSchema,
  githubLoginSchema,
  enable2faSchema,
  verify2faSchema,
  disable2faSchema,
} from './auth.schema';

const router = Router();

// Public routes (with auth rate limiting)
router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword);

// OAuth routes
router.post('/google', authRateLimiter, validateBody(googleLoginSchema), authController.googleLogin);
router.post('/github', authRateLimiter, validateBody(githubLoginSchema), authController.githubLogin);

// 2FA routes
router.post('/2fa/setup', authenticate, authController.setup2fa);
router.post('/2fa/enable', authenticate, validateBody(enable2faSchema), authController.enable2fa);
router.post('/2fa/disable', authenticate, validateBody(disable2faSchema), authController.disable2fa);
router.post('/2fa/verify', authRateLimiter, validateBody(verify2faSchema), authController.verify2fa);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;

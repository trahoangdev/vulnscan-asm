import { Request, Response, NextFunction } from 'express';
import { apiKeysService } from '../modules/apikeys/apikeys.service';
import { ApiError } from '../utils/ApiError';

/**
 * API Key authentication middleware.
 * Looks for X-API-Key header and validates the key.
 * Falls through to next middleware if no key present (allows JWT auth to handle it).
 */
export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return next(); // No API key — let JWT auth handle it
    }

    const context = await apiKeysService.validateKey(apiKey);
    if (!context) {
      throw ApiError.unauthorized('Invalid or expired API key');
    }

    // Set user context same as JWT auth
    req.user = {
      userId: context.userId,
      email: context.email,
      orgId: context.orgId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

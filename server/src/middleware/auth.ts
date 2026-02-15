import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/crypto';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/database';

// Extend Express Request to include user context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload & { orgId: string };
    }
  }
}

/**
 * Authentication middleware — verifies JWT token
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    req.user = payload as TokenPayload & { orgId: string };
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    return next(ApiError.unauthorized());
  }
}

/**
 * Optional auth — attaches user if token exists, continues otherwise
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      req.user = payload as TokenPayload & { orgId: string };
    }
  } catch {
    // Token invalid — continue without auth
  }
  next();
}

/**
 * Role-based authorization middleware
 */
export function authorize(...roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const membership = await prisma.orgMember.findFirst({
        where: {
          userId: req.user.userId,
          orgId: req.user.orgId,
        },
      });

      if (!membership) {
        throw ApiError.forbidden('Not a member of this organization');
      }

      if (roles.length > 0 && !roles.includes(membership.role)) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Admin-only middleware — requires ADMIN or SUPER_ADMIN system role
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const role = req.user.systemRole;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw ApiError.forbidden('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Super-admin only middleware
 */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (req.user.systemRole !== 'SUPER_ADMIN') {
      throw ApiError.forbidden('Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}

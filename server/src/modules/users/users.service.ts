import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, comparePassword } from '../../utils/crypto';
import type { UpdateProfileInput, ChangePasswordInput } from './users.schema';

export class UsersService {
  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        emailVerified: true,
        timezone: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        orgMemberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                maxTargets: true,
                maxScansPerMonth: true,
                scansUsed: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      ...user,
      organizations: user.orgMemberships.map((m: any) => ({
        ...m.organization,
        role: m.role,
      })),
      orgMemberships: undefined,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        timezone: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw ApiError.notFound('User not found');
    }

    const isValid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const newHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get notification preferences
   */
  async getNotificationPrefs(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyPrefs: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    // Return defaults merged with saved prefs
    const defaults = {
      emailCritical: true,
      emailHigh: true,
      emailWeeklyDigest: true,
      inAppEnabled: true,
      scanCompleted: true,
      scanFailed: true,
      newVulnerability: true,
      certExpiring: true,
    };
    return { ...defaults, ...(user.notifyPrefs as Record<string, any> || {}) };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPrefs(userId: string, prefs: Record<string, any>) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyPrefs: true },
    });
    if (!user) throw ApiError.notFound('User not found');

    const merged = { ...(user.notifyPrefs as Record<string, any> || {}), ...prefs };
    await prisma.user.update({
      where: { id: userId },
      data: { notifyPrefs: merged },
    });
    return merged;
  }

  /**
   * Get user activity log (audit log + login history)
   */
  async getActivityLog(userId: string, query: Record<string, any>) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where: { userId } }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const usersService = new UsersService();

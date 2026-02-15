import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { hashPassword } from '../../utils/crypto';
import type {
  ListUsersInput,
  ListOrgsInput,
  ListAuditLogsInput,
} from './admin.schema';

export class AdminService {
  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalOrgs,
      totalTargets,
      totalScans,
      totalVulns,
      recentScans,
      userGrowth,
      scansByStatus,
      vulnsBySeverity,
      topOrgs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.organization.count(),
      prisma.target.count(),
      prisma.scan.count(),
      prisma.vulnFinding.count(),
      prisma.scan.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          target: { select: { value: true } },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      // User signups last 30 days — group by day
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*)::bigint as count
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `,
      prisma.scan.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.vulnFinding.groupBy({
        by: ['severity'],
        _count: true,
      }),
      // Top 5 organizations by scan count
      prisma.organization.findMany({
        take: 5,
        include: {
          _count: { select: { targets: true, members: true } },
        },
        orderBy: { scansUsed: 'desc' },
      }),
    ]);

    return {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalOrgs,
        totalTargets,
        totalScans,
        totalVulns,
      },
      userGrowth: userGrowth.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      scansByStatus: scansByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      vulnsBySeverity: vulnsBySeverity.map((v) => ({
        severity: v.severity,
        count: v._count,
      })),
      recentScans: recentScans.map((s) => ({
        id: s.id,
        target: s.target.value,
        createdBy: s.createdBy.name,
        status: s.status,
        profile: s.profile,
        createdAt: s.createdAt,
      })),
      topOrgs: topOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        plan: o.plan,
        scansUsed: o.scansUsed,
        targetCount: o._count.targets,
        memberCount: o._count.members,
      })),
    };
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async listUsers(input: ListUsersInput) {
    const { page, limit, search, role, isActive, sortBy, sortOrder } = input;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.systemRole = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          systemRole: true,
          emailVerified: true,
          isActive: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orgMemberships: true, scansCreated: true },
          },
          orgMemberships: {
            include: { organization: { select: { id: true, name: true, plan: true } } },
            take: 3,
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        systemRole: true,
        emailVerified: true,
        isActive: true,
        timezone: true,
        lastLoginAt: true,
        lastLoginIp: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        orgMemberships: {
          include: {
            organization: { select: { id: true, name: true, slug: true, plan: true } },
          },
        },
        _count: {
          select: { scansCreated: true, apiKeys: true, notifications: true },
        },
      },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async updateUser(id: string, data: Record<string, any>, adminId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.systemRole !== undefined && { systemRole: data.systemRole }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        isActive: true,
        emailVerified: true,
      },
    });

    // Audit log
    await this.createAuditLog({
      userId: adminId,
      action: 'user.update',
      entity: 'user',
      entityId: id,
      details: { changes: data, previousRole: user.systemRole, previousActive: user.isActive },
      ipAddress: ip,
    });

    return updated;
  }

  async deleteUser(id: string, adminId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('User not found');

    if (user.systemRole === 'SUPER_ADMIN') {
      throw ApiError.forbidden('Cannot delete a super admin');
    }

    await prisma.user.delete({ where: { id } });

    await this.createAuditLog({
      userId: adminId,
      action: 'user.delete',
      entity: 'user',
      entityId: id,
      details: { email: user.email, name: user.name },
      ipAddress: ip,
    });

    return { message: 'User deleted' };
  }

  async resetUserPassword(id: string, newPassword: string, adminId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('User not found');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'user.reset_password',
      entity: 'user',
      entityId: id,
      details: { email: user.email },
      ipAddress: ip,
    });

    return { message: 'Password reset successfully' };
  }

  // ============================================
  // ORGANIZATION MANAGEMENT
  // ============================================

  async listOrgs(input: ListOrgsInput) {
    const { page, limit, search, plan, isActive } = input;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (plan) where.plan = plan;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, targets: true, reports: true, webhooks: true },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      data: orgs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrgById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, systemRole: true, isActive: true } },
          },
        },
        _count: {
          select: { targets: true, reports: true, webhooks: true, apiKeys: true },
        },
      },
    });

    if (!org) throw ApiError.notFound('Organization not found');
    return org;
  }

  async updateOrg(id: string, data: Record<string, any>, adminId: string, ip?: string) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw ApiError.notFound('Organization not found');

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.plan !== undefined && { plan: data.plan }),
        ...(data.maxTargets !== undefined && { maxTargets: data.maxTargets }),
        ...(data.maxScansPerMonth !== undefined && { maxScansPerMonth: data.maxScansPerMonth }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'org.update',
      entity: 'organization',
      entityId: id,
      details: { changes: data, previousPlan: org.plan },
      ipAddress: ip,
    });

    return updated;
  }

  async deleteOrg(id: string, adminId: string, ip?: string) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw ApiError.notFound('Organization not found');

    await prisma.organization.delete({ where: { id } });

    await this.createAuditLog({
      userId: adminId,
      action: 'org.delete',
      entity: 'organization',
      entityId: id,
      details: { name: org.name, slug: org.slug },
      ipAddress: ip,
    });

    return { message: 'Organization deleted' };
  }

  // ============================================
  // SYSTEM SETTINGS
  // ============================================

  async getSettings(category?: string) {
    const where: any = {};
    if (category) where.category = category;

    return prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async getSetting(key: string) {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw ApiError.notFound('Setting not found');
    return setting;
  }

  async upsertSetting(key: string, value: any, adminId: string, label?: string, category?: string, ip?: string) {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...(label && { label }) },
      create: { key, value, category: category || 'general', label },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'settings.update',
      entity: 'setting',
      entityId: key,
      details: { key, value },
      ipAddress: ip,
    });

    return setting;
  }

  async batchUpdateSettings(settings: Array<{ key: string; value?: any; category?: string; label?: string }>, adminId: string, ip?: string) {
    const results = await prisma.$transaction(
      settings.map((s) =>
        prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, ...(s.label && { label: s.label }) },
          create: { key: s.key, value: s.value, category: s.category || 'general', label: s.label },
        }),
      ),
    );

    await this.createAuditLog({
      userId: adminId,
      action: 'settings.batch_update',
      entity: 'setting',
      entityId: null,
      details: { keys: settings.map((s) => s.key) },
      ipAddress: ip,
    });

    return results;
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  async listAuditLogs(input: ListAuditLogsInput) {
    const { page, limit, userId, action, entity, from, to } = input;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // SCAN MANAGEMENT (cross-org)
  // ============================================

  async listAllScans(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          target: { select: { value: true, type: true } },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    return {
      data: scans,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelScan(id: string, adminId: string, ip?: string) {
    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan) throw ApiError.notFound('Scan not found');

    if (!['QUEUED', 'RUNNING'].includes(scan.status)) {
      throw ApiError.badRequest('Scan is not in a cancellable state');
    }

    const updated = await prisma.scan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.createAuditLog({
      userId: adminId,
      action: 'scan.cancel',
      entity: 'scan',
      entityId: id,
      details: { previousStatus: scan.status },
      ipAddress: ip,
    });

    return updated;
  }

  // ============================================
  // HELPERS
  // ============================================

  private async createAuditLog(data: {
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({ data });
  }
}

export const adminService = new AdminService();

import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { generateVerificationToken } from '../../utils/crypto';
import { isValidDomain, isValidIp, parsePagination, parseSort } from '../../utils/helpers';
import { PLAN_LIMITS } from '../../../../shared/constants/index';
import type { CreateTargetInput, UpdateTargetInput } from './targets.schema';

export class TargetsService {
  /**
   * List all targets for an organization
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort as string);

    const where: any = { orgId, isActive: true };

    if (query.status) {
      where.verificationStatus = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.tags) {
      where.tags = { hasSome: (query.tags as string).split(',') };
    }

    const [targets, total] = await Promise.all([
      prisma.target.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.target.count({ where }),
    ]);

    return { targets, total, page, limit };
  }

  /**
   * Create a new target
   */
  async create(orgId: string, data: CreateTargetInput) {
    // Validate based on type
    if (data.type === 'DOMAIN' && !isValidDomain(data.value)) {
      throw ApiError.badRequest('Invalid domain format');
    }
    if (data.type === 'IP' && !isValidIp(data.value)) {
      throw ApiError.badRequest('Invalid IP address format');
    }

    // Check quota
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw ApiError.notFound('Organization not found');

    const currentTargets = await prisma.target.count({
      where: { orgId, isActive: true },
    });

    const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS].maxTargets;
    if (planLimit !== -1 && currentTargets >= planLimit) {
      throw ApiError.forbidden(
        `Target limit reached (${planLimit}). Upgrade your plan for more targets.`,
      );
    }

    // Check duplicate
    const existing = await prisma.target.findUnique({
      where: { orgId_value: { orgId, value: data.value } },
    });
    if (existing) {
      throw ApiError.conflict('Target already exists');
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    const target = await prisma.target.create({
      data: {
        orgId,
        type: data.type,
        value: data.value,
        label: data.label,
        notes: data.notes,
        scanProfile: data.scanProfile,
        tags: data.tags || [],
        verificationToken,
      },
    });

    return {
      ...target,
      verificationMethods: {
        dns: {
          type: 'TXT',
          host: `_vulnscan-verify.${data.value}`,
          value: verificationToken,
        },
        html: {
          path: '/.well-known/vulnscan-verify.txt',
          content: verificationToken,
        },
        meta: {
          tag: `<meta name="vulnscan-verify" content="${verificationToken}">`,
        },
      },
    };
  }

  /**
   * Get target by ID
   */
  async getById(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
      include: {
        _count: {
          select: {
            assets: true,
            scans: true,
          },
        },
      },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    return target;
  }

  /**
   * Update target
   */
  async update(orgId: string, targetId: string, data: UpdateTargetInput) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    return prisma.target.update({
      where: { id: targetId },
      data,
    });
  }

  /**
   * Delete target (soft delete)
   */
  async delete(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    await prisma.target.update({
      where: { id: targetId },
      data: { isActive: false },
    });

    return { message: 'Target deleted successfully' };
  }

  /**
   * Verify domain ownership
   */
  async verify(orgId: string, targetId: string, method: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    if (target.verificationStatus === 'VERIFIED') {
      return { message: 'Target already verified', status: 'VERIFIED' };
    }

    // TODO: Implement actual DNS/HTML/Meta verification logic
    // For now, mark as pending verification check
    await prisma.target.update({
      where: { id: targetId },
      data: {
        verificationMethod: method as any,
      },
    });

    return {
      message: 'Verification check initiated. This may take a few minutes.',
      status: 'PENDING',
    };
  }
}

export const targetsService = new TargetsService();

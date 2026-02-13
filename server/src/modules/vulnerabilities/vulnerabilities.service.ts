import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, parseSort } from '../../utils/helpers';

export class VulnerabilitiesService {
  /**
   * List all findings for an organization
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const where: any = {
      scan: { target: { orgId } },
    };

    if (query.severity) {
      where.severity = { in: (query.severity as string).split(',') };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.targetId) {
      where.scan = { ...where.scan, targetId: query.targetId };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = parseSort(query.sort as string) || { cvssScore: 'desc' as const };

    const [findings, total] = await Promise.all([
      prisma.vulnFinding.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          asset: { select: { id: true, value: true, type: true } },
          scan: {
            select: {
              id: true,
              target: { select: { id: true, value: true } },
            },
          },
        },
      }),
      prisma.vulnFinding.count({ where }),
    ]);

    return { findings, total, page, limit };
  }

  /**
   * Get finding by ID
   */
  async getById(orgId: string, findingId: string) {
    const finding = await prisma.vulnFinding.findFirst({
      where: {
        id: findingId,
        scan: { target: { orgId } },
      },
      include: {
        asset: true,
        scan: {
          select: {
            id: true,
            target: { select: { id: true, value: true } },
          },
        },
      },
    });

    if (!finding) {
      throw ApiError.notFound('Finding not found');
    }

    return finding;
  }

  /**
   * Update finding status
   */
  async updateStatus(orgId: string, findingId: string, status: string) {
    const finding = await prisma.vulnFinding.findFirst({
      where: {
        id: findingId,
        scan: { target: { orgId } },
      },
    });

    if (!finding) {
      throw ApiError.notFound('Finding not found');
    }

    const updateData: any = { status };
    if (status === 'FIXED') {
      updateData.resolvedAt = new Date();
    }
    if (status === 'FALSE_POSITIVE') {
      updateData.falsePositive = true;
    }

    return prisma.vulnFinding.update({
      where: { id: findingId },
      data: updateData,
    });
  }

  /**
   * Get vulnerability statistics
   */
  async getStats(orgId: string) {
    const findings = await prisma.vulnFinding.findMany({
      where: { scan: { target: { orgId } } },
      select: { severity: true, status: true, category: true },
    });

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const f of findings) {
      bySeverity[f.severity.toLowerCase() as keyof typeof bySeverity]++;
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    return {
      total: findings.length,
      bySeverity,
      byStatus,
      byCategory,
    };
  }
}

export const vulnerabilitiesService = new VulnerabilitiesService();

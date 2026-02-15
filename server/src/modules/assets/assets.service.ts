import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, parseSort } from '../../utils/helpers';

export class AssetsService {
  /**
   * List all assets for an organization with filters
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const where: any = {
      target: { orgId },
    };

    if (query.targetId) {
      where.targetId = query.targetId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.search) {
      where.OR = [
        { value: { contains: query.search, mode: 'insensitive' } },
        { ip: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = parseSort(query.sort as string) || { lastSeenAt: 'desc' as const };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          target: { select: { id: true, value: true, type: true } },
          _count: { select: { findings: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return { assets, total, page, limit };
  }

  /**
   * Get asset by ID with full details
   */
  async getById(orgId: string, assetId: string) {
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        target: { orgId },
      },
      include: {
        target: { select: { id: true, value: true, type: true } },
        findings: {
          orderBy: { severity: 'asc' },
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            category: true,
            cvssScore: true,
            firstFoundAt: true,
          },
        },
      },
    });

    if (!asset) {
      throw ApiError.notFound('Asset not found');
    }

    // Compute findings count by severity
    const findingsCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of asset.findings) {
      const key = f.severity.toLowerCase() as keyof typeof findingsCount;
      findingsCount[key]++;
    }

    return { ...asset, findingsCount };
  }

  /**
   * Get assets for a specific target
   */
  async listByTarget(orgId: string, targetId: string, query: Record<string, any>) {
    // Verify target belongs to org
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    return this.list(orgId, { ...query, targetId });
  }

  /**
   * Get asset statistics for an organization
   */
  async getStats(orgId: string) {
    const assets = await prisma.asset.findMany({
      where: { target: { orgId } },
      select: { type: true, isActive: true },
    });

    const byType: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    for (const a of assets) {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.isActive) active++;
      else inactive++;
    }

    return {
      total: assets.length,
      active,
      inactive,
      byType,
    };
  }
}

export const assetsService = new AssetsService();

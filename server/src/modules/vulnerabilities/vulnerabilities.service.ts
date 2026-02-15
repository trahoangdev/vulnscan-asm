import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, parseSort } from '../../utils/helpers';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

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

  /**
   * Export all findings for an organization as CSV or JSON
   */
  async exportFindings(orgId: string, query: Record<string, any>) {
    const where: any = {
      scan: { target: { orgId } },
    };
    if (query.severity) where.severity = { in: (query.severity as string).split(',') };
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.targetId) where.scan = { ...where.scan, targetId: query.targetId };

    const findings = await prisma.vulnFinding.findMany({
      where,
      orderBy: [{ severity: 'asc' }, { cvssScore: 'desc' }],
      include: {
        scan: { select: { target: { select: { value: true } } } },
      },
    });

    const format = (query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';

    if (format === 'CSV') {
      const headers = ['Title', 'Severity', 'CVSS', 'Category', 'OWASP', 'Status', 'Affected URL', 'Target', 'Description', 'Remediation'];
      const rows = findings.map((f: any) => [
        `"${(f.title || '').replace(/"/g, '""')}"`,
        f.severity,
        f.cvssScore ?? '',
        f.category,
        f.owaspCategory ?? '',
        f.status,
        `"${(f.affectedUrl || '').replace(/"/g, '""')}"`,
        `"${(f.scan?.target?.value || '').replace(/"/g, '""')}"`,
        `"${(f.description || '').replace(/"/g, '""')}"`,
        `"${(f.remediation || '').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      return { data: csv, format: 'CSV', count: findings.length };
    }

    return { data: findings, format: 'JSON', count: findings.length };
  }

  /**
   * Re-scan to verify if a vulnerability has been fixed
   * Creates a targeted scan job for the specific vulnerability
   */
  async reverify(orgId: string, findingId: string, userId: string) {
    const finding = await prisma.vulnFinding.findFirst({
      where: {
        id: findingId,
        scan: { target: { orgId } },
      },
      include: {
        asset: { select: { id: true, value: true, type: true } },
        scan: {
          select: {
            id: true,
            targetId: true,
            target: { select: { id: true, value: true, type: true } },
          },
        },
      },
    });

    if (!finding) throw ApiError.notFound('Finding not found');

    // Create a quick scan for this target focused on this vulnerability category
    const scan = await prisma.scan.create({
      data: {
        targetId: finding.scan.targetId,
        createdById: userId,
        type: 'ON_DEMAND',
        profile: 'QUICK',
        status: 'QUEUED',
        modules: [finding.category.toLowerCase()],
      },
    });

    // Mark the finding as IN_PROGRESS
    await prisma.vulnFinding.update({
      where: { id: findingId },
      data: { status: 'IN_PROGRESS' },
    });

    // Queue the re-verify scan job
    try {
      await redis.rpush(
        'vulnscan:scan_queue',
        JSON.stringify({
          scanId: scan.id,
          targetValue: finding.scan.target.value,
          targetType: finding.scan.target.type,
          profile: 'QUICK',
          modules: [finding.category.toLowerCase()],
          isReverify: true,
          reverifyFindingId: findingId,
        }),
      );
    } catch (err) {
      logger.error('Failed to queue re-verify scan', err);
    }

    return {
      message: 'Re-verification scan queued',
      scanId: scan.id,
      findingId,
      status: 'QUEUED',
    };
  }
}

export const vulnerabilitiesService = new VulnerabilitiesService();

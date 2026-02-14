import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, parseSort } from '../../utils/helpers';
import { SCAN_PROFILES, PLAN_LIMITS } from '../../../../shared/constants/index';
import { scanQueue } from '../../config/queue';
import type { CreateScanInput } from './scans.schema';

export class ScansService {
  /**
   * List scans with filters
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort as string);

    const where: any = {
      target: { orgId },
    };

    if (query.targetId) {
      where.targetId = query.targetId;
    }
    if (query.status) {
      where.status = { in: (query.status as string).split(',') };
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          target: {
            select: { id: true, value: true, type: true },
          },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    return { scans, total, page, limit };
  }

  /**
   * Create a new scan
   */
  async create(orgId: string, userId: string, data: CreateScanInput) {
    // Verify target belongs to org
    const target = await prisma.target.findFirst({
      where: { id: data.targetId, orgId, isActive: true },
    });
    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    // Check if target is verified (required for scanning)
    if (target.verificationStatus !== 'VERIFIED') {
      throw ApiError.forbidden('Target must be verified before scanning');
    }

    // Check scan quota
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw ApiError.notFound('Organization not found');

    const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS].maxScansPerMonth;
    if (planLimit !== -1 && org.scansUsed >= planLimit) {
      throw ApiError.forbidden('Monthly scan limit reached. Upgrade your plan.');
    }

    // Check for running scans on same target
    const runningScan = await prisma.scan.findFirst({
      where: {
        targetId: data.targetId,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });
    if (runningScan) {
      throw ApiError.conflict('A scan is already running for this target');
    }

    // Determine modules from profile
    const profileConfig = SCAN_PROFILES[data.profile as keyof typeof SCAN_PROFILES];
    const modules = data.modules || (profileConfig ? [...profileConfig.modules] : []);

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        targetId: data.targetId,
        createdById: userId,
        profile: data.profile,
        modules,
        status: 'QUEUED',
      },
      include: {
        target: { select: { id: true, value: true, type: true } },
      },
    });

    // Increment scans used
    await prisma.organization.update({
      where: { id: orgId },
      data: { scansUsed: { increment: 1 } },
    });

    // Add to job queue
    await scanQueue.add('scan', {
      scanId: scan.id,
      targetId: data.targetId,
      targetValue: target.value,
      targetType: target.type,
      modules,
      profile: data.profile,
      orgId,
    });

    return {
      ...scan,
      estimatedDuration: profileConfig?.estimatedDuration || 600,
    };
  }

  /**
   * Get scan by ID
   */
  async getById(orgId: string, scanId: string) {
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        target: { orgId },
      },
      include: {
        target: { select: { id: true, value: true, type: true } },
        _count: {
          select: { findings: true, scanResults: true },
        },
      },
    });

    if (!scan) {
      throw ApiError.notFound('Scan not found');
    }

    return scan;
  }

  /**
   * Cancel a running scan
   */
  async cancel(orgId: string, scanId: string) {
    const scan = await prisma.scan.findFirst({
      where: {
        id: scanId,
        target: { orgId },
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    if (!scan) {
      throw ApiError.notFound('Scan not found or not cancellable');
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    return { message: 'Scan cancelled successfully' };
  }

  /**
   * Get scan findings
   */
  async getFindings(orgId: string, scanId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    // Verify scan belongs to org
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, target: { orgId } },
    });
    if (!scan) throw ApiError.notFound('Scan not found');

    const where: any = { scanId };
    if (query.severity) {
      where.severity = { in: (query.severity as string).split(',') };
    }
    if (query.status) {
      where.status = query.status;
    }

    const [findings, total] = await Promise.all([
      prisma.vulnFinding.findMany({
        where,
        orderBy: { cvssScore: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vulnFinding.count({ where }),
    ]);

    return { findings, total, page, limit };
  }

  /**
   * Get raw scan results by module
   */
  async getResults(orgId: string, scanId: string) {
    // Verify scan belongs to org
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, target: { orgId } },
    });
    if (!scan) throw ApiError.notFound('Scan not found');

    const results = await prisma.scanResult.findMany({
      where: { scanId },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        module: true,
        status: true,
        rawOutput: true,
        duration: true,
        startedAt: true,
        completedAt: true,
        errorMsg: true,
      },
    });

    return results;
  }

  /**
   * Compare current scan with previous scan for the same target (scan diff)
   */
  async diff(orgId: string, scanId: string) {
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, target: { orgId }, status: 'COMPLETED' },
      include: { target: { select: { id: true, value: true } } },
    });
    if (!scan) throw ApiError.notFound('Completed scan not found');

    // Find the previous completed scan for the same target
    const previousScan = await prisma.scan.findFirst({
      where: {
        targetId: scan.targetId,
        status: 'COMPLETED',
        completedAt: { lt: scan.completedAt! },
        id: { not: scanId },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!previousScan) {
      return {
        currentScanId: scanId,
        previousScanId: null,
        target: scan.target,
        message: 'No previous scan to compare',
        newFindings: [],
        fixedFindings: [],
        unchangedCount: 0,
      };
    }

    // Get findings for both scans
    const [currentFindings, previousFindings] = await Promise.all([
      prisma.vulnFinding.findMany({
        where: { scanId },
        select: { id: true, title: true, severity: true, category: true, affectedUrl: true, cvssScore: true, status: true },
      }),
      prisma.vulnFinding.findMany({
        where: { scanId: previousScan.id },
        select: { id: true, title: true, severity: true, category: true, affectedUrl: true, cvssScore: true, status: true },
      }),
    ]);

    // Match by title+category+affectedUrl fingerprint
    const fingerprint = (f: any) => `${f.title}|${f.category}|${f.affectedUrl || ''}`;
    const prevSet = new Set(previousFindings.map(fingerprint));
    const currSet = new Set(currentFindings.map(fingerprint));

    const newFindings = currentFindings.filter((f) => !prevSet.has(fingerprint(f)));
    const fixedFindings = previousFindings.filter((f) => !currSet.has(fingerprint(f)));
    const unchangedCount = currentFindings.length - newFindings.length;

    return {
      currentScanId: scanId,
      previousScanId: previousScan.id,
      target: scan.target,
      summary: {
        currentTotal: currentFindings.length,
        previousTotal: previousFindings.length,
        new: newFindings.length,
        fixed: fixedFindings.length,
        unchanged: unchangedCount,
      },
      newFindings,
      fixedFindings,
    };
  }
}

export const scansService = new ScansService();

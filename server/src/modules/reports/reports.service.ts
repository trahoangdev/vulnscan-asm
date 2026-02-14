import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination } from '../../utils/helpers';

export class ReportsService {
  /**
   * List all reports for an organization
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({ where: { orgId } }),
    ]);

    return { reports, total, page, limit };
  }

  /**
   * Get report by ID
   */
  async getById(orgId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      throw ApiError.notFound('Report not found');
    }

    return report;
  }

  /**
   * Generate a new report
   */
  async generate(orgId: string, data: {
    type: string;
    format?: string;
    title: string;
    parameters?: Record<string, any>;
  }) {
    const report = await prisma.report.create({
      data: {
        orgId,
        type: data.type as any,
        title: data.title,
        format: (data.format as any) || 'PDF',
        status: 'generating',
        parameters: data.parameters || {},
      },
    });

    // Generate the report data inline (no external worker needed for HTML/JSON)
    try {
      const reportData = await this.buildReportData(orgId, data.parameters);
      const fileUrl = `data:application/json;base64,${Buffer.from(
        JSON.stringify(reportData, null, 2),
      ).toString('base64')}`;

      const updatedReport = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'ready',
          fileUrl,
          fileSize: JSON.stringify(reportData).length,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      return updatedReport;
    } catch (error) {
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Build report data from database
   */
  private async buildReportData(orgId: string, parameters?: Record<string, any>) {
    const targetIds = parameters?.targetIds;
    const dateFrom = parameters?.dateRange?.from;
    const dateTo = parameters?.dateRange?.to;
    const includeSeverities = parameters?.includeSeverities;

    // Build where clauses
    const targetWhere: any = { orgId };
    if (targetIds?.length) {
      targetWhere.id = { in: targetIds };
    }

    const scanWhere: any = {
      target: targetWhere,
      status: 'COMPLETED',
    };
    if (dateFrom || dateTo) {
      scanWhere.createdAt = {};
      if (dateFrom) scanWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) scanWhere.createdAt.lte = new Date(dateTo);
    }

    const findingWhere: any = {
      scan: scanWhere,
    };
    if (includeSeverities?.length) {
      findingWhere.severity = { in: includeSeverities };
    }

    // Fetch data
    const [targets, scans, findings, assets] = await Promise.all([
      prisma.target.findMany({
        where: targetWhere,
        select: {
          id: true,
          value: true,
          type: true,
          verificationStatus: true,
          securityScore: true,
          lastScanAt: true,
        },
      }),
      prisma.scan.findMany({
        where: scanWhere,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          profile: true,
          status: true,
          totalAssets: true,
          totalVulns: true,
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
          infoCount: true,
          startedAt: true,
          completedAt: true,
          duration: true,
          target: { select: { value: true } },
        },
      }),
      prisma.vulnFinding.findMany({
        where: findingWhere,
        orderBy: [{ severity: 'asc' }, { cvssScore: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          cvssScore: true,
          category: true,
          owaspCategory: true,
          affectedUrl: true,
          remediation: true,
          status: true,
          firstFoundAt: true,
          scan: { select: { target: { select: { value: true } } } },
        },
      }),
      prisma.asset.count({ where: { target: targetWhere } }),
    ]);

    // Compute severity summary
    const severitySummary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    const categorySummary: Record<string, number> = {};
    for (const f of findings) {
      severitySummary[f.severity as keyof typeof severitySummary]++;
      categorySummary[f.category] = (categorySummary[f.category] || 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      organization: orgId,
      summary: {
        totalTargets: targets.length,
        totalAssets: assets,
        totalVulnerabilities: findings.length,
        totalScans: scans.length,
        severityBreakdown: severitySummary,
        categoryBreakdown: categorySummary,
      },
      targets,
      recentScans: scans,
      vulnerabilities: findings,
    };
  }

  /**
   * Delete a report
   */
  async delete(orgId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      throw ApiError.notFound('Report not found');
    }

    await prisma.report.delete({ where: { id: reportId } });
    return { deleted: true };
  }
}

export const reportsService = new ReportsService();

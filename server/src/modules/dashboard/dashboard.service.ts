import { prisma } from '@config/database';
import { logger } from '@utils/logger';

export const dashboardService = {
  /**
   * Get aggregated dashboard statistics for an organization.
   */
  async getStats(orgId: string) {
    const [
      targetsCount,
      targetsByStatus,
      scansCount,
      recentScans,
      assetsCount,
      vulnsBySeverity,
      vulnsByStatus,
      vulnsByCategory,
      vulnsTrend,
      topVulnAssets,
    ] = await Promise.all([
      // Total targets
      prisma.target.count({ where: { orgId } }),

      // Targets by status
      prisma.target.groupBy({
        by: ['verificationStatus'],
        where: { orgId },
        _count: true,
      }),

      // Total scans
      prisma.scan.count({ where: { target: { orgId } } }),

      // Last 5 scans
      prisma.scan.findMany({
        where: { target: { orgId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          target: { select: { value: true, type: true } },
        },
      }),

      // Total assets
      prisma.asset.count({
        where: { target: { orgId } },
      }),

      // Vulnerabilities by severity
      prisma.vulnFinding.groupBy({
        by: ['severity'],
        where: { scan: { target: { orgId } }, status: { not: 'FALSE_POSITIVE' } },
        _count: true,
      }),

      // Vulnerabilities by status
      prisma.vulnFinding.groupBy({
        by: ['status'],
        where: { scan: { target: { orgId } } },
        _count: true,
      }),

      // Vulnerabilities by category (top 10)
      prisma.vulnFinding.groupBy({
        by: ['category'],
        where: { scan: { target: { orgId } }, status: { not: 'FALSE_POSITIVE' } },
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),

      // Vulnerability trend — findings per day for the last 30 days
      prisma.$queryRaw`
        SELECT DATE(vf."created_at") as date, COUNT(*)::int as count
        FROM "vuln_findings" vf
        JOIN "scans" s ON vf."scan_id" = s."id"
        JOIN "targets" t ON s."target_id" = t."id"
        WHERE t."org_id" = ${orgId}
          AND vf."created_at" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(vf."created_at")
        ORDER BY date ASC
      `,

      // Top 5 vulnerable assets (most open findings)
      prisma.$queryRaw`
        SELECT
          a."id",
          a."value",
          a."type",
          a."ip",
          a."http_status" as "httpStatus",
          COUNT(vf."id")::int as "vulnCount",
          COUNT(CASE WHEN vf."severity" = 'CRITICAL' THEN 1 END)::int as "criticalCount",
          COUNT(CASE WHEN vf."severity" = 'HIGH' THEN 1 END)::int as "highCount"
        FROM "assets" a
        JOIN "targets" t ON a."target_id" = t."id"
        JOIN "vuln_findings" vf ON vf."asset_id" = a."id"
        WHERE t."org_id" = ${orgId}
          AND vf."status" NOT IN ('FALSE_POSITIVE', 'FIXED')
        GROUP BY a."id", a."value", a."type", a."ip", a."http_status"
        ORDER BY "vulnCount" DESC
        LIMIT 5
      `,
    ]);

    // Compute severity breakdown
    const severityMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const s of vulnsBySeverity) {
      severityMap[s.severity] = s._count;
    }

    // Compute status breakdown
    const statusMap: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, FIXED: 0, ACCEPTED: 0, FALSE_POSITIVE: 0 };
    for (const s of vulnsByStatus) {
      statusMap[s.status] = s._count;
    }

    // Compute target status breakdown
    const targetStatusMap: Record<string, number> = {};
    for (const t of targetsByStatus) {
      targetStatusMap[t.verificationStatus] = t._count;
    }

    const totalVulns = Object.values(severityMap).reduce((a, b) => a + b, 0);

    return {
      targets: {
        total: targetsCount,
        byStatus: targetStatusMap,
      },
      scans: {
        total: scansCount,
        recent: recentScans.map((s) => ({
          id: s.id,
          target: s.target.value,
          targetType: s.target.type,
          profile: s.profile,
          status: s.status,
          progress: s.progress,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          createdAt: s.createdAt,
        })),
      },
      assets: {
        total: assetsCount,
      },
      vulnerabilities: {
        total: totalVulns,
        bySeverity: severityMap,
        byStatus: statusMap,
        byCategory: vulnsByCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        trend: vulnsTrend,
      },
      topVulnerableAssets: (topVulnAssets as any[]).map((a) => ({
        id: a.id,
        value: a.value,
        type: a.type,
        ip: a.ip,
        httpStatus: a.httpStatus,
        vulnCount: a.vulnCount,
        criticalCount: a.criticalCount,
        highCount: a.highCount,
      })),
    };
  },
};

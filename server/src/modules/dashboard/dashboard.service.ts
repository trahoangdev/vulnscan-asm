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

  /**
   * Risk trend analytics — vulnerability counts over time with Security Score history
   * Supports 30, 60, 90, 180, 365 day ranges
   */
  async getRiskTrend(orgId: string, days: number = 30) {
    const validDays = [7, 14, 30, 60, 90, 180, 365].includes(days) ? days : 30;

    // Daily vulnerability counts (new found vs resolved)
    const dailyTrend: any[] = await prisma.$queryRaw`
      SELECT 
        d.date,
        COALESCE(new_vulns.count, 0)::int as "newVulns",
        COALESCE(resolved.count, 0)::int as "resolvedVulns"
      FROM (
        SELECT generate_series(
          (NOW() - ${validDays + ' days'}::interval)::date,
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ) d
      LEFT JOIN (
        SELECT DATE(vf."first_found_at") as date, COUNT(*)::int as count
        FROM "vuln_findings" vf
        JOIN "scans" s ON vf."scan_id" = s."id"
        JOIN "targets" t ON s."target_id" = t."id"
        WHERE t."org_id" = ${orgId}
          AND vf."first_found_at" >= NOW() - ${validDays + ' days'}::interval
        GROUP BY DATE(vf."first_found_at")
      ) new_vulns ON d.date = new_vulns.date
      LEFT JOIN (
        SELECT DATE(vf."resolved_at") as date, COUNT(*)::int as count
        FROM "vuln_findings" vf
        JOIN "scans" s ON vf."scan_id" = s."id"
        JOIN "targets" t ON s."target_id" = t."id"
        WHERE t."org_id" = ${orgId}
          AND vf."resolved_at" >= NOW() - ${validDays + ' days'}::interval
          AND vf."status" = 'FIXED'
        GROUP BY DATE(vf."resolved_at")
      ) resolved ON d.date = resolved.date
      ORDER BY d.date ASC
    `;

    // Severity distribution over time (weekly buckets)
    const severityTrend: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('week', vf."first_found_at")::date as week,
        COUNT(CASE WHEN vf."severity" = 'CRITICAL' THEN 1 END)::int as critical,
        COUNT(CASE WHEN vf."severity" = 'HIGH' THEN 1 END)::int as high,
        COUNT(CASE WHEN vf."severity" = 'MEDIUM' THEN 1 END)::int as medium,
        COUNT(CASE WHEN vf."severity" = 'LOW' THEN 1 END)::int as low,
        COUNT(CASE WHEN vf."severity" = 'INFO' THEN 1 END)::int as info
      FROM "vuln_findings" vf
      JOIN "scans" s ON vf."scan_id" = s."id"
      JOIN "targets" t ON s."target_id" = t."id"
      WHERE t."org_id" = ${orgId}
        AND vf."first_found_at" >= NOW() - ${validDays + ' days'}::interval
      GROUP BY DATE_TRUNC('week', vf."first_found_at")
      ORDER BY week ASC
    `;

    // Current vs previous period comparison
    const [currentPeriod, previousPeriod] = await Promise.all([
      prisma.vulnFinding.count({
        where: {
          scan: { target: { orgId } },
          firstFoundAt: { gte: new Date(Date.now() - validDays * 86400000) },
          status: { not: 'FALSE_POSITIVE' },
        },
      }),
      prisma.vulnFinding.count({
        where: {
          scan: { target: { orgId } },
          firstFoundAt: {
            gte: new Date(Date.now() - validDays * 2 * 86400000),
            lt: new Date(Date.now() - validDays * 86400000),
          },
          status: { not: 'FALSE_POSITIVE' },
        },
      }),
    ]);

    const changePercent = previousPeriod > 0
      ? Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100)
      : currentPeriod > 0 ? 100 : 0;

    // Scan activity
    const scanActivity: any[] = await prisma.$queryRaw`
      SELECT 
        DATE(s."created_at") as date,
        COUNT(*)::int as "totalScans",
        COUNT(CASE WHEN s."status" = 'COMPLETED' THEN 1 END)::int as "completedScans"
      FROM "scans" s
      JOIN "targets" t ON s."target_id" = t."id"
      WHERE t."org_id" = ${orgId}
        AND s."created_at" >= NOW() - ${validDays + ' days'}::interval
      GROUP BY DATE(s."created_at")
      ORDER BY date ASC
    `;

    return {
      period: { days: validDays, from: new Date(Date.now() - validDays * 86400000), to: new Date() },
      summary: {
        currentPeriodVulns: currentPeriod,
        previousPeriodVulns: previousPeriod,
        changePercent,
        trend: changePercent > 0 ? 'increasing' : changePercent < 0 ? 'decreasing' : 'stable',
      },
      dailyTrend,
      severityTrend,
      scanActivity,
    };
  },
};

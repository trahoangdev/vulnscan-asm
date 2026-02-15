import prisma from '../config/database';
import { logger } from '../utils/logger';

/**
 * Data Retention Policy — automated cleanup job
 * Removes old scans, findings, assets, and audit logs based on per-org policies.
 */

const DEFAULT_RETENTION = {
  scanRetentionDays: 365,
  findingRetentionDays: 730,
  assetRetentionDays: 365,
  auditLogRetentionDays: 90,
};

export async function processDataRetention() {
  logger.info('🗑️ Data retention: Starting cleanup');

  try {
    // Get all organizations with their retention policies
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: {
        dataRetentionPolicy: true,
      },
    });

    let totalDeleted = { scans: 0, findings: 0, assets: 0, auditLogs: 0 };

    for (const org of orgs) {
      const policy = org.dataRetentionPolicy || DEFAULT_RETENTION;
      const now = new Date();

      try {
        // Delete old completed scans
        const scanCutoff = new Date(now.getTime() - policy.scanRetentionDays * 24 * 60 * 60 * 1000);
        const deletedScans = await prisma.scan.deleteMany({
          where: {
            target: { orgId: org.id },
            status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
            completedAt: { lt: scanCutoff },
          },
        });
        totalDeleted.scans += deletedScans.count;

        // Delete old resolved findings
        const findingCutoff = new Date(now.getTime() - policy.findingRetentionDays * 24 * 60 * 60 * 1000);
        const deletedFindings = await prisma.vulnFinding.deleteMany({
          where: {
            scan: { target: { orgId: org.id } },
            status: { in: ['FIXED', 'ACCEPTED', 'FALSE_POSITIVE'] },
            resolvedAt: { lt: findingCutoff },
          },
        });
        totalDeleted.findings += deletedFindings.count;

        // Delete old assets not seen recently
        const assetCutoff = new Date(now.getTime() - policy.assetRetentionDays * 24 * 60 * 60 * 1000);
        const deletedAssets = await prisma.asset.deleteMany({
          where: {
            target: { orgId: org.id },
            lastSeenAt: { lt: assetCutoff },
          },
        });
        totalDeleted.assets += deletedAssets.count;

        // Delete old audit logs
        const auditCutoff = new Date(now.getTime() - policy.auditLogRetentionDays * 24 * 60 * 60 * 1000);
        const deletedLogs = await prisma.auditLog.deleteMany({
          where: {
            userId: {
              in: (await prisma.orgMember.findMany({
                where: { orgId: org.id },
                select: { userId: true },
              })).map((m) => m.userId),
            },
            createdAt: { lt: auditCutoff },
          },
        });
        totalDeleted.auditLogs += deletedLogs.count;

        // Update lastCleanupAt
        if (org.dataRetentionPolicy) {
          await prisma.dataRetentionPolicy.update({
            where: { id: org.dataRetentionPolicy.id },
            data: { lastCleanupAt: now },
          });
        }
      } catch (orgErr) {
        logger.error(`Data retention: Failed for org ${org.id}`, orgErr);
      }
    }

    logger.info(
      `🗑️ Data retention completed: ${totalDeleted.scans} scans, ${totalDeleted.findings} findings, ${totalDeleted.assets} assets, ${totalDeleted.auditLogs} audit logs deleted`,
    );
  } catch (err) {
    logger.error('Data retention job failed', err);
  }
}

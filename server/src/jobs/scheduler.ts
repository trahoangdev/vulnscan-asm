import prisma from '../config/database';
import { scanQueue } from '../config/queue';
import { logger } from '../utils/logger';
import { SCAN_PROFILES, PLAN_LIMITS } from '../../../shared/constants/index';

/**
 * Scan scheduler — checks targets with configured schedules
 * and creates scans when nextScanAt is due.
 *
 * Supported schedule values: "daily", "weekly", "monthly"
 */

const SCHEDULE_INTERVALS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,         // 1 day
  weekly: 7 * 24 * 60 * 60 * 1000,    // 7 days
  monthly: 30 * 24 * 60 * 60 * 1000,  // 30 days
};

function getNextScanDate(schedule: string, from: Date = new Date()): Date {
  const interval = SCHEDULE_INTERVALS[schedule];
  if (!interval) return new Date(from.getTime() + SCHEDULE_INTERVALS.daily);
  return new Date(from.getTime() + interval);
}

/**
 * Process due scheduled scans
 */
async function processDueScans() {
  const now = new Date();

  // Find verified targets with a schedule where nextScanAt is past due
  const dueTargets = await prisma.target.findMany({
    where: {
      isActive: true,
      verificationStatus: 'VERIFIED',
      scanSchedule: { not: null },
      nextScanAt: { lte: now },
    },
    include: {
      organization: {
        select: {
          id: true,
          plan: true,
          scansUsed: true,
          maxScansPerMonth: true,
          members: {
            where: { role: 'OWNER' },
            select: { userId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (dueTargets.length === 0) return;

  logger.info(`📅 Scheduler: Found ${dueTargets.length} targets due for scanning`);

  for (const target of dueTargets) {
    try {
      const org = target.organization;

      // Check plan quota
      const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS]?.maxScansPerMonth;
      if (planLimit !== -1 && org.scansUsed >= (planLimit || 10)) {
        logger.warn(`Scheduler: Org ${org.id} scan quota exhausted, skipping target ${target.value}`);
        // Still update nextScanAt so we don't retry every tick
        await prisma.target.update({
          where: { id: target.id },
          data: { nextScanAt: getNextScanDate(target.scanSchedule!) },
        });
        continue;
      }

      // Check no running scan on this target
      const runningScan = await prisma.scan.findFirst({
        where: {
          targetId: target.id,
          status: { in: ['QUEUED', 'RUNNING'] },
        },
      });
      if (runningScan) {
        logger.info(`Scheduler: Target ${target.value} already has a running scan, skipping`);
        continue;
      }

      // Resolve profile and modules
      const profile = target.scanProfile || 'STANDARD';
      const profileConfig = SCAN_PROFILES[profile as keyof typeof SCAN_PROFILES];
      const modules = profileConfig ? [...profileConfig.modules] : [];

      // Get owner user ID for createdById
      const ownerId = org.members[0]?.userId;
      if (!ownerId) {
        logger.warn(`Scheduler: Org ${org.id} has no owner, skipping target ${target.value}`);
        continue;
      }

      // Create the scan
      const scan = await prisma.scan.create({
        data: {
          targetId: target.id,
          createdById: ownerId,
          type: 'SCHEDULED',
          profile: profile as any,
          modules,
          status: 'QUEUED',
        },
      });

      // Increment scans used
      await prisma.organization.update({
        where: { id: org.id },
        data: { scansUsed: { increment: 1 } },
      });

      // Add to job queue
      await scanQueue.add('scan', {
        scanId: scan.id,
        targetId: target.id,
        targetValue: target.value,
        targetType: target.type,
        modules,
        profile,
        orgId: org.id,
      });

      // Update nextScanAt
      await prisma.target.update({
        where: { id: target.id },
        data: {
          lastScanAt: now,
          nextScanAt: getNextScanDate(target.scanSchedule!),
        },
      });

      logger.info(`📅 Scheduler: Created scheduled scan ${scan.id} for ${target.value}`);
    } catch (error) {
      logger.error(`Scheduler: Failed to create scan for target ${target.id}`, error);
    }
  }
}

/**
 * Start the scan scheduler — runs every 60 seconds
 */
let schedulerInterval: NodeJS.Timeout | null = null;

export function startScanScheduler() {
  if (schedulerInterval) return;

  logger.info('📅 Scan scheduler started (interval: 60s)');

  // Run immediately on start
  processDueScans().catch((err) => {
    logger.error('Scheduler: Initial run failed', err);
  });

  // Then run every 60 seconds
  schedulerInterval = setInterval(() => {
    processDueScans().catch((err) => {
      logger.error('Scheduler: Tick failed', err);
    });
  }, 60 * 1000);
}

export function stopScanScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('📅 Scan scheduler stopped');
  }
}

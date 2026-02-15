import prisma from '../config/database';
import { scanQueue } from '../config/queue';
import { logger } from '../utils/logger';
import { SCAN_PROFILES, PLAN_LIMITS } from '../constants/shared';
import { sendEmail, weeklyDigestEmailHtml } from '../utils/email';
import { env } from '../config/env';
import { uploadReport } from '../utils/storage';
import { processDataRetention } from './dataRetention';

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
 * Send weekly digest emails to all org members
 * Runs once per week (checked every tick, tracked via lastDigestSent)
 */
let lastDigestSent: Date | null = null;

async function processWeeklyDigest() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday...
  const hour = now.getUTCHours();

  // Send on Monday at ~8:00 UTC
  if (dayOfWeek !== 1 || hour !== 8) return;

  // Deduplicate: only once per day
  if (lastDigestSent && (now.getTime() - lastDigestSent.getTime()) < 23 * 60 * 60 * 1000) return;

  logger.info('📊 Weekly digest: Starting');
  lastDigestSent = now;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    for (const org of orgs) {
      try {
        // Gather stats for the past week
        const [scansRun, newFindings, fixedFindings, openFindings, newAssets] = await Promise.all([
          prisma.scan.count({
            where: { target: { orgId: org.id }, status: 'COMPLETED', completedAt: { gte: oneWeekAgo } },
          }),
          prisma.vulnFinding.count({
            where: { scan: { target: { orgId: org.id } }, firstFoundAt: { gte: oneWeekAgo } },
          }),
          prisma.vulnFinding.count({
            where: { scan: { target: { orgId: org.id } }, status: 'FIXED', resolvedAt: { gte: oneWeekAgo } },
          }),
          prisma.vulnFinding.groupBy({
            by: ['severity'],
            where: { scan: { target: { orgId: org.id } }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            _count: true,
          }),
          prisma.asset.count({
            where: { target: { orgId: org.id }, firstSeenAt: { gte: oneWeekAgo } },
          }),
        ]);

        const criticalOpen = openFindings.find((g: any) => g.severity === 'CRITICAL')?._count || 0;
        const highOpen = openFindings.find((g: any) => g.severity === 'HIGH')?._count || 0;
        const totalOpen = openFindings.reduce((acc: number, g: any) => acc + g._count, 0);

        const stats = { newFindings, fixedFindings, criticalOpen, highOpen, totalOpen, scansRun, newAssets };

        // Skip if no activity and no open findings
        if (scansRun === 0 && newFindings === 0 && totalOpen === 0) continue;

        const dashboardUrl = `${env.CLIENT_URL}/dashboard`;

        for (const member of org.members) {
          try {
            // Create in-app notification
            await prisma.notification.create({
              data: {
                userId: member.user.id,
                type: 'WEEKLY_DIGEST',
                title: `📊 Weekly Digest: ${newFindings} new, ${fixedFindings} fixed`,
                message: `${org.name} — ${totalOpen} open findings (${criticalOpen} critical, ${highOpen} high). ${scansRun} scans this week.`,
                data: stats as any,
              },
            });

            // Send email
            await sendEmail({
              to: member.user.email,
              subject: `[${env.APP_NAME}] Weekly Security Digest — ${org.name}`,
              html: weeklyDigestEmailHtml(member.user.name, org.name, stats, dashboardUrl),
            });
          } catch (memberErr) {
            logger.warn(`Digest: Failed for user ${member.user.id}`, memberErr);
          }
        }

        logger.info(`📊 Digest sent for org ${org.name} (${org.members.length} members)`);
      } catch (orgErr) {
        logger.warn(`Digest: Failed for org ${org.id}`, orgErr);
      }
    }
  } catch (err) {
    logger.error('Weekly digest failed', err);
  }
}

/**
 * Start the scan scheduler — runs every 60 seconds
 */
let schedulerInterval: NodeJS.Timeout | null = null;
let lastReverifyRun: Date | null = null;
let lastScheduledReportRun: Date | null = null;
let lastDataRetentionRun: Date | null = null;

/**
 * Scheduled Report Delivery — sends scheduled reports via email
 * Checks for ScheduledReport records that are due and generates+sends them.
 */
async function processScheduledReports() {
  const now = new Date();

  // Run at most once per hour
  if (lastScheduledReportRun && (now.getTime() - lastScheduledReportRun.getTime()) < 55 * 60 * 1000) return;

  lastScheduledReportRun = now;

  try {
    // Find scheduled reports that are due
    const dueReports = await prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        organization: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (dueReports.length === 0) return;

    logger.info(`📄 Scheduled reports: Processing ${dueReports.length} due reports`);

    for (const report of dueReports) {
      try {
        // Gather scan data for the report period
        const periodDays = report.frequency === 'DAILY' ? 1 : report.frequency === 'WEEKLY' ? 7 : 30;
        const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

        const [scans, findings, severityCounts] = await Promise.all([
          prisma.scan.findMany({
            where: {
              target: { orgId: report.orgId },
              status: 'COMPLETED',
              completedAt: { gte: periodStart },
            },
            select: { id: true, targetId: true, status: true, completedAt: true, totalVulns: true },
            orderBy: { completedAt: 'desc' },
            take: 50,
          }),
          prisma.vulnFinding.count({
            where: {
              scan: { target: { orgId: report.orgId } },
              firstFoundAt: { gte: periodStart },
            },
          }),
          prisma.vulnFinding.groupBy({
            by: ['severity'],
            where: {
              scan: { target: { orgId: report.orgId } },
              status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
            _count: true,
          }),
        ]);

        const criticalCount = severityCounts.find((g: any) => g.severity === 'CRITICAL')?._count || 0;
        const highCount = severityCounts.find((g: any) => g.severity === 'HIGH')?._count || 0;
        const totalOpen = severityCounts.reduce((acc: number, g: any) => acc + g._count, 0);

        // Build simple HTML report
        const reportHtml = `
          <h1>Scheduled Security Report — ${report.organization.name}</h1>
          <p>Period: ${periodStart.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}</p>
          <p>Frequency: ${report.frequency}</p>
          <hr>
          <h2>Summary</h2>
          <ul>
            <li>Scans completed: ${scans.length}</li>
            <li>New findings: ${findings}</li>
            <li>Open findings: ${totalOpen} (${criticalCount} critical, ${highCount} high)</li>
          </ul>
          <p><a href="${env.CLIENT_URL}/dashboard">View full dashboard →</a></p>
        `;

        // Upload to S3
        await uploadReport(report.orgId, 'scheduled', 'html', reportHtml);

        // Send email to recipients
        const recipients = (report.recipients as string[]) || [report.createdBy.email];
        for (const recipient of recipients) {
          await sendEmail({
            to: recipient,
            subject: `[${env.APP_NAME}] ${report.frequency} Security Report — ${report.organization.name}`,
            html: reportHtml,
          });
        }

        // Update next run date
        const nextRunAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
        await prisma.scheduledReport.update({
          where: { id: report.id },
          data: { lastRunAt: now, nextRunAt },
        });

        logger.info(`📄 Scheduled report delivered: ${report.id} to ${recipients.length} recipients`);
      } catch (reportErr) {
        logger.error(`Scheduled report failed: ${report.id}`, reportErr);
      }
    }
  } catch (err) {
    logger.error('Scheduled reports processing failed', err);
  }
}

/**
 * Re-verify domain ownership periodically.
 * Runs once per day — checks that all verified targets still have their
 * verification token (DNS TXT or HTTP file) in place.
 */
async function processReVerifyDomains() {
  const now = new Date();

  // Only run once per 24 hours
  if (lastReverifyRun && (now.getTime() - lastReverifyRun.getTime()) < 23 * 60 * 60 * 1000) return;

  lastReverifyRun = now;
  logger.info('🔄 Re-verify domains: Starting daily check');

  try {
    const verifiedTargets = await prisma.target.findMany({
      where: {
        isActive: true,
        verificationStatus: 'VERIFIED',
        type: 'DOMAIN',
      },
      select: {
        id: true,
        value: true,
        verificationToken: true,
        verificationMethod: true,
      },
    });

    if (verifiedTargets.length === 0) return;

    let lostCount = 0;
    for (const target of verifiedTargets) {
      try {
        const verified = await quickVerifyCheck(target);
        if (!verified) {
          lostCount++;
          await prisma.target.update({
            where: { id: target.id },
            data: {
              verificationStatus: 'PENDING',
            },
          });
          logger.warn(`🔄 Re-verify: ${target.value} lost verification, status set to PENDING`);
        }
      } catch {
        // Don't fail the entire batch
      }
    }

    logger.info(`🔄 Re-verify completed: ${verifiedTargets.length} checked, ${lostCount} lost`);
  } catch (err) {
    logger.error('Re-verify domains failed', err);
  }
}

/**
 * Quick check if a target still passes verification.
 * Tries DNS TXT and HTTP file methods.
 */
async function quickVerifyCheck(target: {
  value: string;
  verificationToken: string | null;
  verificationMethod: string | null;
}): Promise<boolean> {
  if (!target.verificationToken) return true; // No token, skip

  const token = target.verificationToken;

  // Try DNS TXT check — subdomain first, then root domain fallback
  try {
    const dns = await import('dns').then((m) => m.promises);
    // Standard: _vulnscan-verify.<domain>
    const records = await dns.resolveTxt(`_vulnscan-verify.${target.value}`);
    const flat = records.flat();
    if (flat.some((r) => r.includes(token))) return true;
  } catch {
    // Subdomain DNS check failed (may be wildcard CNAME), try root domain
  }

  // Fallback: check root domain TXT records (handles wildcard CNAME conflicts)
  try {
    const dns = await import('dns').then((m) => m.promises);
    const records = await dns.resolveTxt(target.value);
    const flat = records.flat();
    if (flat.some((r) => r.includes(token))) return true;
  } catch {
    // Root DNS check also failed, try HTTP
  }

  // Try HTTP file check
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://${target.value}/.well-known/vulnscan-verify.txt`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const body = await resp.text();
      if (body.trim().includes(token)) return true;
    }
  } catch {
    // HTTP check failed too
  }

  // Try HTTP on port 80
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`http://${target.value}/.well-known/vulnscan-verify.txt`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const body = await resp.text();
      if (body.trim().includes(token)) return true;
    }
  } catch {
    // All methods failed
  }

  return false;
}

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
    processWeeklyDigest().catch((err) => {
      logger.error('Scheduler: Weekly digest tick failed', err);
    });
    processReVerifyDomains().catch((err) => {
      logger.error('Scheduler: Re-verify domains tick failed', err);
    });
    processScheduledReports().catch((err) => {
      logger.error('Scheduler: Scheduled reports tick failed', err);
    });
    // Data retention runs once per day
    const now = new Date();
    if (!lastDataRetentionRun || (now.getTime() - lastDataRetentionRun.getTime()) > 23 * 60 * 60 * 1000) {
      lastDataRetentionRun = now;
      processDataRetention().catch((err) => {
        logger.error('Scheduler: Data retention tick failed', err);
      });
    }
  }, 60 * 1000);
}

export function stopScanScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('📅 Scan scheduler stopped');
  }
}

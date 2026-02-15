import { Worker, Job } from 'bullmq';
import { redis } from '@config/redis';
import { prisma } from '@config/database';
import { logger } from '@utils/logger';
import { sendEmail, securityAlertEmailHtml } from '@utils/email';
import { emitScanCompleted, emitScanFailed, emitScanProgress, emitNotification } from '../socket';
import { webhooksService } from '../modules/webhooks/webhooks.service';
import { env } from '@config/env';

interface ScanJobData {
  scanId: string;
  targetId: string;
  targetValue: string;
  profile: string;
  orgId?: string;
  modules?: string[];
  scanConfig?: {
    excludePaths?: string[];
    maxConcurrent?: number;
    requestDelay?: number;
  };
}

/**
 * Maps scanner VulnCategory values to Prisma enum values.
 * Acts as a safety-net for any legacy or unmapped categories.
 */
const CATEGORY_MAP: Record<string, string> = {
  // Direct matches (Prisma enum values)
  SQL_INJECTION: 'SQL_INJECTION',
  XSS_REFLECTED: 'XSS_REFLECTED',
  XSS_STORED: 'XSS_STORED',
  SSRF: 'SSRF',
  LFI: 'LFI',
  RFI: 'RFI',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  OPEN_REDIRECT: 'OPEN_REDIRECT',
  CSRF: 'CSRF',
  IDOR: 'IDOR',
  CORS_MISCONFIG: 'CORS_MISCONFIG',
  SECURITY_HEADERS: 'SECURITY_HEADERS',
  SSL_TLS: 'SSL_TLS',
  CERT_ISSUE: 'CERT_ISSUE',
  INFO_DISCLOSURE: 'INFO_DISCLOSURE',
  DIRECTORY_LISTING: 'DIRECTORY_LISTING',
  SENSITIVE_FILE: 'SENSITIVE_FILE',
  OUTDATED_SOFTWARE: 'OUTDATED_SOFTWARE',
  DEFAULT_CREDENTIALS: 'DEFAULT_CREDENTIALS',
  EMAIL_SECURITY: 'EMAIL_SECURITY',
  COOKIE_SECURITY: 'COOKIE_SECURITY',
  HTTP_METHODS: 'HTTP_METHODS',
  OTHER: 'OTHER',
  // Legacy fallback mappings (in case old scanner sends broad categories)
  WEB: 'OTHER',
  NETWORK: 'OTHER',
  DNS: 'OTHER',
  CONFIGURATION: 'SECURITY_HEADERS',
  INFORMATION_DISCLOSURE: 'INFO_DISCLOSURE',
};

function mapCategory(category: string): string {
  return CATEGORY_MAP[category] || 'OTHER';
}

/**
 * BullMQ worker that processes scan jobs.
 * In the full implementation, this worker dispatches scan tasks 
 * to the Python scanner engine via Redis pub/sub or Celery.
 */
const scanWorker = new Worker<ScanJobData>(
  'scan',
  async (job: Job<ScanJobData>) => {
    const { scanId, targetValue, profile, orgId, modules, scanConfig } = job.data;
    const log = logger.child({ scanId, target: targetValue, profile });
    
    log.info('Processing scan job');

    try {
      // Update scan status to RUNNING
      await prisma.scan.update({
        where: { id: scanId },
        data: { 
          status: 'RUNNING',
          startedAt: new Date(),
          progress: 0,
        },
      });

      // Publish scan task to Redis for the Python scanner to pick up
      const scanTask = JSON.stringify({
        scanId,
        target: targetValue,
        profile,
        orgId,
        modules,
        scanConfig,
      });
      
      await redis.publish('scanner:tasks', scanTask);
      log.info('Scan task published to scanner engine');

      // The Python scanner will process the scan and publish results back
      // via Redis pub/sub. The results are consumed by a subscriber 
      // (see below) that updates the database.

    } catch (error) {
      log.error('Scan job failed', { error });

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  },
  {
    connection: {
      host: redis.options.host || 'localhost',
      port: redis.options.port || 6379,
    },
    concurrency: 5,
  }
);

scanWorker.on('completed', (job) => {
  logger.info(`Scan job ${job.id} completed`, { scanId: job.data.scanId });
});

scanWorker.on('failed', (job, err) => {
  logger.error(`Scan job ${job?.id} failed`, { error: err.message });
});

/**
 * Subscribe to scan results from the Python scanner engine.
 * Updates database with discovered assets and findings.
 */
async function subscribeScanResults() {
  const subscriber = redis.duplicate();
  
  await subscriber.subscribe('scanner:results', (err) => {
    if (err) {
      logger.error('Failed to subscribe to scanner results', { error: err.message });
    } else {
      logger.info('Subscribed to scanner:results channel');
    }
  });

  subscriber.on('message', async (_channel: string, message: string) => {
    try {
      const result = JSON.parse(message);
      const { scanId, status, assets, findings, summary, error } = result;
      
      const log = logger.child({ scanId });

      if (status === 'PROGRESS') {
        // Update progress
        await prisma.scan.update({
          where: { id: scanId },
          data: { progress: result.progress },
        });
        emitScanProgress(scanId, {
          progress: result.progress,
          currentModule: result.currentModule,
          message: result.message,
        });
        return;
      }

      if (status === 'COMPLETED') {
        log.info('Scan completed, saving results');

        // Get the scan record
        const scan = await prisma.scan.findUnique({
          where: { id: scanId },
          include: { target: true },
        });

        if (!scan) {
          log.warn('Scan not found');
          return;
        }

        // Save assets
        if (assets && assets.length > 0) {
          for (const a of assets) {
            try {
              await prisma.asset.upsert({
                where: {
                  targetId_type_value: {
                    targetId: scan.targetId,
                    type: a.type,
                    value: a.value,
                  },
                },
                create: {
                  targetId: scan.targetId,
                  type: a.type,
                  value: a.value,
                  ip: a.ip || null,
                  technologies: a.metadata?.technologies || null,
                  dnsRecords: a.metadata?.dnsRecords || null,
                  sslInfo: a.metadata?.sslInfo || null,
                  firstSeenAt: new Date(),
                  lastSeenAt: new Date(),
                },
                update: {
                  lastSeenAt: new Date(),
                  ip: a.ip || undefined,
                },
              });
            } catch (assetErr) {
              log.warn('Failed to save asset', { value: a.value, error: assetErr instanceof Error ? assetErr.message : 'Unknown' });
            }
          }
        }

        // Save findings  
        if (findings && findings.length > 0) {
          await prisma.vulnFinding.createMany({
            data: findings.map((f: any) => ({
              scanId: scan.id,
              title: f.title,
              severity: f.severity,
              category: mapCategory(f.category),
              description: f.description || '',
              remediation: f.solution || f.remediation || null,
              cveId: f.cveId || null,
              cvssScore: f.cvssScore || null,
              affectedUrl: f.affectedComponent || f.affectedUrl || null,
              evidence: f.evidence ? (typeof f.evidence === 'string' ? { raw: f.evidence } : f.evidence) : null,
              references: f.references || [],
              status: 'OPEN',
            })),
          });
        }

        // Save scan result summary
        await prisma.scanResult.create({
          data: {
            scanId: scan.id,
            module: 'all',
            status: 'COMPLETED',
            rawOutput: result,
            startedAt: scan.startedAt || new Date(),
            completedAt: new Date(),
          },
        });

        // Update scan status with counts
        const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const f of (findings || [])) {
          const sev = (f.severity || '').toLowerCase();
          if (sev in severityCounts) severityCounts[sev as keyof typeof severityCounts]++;
        }

        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            progress: 100,
            totalAssets: assets?.length || 0,
            totalVulns: findings?.length || 0,
            criticalCount: severityCounts.critical,
            highCount: severityCounts.high,
            mediumCount: severityCounts.medium,
            lowCount: severityCounts.low,
            infoCount: severityCounts.info,
            duration: scan.startedAt ? Math.round((Date.now() - scan.startedAt.getTime()) / 1000) : null,
          },
        });

        log.info('Scan results saved', {
          assets: assets?.length || 0,
          findings: findings?.length || 0,
        });

        // Emit WebSocket events
        emitScanCompleted(scanId, {
          assetsFound: assets?.length || 0,
          vulnsFound: findings?.length || 0,
        });

        // Dispatch webhooks
        try {
          await webhooksService.dispatch(scan.target.orgId, 'scan.completed', {
            scanId, targetValue: scan.target.value,
            assetsFound: assets?.length || 0, vulnsFound: findings?.length || 0,
            criticalCount: severityCounts.critical, highCount: severityCounts.high,
          });
          if (severityCounts.critical > 0) {
            await webhooksService.dispatch(scan.target.orgId, 'vulnerability.critical', {
              scanId, targetValue: scan.target.value, count: severityCounts.critical,
            });
          }
          if (severityCounts.high > 0) {
            await webhooksService.dispatch(scan.target.orgId, 'vulnerability.high', {
              scanId, targetValue: scan.target.value, count: severityCounts.high,
            });
          }
        } catch (whErr) {
          log.warn('Webhook dispatch failed', { error: whErr instanceof Error ? whErr.message : 'Unknown' });
        }

        // Notify users about critical/high severity findings
        const criticalFindings = (findings || []).filter(
          (f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
        );

        if (criticalFindings.length > 0) {
          try {
            // Get org members to notify
            const orgMembers = await prisma.orgMember.findMany({
              where: { orgId: scan.target.orgId },
              include: { user: { select: { id: true, name: true, email: true } } },
            });

            const targetValue = scan.target?.value || 'Unknown target';
            const dashboardUrl = `${env.CLIENT_URL}/dashboard/vulnerabilities`;

            for (const member of orgMembers) {
              // Create in-app notification
              await prisma.notification.create({
                data: {
                  userId: member.user.id,
                  type: 'SCAN_COMPLETED',
                  title: `🚨 ${criticalFindings.length} Critical/High findings on ${targetValue}`,
                  message: `A scan discovered ${criticalFindings.length} critical or high severity vulnerability(s) on ${targetValue}.`,
                  data: { scanId, targetValue, count: criticalFindings.length },
                },
              });

              // Emit real-time notification
              emitNotification(member.user.id, {
                type: 'SCAN_COMPLETED',
                title: `🚨 ${criticalFindings.length} Critical/High findings on ${targetValue}`,
                message: `Review and remediate these findings as soon as possible.`,
              });

              // Send email alert
              try {
                await sendEmail({
                  to: member.user.email,
                  subject: `[${env.APP_NAME}] Security Alert: ${criticalFindings.length} Critical/High findings on ${targetValue}`,
                  html: securityAlertEmailHtml(
                    member.user.name,
                    targetValue,
                    criticalFindings.slice(0, 10).map((f: any) => ({
                      title: f.title,
                      severity: f.severity,
                      category: mapCategory(f.category),
                    })),
                    dashboardUrl,
                  ),
                });
              } catch (emailErr) {
                log.warn('Failed to send alert email', {
                  userId: member.user.id,
                  error: emailErr instanceof Error ? emailErr.message : 'Unknown',
                });
              }
            }
          } catch (notifyErr) {
            log.warn('Failed to send notifications', {
              error: notifyErr instanceof Error ? notifyErr.message : 'Unknown',
            });
          }
        }

      } else if (status === 'FAILED') {
        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error || 'Scanner engine error',
          },
        });
        emitScanFailed(scanId, error || 'Scanner engine error');
        log.error('Scan failed', { error });
      }

    } catch (err) {
      logger.error('Error processing scan result', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  });
}

export { scanWorker, subscribeScanResults };

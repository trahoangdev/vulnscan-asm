import { Worker, Job } from 'bullmq';
import { redis } from '@config/redis';
import { prisma } from '@config/database';
import { logger } from '@utils/logger';

interface ScanJobData {
  scanId: string;
  targetId: string;
  targetValue: string;
  profile: string;
  orgId: string;
}

/**
 * BullMQ worker that processes scan jobs.
 * In the full implementation, this worker dispatches scan tasks 
 * to the Python scanner engine via Redis pub/sub or Celery.
 */
const scanWorker = new Worker<ScanJobData>(
  'scan',
  async (job: Job<ScanJobData>) => {
    const { scanId, targetValue, profile, orgId } = job.data;
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
          await prisma.asset.createMany({
            data: assets.map((a: any) => ({
              targetId: scan.targetId,
              type: a.type,
              value: a.value,
              metadata: a.metadata || {},
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }

        // Save findings  
        if (findings && findings.length > 0) {
          await prisma.vulnFinding.createMany({
            data: findings.map((f: any) => ({
              scanId: scan.id,
              targetId: scan.targetId,
              orgId: scan.orgId,
              title: f.title,
              severity: f.severity,
              category: f.category,
              description: f.description,
              solution: f.solution || '',
              cveId: f.cveId,
              cvssScore: f.cvssScore,
              affectedComponent: f.affectedComponent,
              evidence: f.evidence || '',
              references: f.references || [],
              status: 'OPEN',
            })),
          });
        }

        // Save scan result
        await prisma.scanResult.create({
          data: {
            scanId: scan.id,
            resultData: result,
            assetsFound: assets?.length || 0,
            vulnsFound: findings?.length || 0,
          },
        });

        // Update scan status
        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            progress: 100,
          },
        });

        log.info('Scan results saved', {
          assets: assets?.length || 0,
          findings: findings?.length || 0,
        });

      } else if (status === 'FAILED') {
        await prisma.scan.update({
          where: { id: scanId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error || 'Scanner engine error',
          },
        });
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

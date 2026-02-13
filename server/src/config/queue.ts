import { Queue, Worker, QueueEvents } from 'bullmq';
import { env } from './env';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

// Queue definitions
export const scanQueue = new Queue('scan', { connection });
export const discoveryQueue = new Queue('discovery', { connection });
export const reportQueue = new Queue('report', { connection });
export const notificationQueue = new Queue('notification', { connection });

// Queue Events
export const scanQueueEvents = new QueueEvents('scan', { connection });

export { connection as queueConnection };
export { Queue, Worker, QueueEvents };

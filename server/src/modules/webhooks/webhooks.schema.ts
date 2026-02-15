import { z } from 'zod';

export const WEBHOOK_EVENTS = [
  'scan.completed',
  'scan.failed',
  'vulnerability.critical',
  'vulnerability.high',
  'asset.discovered',
  'report.ready',
] as const;

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Must be a valid URL'),
  secret: z.string().max(256).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Select at least one event'),
  headers: z.record(z.string()).optional(),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  secret: z.string().max(256).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

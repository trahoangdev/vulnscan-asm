import { z } from 'zod';

export const scanConfigSchema = z.object({
  excludePaths: z.array(z.string()).optional(),
  maxConcurrent: z.number().min(1).max(10).optional(),
  requestDelay: z.number().min(0).max(5000).optional(),
}).optional();

export const createScanSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  profile: z.enum(['QUICK', 'STANDARD', 'DEEP', 'CUSTOM']).default('STANDARD'),
  modules: z.array(z.string()).optional(),
  scanConfig: scanConfigSchema,
});

export const cancelScanSchema = z.object({
  reason: z.string().optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

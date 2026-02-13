import { z } from 'zod';

export const createScanSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  profile: z.enum(['QUICK', 'STANDARD', 'DEEP', 'CUSTOM']).default('STANDARD'),
  modules: z.array(z.string()).optional(),
});

export const cancelScanSchema = z.object({
  reason: z.string().optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

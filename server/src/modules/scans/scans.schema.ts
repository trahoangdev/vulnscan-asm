import { z } from 'zod';

export const exclusionRuleSchema = z.object({
  type: z.enum(['path', 'subdomain', 'port', 'regex', 'ip_range']),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const scanConfigSchema = z.object({
  excludePaths: z.array(z.string()).optional(),
  excludeSubdomains: z.array(z.string()).optional(),
  excludePorts: z.array(z.number().min(1).max(65535)).optional(),
  excludeModules: z.array(z.string()).optional(),
  exclusionRules: z.array(exclusionRuleSchema).max(50).optional(),
  maxConcurrent: z.number().min(1).max(10).optional(),
  requestDelay: z.number().min(0).max(5000).optional(),
  maxDepth: z.number().min(1).max(20).optional(),
  timeout: z.number().min(5000).max(600000).optional(),
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

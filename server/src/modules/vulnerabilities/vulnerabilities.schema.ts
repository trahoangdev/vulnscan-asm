import { z } from 'zod';

export const updateVulnStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value',
  }),
  notes: z.string().max(1000).optional(),
});

export const listVulnerabilitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE']).optional(),
  category: z.string().optional(),
  targetId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const vulnIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid vulnerability ID' }),
});

import { z } from 'zod';

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  targetId: z.string().uuid().optional(),
  type: z.enum(['DOMAIN', 'SUBDOMAIN', 'IP', 'URL', 'SERVICE']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const assetIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid asset ID' }),
});

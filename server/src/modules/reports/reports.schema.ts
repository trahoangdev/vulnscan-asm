import { z } from 'zod';

export const generateReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['EXECUTIVE_SUMMARY', 'TECHNICAL_DETAIL', 'COMPLIANCE_OWASP', 'COMPLIANCE_PCI', 'ASSET_INVENTORY', 'CUSTOM'], {
    required_error: 'Report type is required',
  }),
  format: z.enum(['PDF', 'HTML', 'CSV', 'JSON']).optional().default('PDF'),
  targetIds: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  includeSeverities: z.array(
    z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  ).optional(),
});

export const reportIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid report ID' }),
});

import { z } from 'zod';
import { VALIDATION } from '../../../../shared/constants/index';

export const createTargetSchema = z.object({
  type: z.enum(['DOMAIN', 'IP', 'CIDR']).default('DOMAIN'),
  value: z.string().min(1, 'Target value is required').max(255),
  label: z.string().max(VALIDATION.TARGET_LABEL_MAX_LENGTH).optional(),
  scanProfile: z.enum(['QUICK', 'STANDARD', 'DEEP', 'CUSTOM']).default('STANDARD'),
  tags: z.array(z.string().max(VALIDATION.TAG_MAX_LENGTH)).max(VALIDATION.TAGS_MAX_COUNT).optional().default([]),
  notes: z.string().max(VALIDATION.NOTES_MAX_LENGTH).optional(),
});

export const updateTargetSchema = z.object({
  label: z.string().max(VALIDATION.TARGET_LABEL_MAX_LENGTH).optional(),
  scanProfile: z.enum(['QUICK', 'STANDARD', 'DEEP', 'CUSTOM']).optional(),
  tags: z.array(z.string().max(VALIDATION.TAG_MAX_LENGTH)).max(VALIDATION.TAGS_MAX_COUNT).optional(),
  notes: z.string().max(VALIDATION.NOTES_MAX_LENGTH).optional(),
});

export const verifyTargetSchema = z.object({
  method: z.enum(['DNS_TXT', 'HTML_FILE', 'META_TAG']),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type VerifyTargetInput = z.infer<typeof verifyTargetSchema>;

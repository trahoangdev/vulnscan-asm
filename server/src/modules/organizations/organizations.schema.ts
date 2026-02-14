import { z } from 'zod';

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional().nullable(),
  billingEmail: z.string().email().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

export const setScheduleSchema = z.object({
  scanSchedule: z.enum(['daily', 'weekly', 'monthly']).nullable(),
  scanProfile: z.enum(['QUICK', 'STANDARD', 'DEEP']).optional(),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type SetScheduleInput = z.infer<typeof setScheduleSchema>;

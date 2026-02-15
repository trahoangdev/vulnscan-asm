import { z } from 'zod';

const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
} as const;

export const updateProfileSchema = z.object({
  name: z.string().min(VALIDATION.NAME_MIN_LENGTH).max(VALIDATION.NAME_MAX_LENGTH).optional(),
  avatar: z.string().url().optional().nullable(),
  timezone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH)
    .max(VALIDATION.PASSWORD_MAX_LENGTH)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const notificationPrefsSchema = z.object({
  emailCritical: z.boolean().optional(),
  emailHigh: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  scanCompleted: z.boolean().optional(),
  scanFailed: z.boolean().optional(),
  newVulnerability: z.boolean().optional(),
  certExpiring: z.boolean().optional(),
});

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;

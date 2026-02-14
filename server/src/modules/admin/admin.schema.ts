import { z } from 'zod';

// ===== User Management =====

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['createdAt', 'name', 'email', 'lastLoginAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    systemRole: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
    isActive: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({ id: z.string() }),
});

// ===== Organization Management =====

export const listOrgsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export const updateOrgSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(2).optional(),
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']).optional(),
    maxTargets: z.number().min(1).optional(),
    maxScansPerMonth: z.number().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const deleteOrgSchema = z.object({
  params: z.object({ id: z.string() }),
});

// ===== System Settings =====

export const updateSettingSchema = z.object({
  params: z.object({ key: z.string() }),
  body: z.object({
    value: z.any(),
    label: z.string().optional(),
  }),
});

export const batchUpdateSettingsSchema = z.object({
  body: z.object({
    settings: z.array(z.object({
      key: z.string(),
      value: z.any(),
      category: z.string().optional(),
      label: z.string().optional(),
    })),
  }),
});

// ===== Audit Logs =====

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    userId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

// ===== Type exports =====
export type ListUsersInput = z.infer<typeof listUsersSchema>['query'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListOrgsInput = z.infer<typeof listOrgsSchema>['query'];
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>['query'];

import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid notification ID' }),
});

import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination } from '../../utils/helpers';

export class NotificationsService {
  async list(userId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const where: any = { userId };
    if (query.unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Create a notification (called internally by services)
   */
  async create(data: {
    userId: string;
    type: any;
    title: string;
    message: string;
    data?: any;
  }) {
    return prisma.notification.create({ data });
  }
}

export const notificationsService = new NotificationsService();

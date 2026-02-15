import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination } from '../../utils/helpers';

export class AlertRulesService {
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const where: any = { orgId };
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [rules, total] = await Promise.all([
      prisma.alertRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      }),
      prisma.alertRule.count({ where }),
    ]);

    return { rules, total, page, limit };
  }

  async getById(orgId: string, ruleId: string) {
    const rule = await prisma.alertRule.findFirst({
      where: { id: ruleId, orgId },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    if (!rule) {
      throw ApiError.notFound('Alert rule not found');
    }

    return rule;
  }

  async create(
    orgId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      eventType: string;
      severityFilter?: string[];
      targetFilter?: string[];
      categoryFilter?: string[];
      threshold?: number;
      timeWindowMins?: number;
      channels?: string[];
      webhookUrl?: string;
      emailRecipients?: string[];
      slackChannel?: string;
    },
  ) {
    return prisma.alertRule.create({
      data: {
        orgId,
        createdById: userId,
        name: data.name,
        description: data.description,
        eventType: data.eventType as any,
        severityFilter: (data.severityFilter as any) || ['CRITICAL', 'HIGH'],
        targetFilter: data.targetFilter || [],
        categoryFilter: data.categoryFilter || [],
        threshold: data.threshold || 1,
        timeWindowMins: data.timeWindowMins || 60,
        channels: data.channels || ['in_app'],
        webhookUrl: data.webhookUrl,
        emailRecipients: data.emailRecipients || undefined,
        slackChannel: data.slackChannel,
      },
    });
  }

  async update(
    orgId: string,
    ruleId: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
      eventType?: string;
      severityFilter?: string[];
      targetFilter?: string[];
      categoryFilter?: string[];
      threshold?: number;
      timeWindowMins?: number;
      channels?: string[];
      webhookUrl?: string;
      emailRecipients?: string[];
      slackChannel?: string;
    },
  ) {
    const existing = await prisma.alertRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!existing) {
      throw ApiError.notFound('Alert rule not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.severityFilter !== undefined) updateData.severityFilter = data.severityFilter;
    if (data.targetFilter !== undefined) updateData.targetFilter = data.targetFilter;
    if (data.categoryFilter !== undefined) updateData.categoryFilter = data.categoryFilter;
    if (data.threshold !== undefined) updateData.threshold = data.threshold;
    if (data.timeWindowMins !== undefined) updateData.timeWindowMins = data.timeWindowMins;
    if (data.channels !== undefined) updateData.channels = data.channels;
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.emailRecipients !== undefined) updateData.emailRecipients = data.emailRecipients;
    if (data.slackChannel !== undefined) updateData.slackChannel = data.slackChannel;

    return prisma.alertRule.update({
      where: { id: ruleId },
      data: updateData,
    });
  }

  async delete(orgId: string, ruleId: string) {
    const existing = await prisma.alertRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!existing) {
      throw ApiError.notFound('Alert rule not found');
    }

    await prisma.alertRule.delete({ where: { id: ruleId } });
    return { message: 'Alert rule deleted' };
  }

  /**
   * Evaluate alert rules when an event occurs.
   * Called internally by scan completion, vuln creation, etc.
   */
  async evaluateRules(
    orgId: string,
    eventType: string,
    context: { severity?: string; targetId?: string; category?: string; count?: number },
  ) {
    const rules = await prisma.alertRule.findMany({
      where: {
        orgId,
        isActive: true,
        eventType: eventType as any,
      },
    });

    const triggered: string[] = [];

    for (const rule of rules) {
      // Check severity filter
      if (
        context.severity &&
        rule.severityFilter.length > 0 &&
        !rule.severityFilter.includes(context.severity as any)
      ) {
        continue;
      }

      // Check target filter
      if (
        context.targetId &&
        rule.targetFilter.length > 0 &&
        !rule.targetFilter.includes(context.targetId)
      ) {
        continue;
      }

      // Check category filter
      if (
        context.category &&
        rule.categoryFilter.length > 0 &&
        !rule.categoryFilter.includes(context.category)
      ) {
        continue;
      }

      // Check threshold
      const eventCount = context.count || 1;
      if (eventCount < rule.threshold) {
        continue;
      }

      // Rule triggered — create notifications for each channel
      triggered.push(rule.id);

      for (const channel of rule.channels) {
        if (channel === 'in_app') {
          // Create in-app notification for rule creator
          await prisma.notification.create({
            data: {
              userId: rule.createdById,
              type: 'SYSTEM',
              title: `Alert: ${rule.name}`,
              message: `Alert rule "${rule.name}" triggered for event ${eventType}`,
              data: { ruleId: rule.id, eventType, context },
              channel: 'in_app',
            },
          });
        }

        // Other channels (email, webhook, slack) would be handled by
        // the notification dispatcher — currently creates in_app as placeholder
      }

      // Update trigger tracking
      await prisma.alertRule.update({
        where: { id: rule.id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: { increment: 1 },
        },
      });
    }

    return { triggered };
  }
}

export const alertRulesService = new AlertRulesService();

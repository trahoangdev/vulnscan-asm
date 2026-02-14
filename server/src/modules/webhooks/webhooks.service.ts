import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination } from '../../utils/helpers';
import crypto from 'crypto';

export class WebhooksService {
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, name: true, url: true, events: true, headers: true,
          isActive: true, lastError: true, lastTriggeredAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.webhook.count({ where: { orgId } }),
    ]);

    return { webhooks, total, page, limit };
  }

  async getById(orgId: string, webhookId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId },
    });
    if (!webhook) throw ApiError.notFound('Webhook not found');
    return webhook;
  }

  async create(orgId: string, data: {
    name: string;
    url: string;
    secret?: string;
    events: string[];
    headers?: Record<string, string>;
  }) {
    const count = await prisma.webhook.count({ where: { orgId } });
    if (count >= 20) {
      throw ApiError.badRequest('Maximum 20 webhooks per organization');
    }

    return prisma.webhook.create({
      data: {
        orgId,
        name: data.name,
        url: data.url,
        secret: data.secret || null,
        events: data.events,
        headers: data.headers || null,
      },
    });
  }

  async update(orgId: string, webhookId: string, data: Record<string, any>) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId },
    });
    if (!webhook) throw ApiError.notFound('Webhook not found');

    return prisma.webhook.update({
      where: { id: webhookId },
      data,
    });
  }

  async delete(orgId: string, webhookId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId },
    });
    if (!webhook) throw ApiError.notFound('Webhook not found');

    await prisma.webhook.delete({ where: { id: webhookId } });
    return { deleted: true };
  }

  async test(orgId: string, webhookId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, orgId },
    });
    if (!webhook) throw ApiError.notFound('Webhook not found');

    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery from VulnScan ASM' },
    };

    return this.deliver(webhook, payload);
  }

  /**
   * Dispatch an event to all matching webhooks for an org
   */
  async dispatch(orgId: string, event: string, data: any) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        orgId,
        isActive: true,
        events: { has: event },
      },
    });

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const results = await Promise.allSettled(
      webhooks.map((wh) => this.deliver(wh, payload)),
    );

    return results.map((r, i) => ({
      webhookId: webhooks[i].id,
      status: r.status,
      error: r.status === 'rejected' ? (r.reason as Error).message : null,
    }));
  }

  /**
   * Deliver payload to a single webhook
   */
  private async deliver(webhook: any, payload: any): Promise<{ status: number; body: string }> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VulnScan-Webhook/1.0',
      ...(webhook.headers || {}),
    };

    // HMAC signature if secret is set
    if (webhook.secret) {
      const sig = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${sig}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const resBody = await res.text().catch(() => '');

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          lastError: res.ok ? null : `HTTP ${res.status}: ${resBody.slice(0, 200)}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}`);
      }

      return { status: res.status, body: resBody.slice(0, 500) };
    } catch (error: any) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          lastError: error.message?.slice(0, 500) || 'Unknown error',
        },
      }).catch(() => {}); // Don't fail if update fails

      throw error;
    }
  }
}

export const webhooksService = new WebhooksService();

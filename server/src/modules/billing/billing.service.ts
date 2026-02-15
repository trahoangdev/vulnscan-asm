/**
 * Polar.sh Billing Integration
 *
 * Handles:
 * - Customer creation/management via Polar.sh API
 * - Subscription (create, update, cancel)
 * - Checkout session creation
 * - Webhook processing for subscription events
 * - Plan limit enforcement
 *
 * @see https://polar.sh/docs/introduction
 */

import { Polar } from '@polar-sh/sdk';
import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') || 'sandbox',
});

// Plan → Polar Product IDs (set in env — create products in Polar dashboard)
const PLAN_PRODUCT_IDS: Record<string, string> = {
  STARTER: 'free',
  PROFESSIONAL: process.env.POLAR_PRODUCT_PRO || '',
  BUSINESS: process.env.POLAR_PRODUCT_BIZ || '',
  ENTERPRISE: process.env.POLAR_PRODUCT_ENT || '',
};

const PLAN_LIMITS: Record<string, { maxTargets: number; maxScansPerMonth: number }> = {
  STARTER: { maxTargets: 1, maxScansPerMonth: 10 },
  PROFESSIONAL: { maxTargets: 10, maxScansPerMonth: 100 },
  BUSINESS: { maxTargets: 50, maxScansPerMonth: 500 },
  ENTERPRISE: { maxTargets: 999, maxScansPerMonth: 9999 },
};

export class BillingService {
  /**
   * Get or create a Polar customer for an organization.
   */
  async getOrCreateCustomer(orgId: string): Promise<string> {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organization not found');

    if (org.polarCustomerId) {
      return org.polarCustomerId;
    }

    // Look up by external ID first, then create
    let customerId: string | null = null;

    try {
      const existing = await polar.customers.getExternal({ externalId: orgId });
      customerId = existing.id;
    } catch {
      // Customer not found by external ID — will create
    }

    if (!customerId) {
      const customer = await polar.customers.create({
        email: org.billingEmail || `org-${org.slug}@vulnscan.local`,
        name: org.name,
        externalId: org.id,
        metadata: { orgSlug: org.slug },
      });
      customerId = customer.id;
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: { polarCustomerId: customerId },
    });

    return customerId;
  }

  /**
   * Create a Polar Checkout session for plan upgrade.
   */
  async createCheckoutSession(orgId: string, plan: string, successUrl: string) {
    const productId = PLAN_PRODUCT_IDS[plan];
    if (!productId || productId === 'free') {
      throw ApiError.badRequest('Cannot checkout for free plan');
    }

    const customerId = await this.getOrCreateCustomer(orgId);

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerId,
      successUrl,
      metadata: { orgId, plan },
    });

    return {
      checkoutId: checkout.id,
      url: checkout.url,
    };
  }

  /**
   * Create a Polar Customer Portal session for managing billing.
   */
  async createPortalSession(orgId: string) {
    const customerId = await this.getOrCreateCustomer(orgId);

    const session = await polar.customerSessions.create({
      customerId,
    });

    return { token: session.token, customerPortalUrl: session.customerPortalUrl, customerId };
  }

  /**
   * Get current subscription status for an org.
   */
  async getSubscription(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organization not found');

    const result: any = {
      plan: org.plan,
      maxTargets: org.maxTargets,
      maxScansPerMonth: org.maxScansPerMonth,
      scansUsed: org.scansUsed,
      polarCustomerId: org.polarCustomerId,
      polarSubId: org.polarSubId,
      subscription: null,
    };

    if (org.polarSubId) {
      try {
        const sub = await polar.subscriptions.get({ id: org.polarSubId });
        result.subscription = {
          id: sub.id,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt,
          productId: sub.productId,
        };
      } catch {
        // Subscription may have been deleted
      }
    }

    return result;
  }

  /**
   * Cancel subscription at period end.
   */
  async cancelSubscription(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org?.polarSubId) {
      throw ApiError.badRequest('No active subscription');
    }

    await polar.subscriptions.update({
      id: org.polarSubId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });

    return { message: 'Subscription will be cancelled at the end of billing period' };
  }

  /**
   * Resume a cancelled (but not yet expired) subscription.
   */
  async resumeSubscription(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org?.polarSubId) {
      throw ApiError.badRequest('No subscription to resume');
    }

    await polar.subscriptions.update({
      id: org.polarSubId,
      subscriptionUpdate: { cancelAtPeriodEnd: false },
    });

    return { message: 'Subscription resumed' };
  }

  /**
   * Process Polar webhook events.
   * @see https://polar.sh/docs/integrate/webhooks/events
   */
  async handleWebhook(event: { type: string; data: any }) {
    const log = logger.child({ polarEvent: event.type });

    switch (event.type) {
      case 'checkout.updated': {
        const checkout = event.data;
        if (checkout.status !== 'succeeded') break;

        const orgId = checkout.metadata?.orgId;
        const plan = checkout.metadata?.plan;

        if (orgId && plan) {
          const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.STARTER;

          // Find the subscription from the checkout
          const subId = checkout.subscriptionId || checkout.subscription_id || null;

          await prisma.organization.update({
            where: { id: orgId },
            data: {
              plan: plan as any,
              polarSubId: subId,
              maxTargets: limits.maxTargets,
              maxScansPerMonth: limits.maxScansPerMonth,
            },
          });
          log.info('Checkout succeeded — plan upgraded', { orgId, plan });
        }
        break;
      }

      case 'subscription.updated': {
        const sub = event.data;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          log.info('Subscription updated', { orgId, status: sub.status });
        }
        break;
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        const sub = event.data;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          // Only downgrade if subscription is fully revoked
          if (event.type === 'subscription.revoked') {
            const limits = PLAN_LIMITS.STARTER;
            await prisma.organization.update({
              where: { id: orgId },
              data: {
                plan: 'STARTER',
                polarSubId: null,
                maxTargets: limits.maxTargets,
                maxScansPerMonth: limits.maxScansPerMonth,
              },
            });
            log.info('Subscription revoked — downgraded to STARTER', { orgId });
          } else {
            log.info('Subscription canceled (pending period end)', { orgId });
          }
        }
        break;
      }

      case 'order.paid': {
        const order = event.data;
        log.info('Order paid', {
          orderId: order.id,
          customerId: order.customerId || order.customer_id,
          amount: order.amount,
        });
        break;
      }

      default:
        log.debug('Unhandled Polar event', { type: event.type });
    }
  }
}

export const billingService = new BillingService();

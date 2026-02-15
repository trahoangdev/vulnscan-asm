import { Request, Response, NextFunction } from 'express';
import { validateEvent } from '@polar-sh/sdk/webhooks';
import { billingService } from './billing.service';
import { ApiResponse } from '../../utils/ApiResponse';

export class BillingController {
  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await billingService.getSubscription(orgId);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const { plan, successUrl } = req.body;
      const result = await billingService.createCheckoutSession(
        orgId,
        plan,
        successUrl || `${process.env.CLIENT_URL}/dashboard/billing?status=success`,
      );
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async createPortal(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await billingService.createPortalSession(orgId);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await billingService.cancelSubscription(orgId);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async resumeSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const result = await billingService.resumeSubscription(orgId);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  /**
   * Polar.sh webhook endpoint — raw body required for signature verification.
   * @see https://polar.sh/docs/integrate/webhooks/delivery
   */
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || '';
      const body = (req as any).rawBody || req.body;

      let event: { type: string; data: any };

      try {
        event = validateEvent(
          typeof body === 'string' ? body : body.toString('utf8'),
          Object.fromEntries(
            Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || '']),
          ) as Record<string, string>,
          webhookSecret,
        ) as { type: string; data: any };
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }

      await billingService.handleWebhook(event);
      return res.json({ received: true });
    } catch (error) { next(error); }
  }
}

export const billingController = new BillingController();

/**
 * Tests for BillingService (Polar.sh)
 * - getOrCreateCustomer
 * - createCheckoutSession
 * - getSubscription
 * - cancelSubscription / resumeSubscription
 * - handleWebhook processing
 */

// Set env vars before import
process.env.POLAR_ACCESS_TOKEN = 'polar_oat_test';
process.env.POLAR_SERVER = 'sandbox';
process.env.POLAR_PRODUCT_PRO = 'prod_pro_test';
process.env.POLAR_PRODUCT_BIZ = 'prod_biz_test';
process.env.POLAR_PRODUCT_ENT = 'prod_ent_test';

// Mock Polar SDK globally before importing the service
const mockCustomersCreate = jest.fn();
const mockCustomersGetExternal = jest.fn();
const mockCheckoutsCreate = jest.fn();
const mockCustomerSessionsCreate = jest.fn();
const mockSubscriptionsGet = jest.fn();
const mockSubscriptionsUpdate = jest.fn();

jest.mock('@polar-sh/sdk', () => ({
  Polar: jest.fn().mockImplementation(() => ({
    customers: {
      create: mockCustomersCreate,
      getExternal: mockCustomersGetExternal,
    },
    checkouts: { create: mockCheckoutsCreate },
    customerSessions: { create: mockCustomerSessionsCreate },
    subscriptions: {
      get: mockSubscriptionsGet,
      update: mockSubscriptionsUpdate,
    },
  })),
}));

// Mock Prisma
const mockOrgFindUnique = jest.fn();
const mockOrgUpdate = jest.fn();

jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {
    organization: {
      findUnique: (...args: any[]) => mockOrgFindUnique(...args),
      update: (...args: any[]) => mockOrgUpdate(...args),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

import { BillingService } from '../billing.service';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    service = new BillingService();
    jest.clearAllMocks();
  });

  // ── getOrCreateCustomer ─────────────────────────────
  describe('getOrCreateCustomer', () => {
    it('should return existing polarCustomerId', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org1',
        name: 'Test Org',
        polarCustomerId: 'polar_cus_existing123',
      });

      const result = await service.getOrCreateCustomer('org1');
      expect(result).toBe('polar_cus_existing123');
      expect(mockCustomersCreate).not.toHaveBeenCalled();
    });

    it('should create a new Polar customer when none exists', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org2',
        name: 'New Org',
        slug: 'new-org',
        billingEmail: 'billing@example.com',
        polarCustomerId: null,
      });
      mockCustomersGetExternal.mockRejectedValue(new Error('Not found'));
      mockCustomersCreate.mockResolvedValue({ id: 'polar_cus_new456' });
      mockOrgUpdate.mockResolvedValue({});

      const result = await service.getOrCreateCustomer('org2');

      expect(result).toBe('polar_cus_new456');
      expect(mockCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Org',
          email: 'billing@example.com',
          externalId: 'org2',
          metadata: { orgSlug: 'new-org' },
        }),
      );
      expect(mockOrgUpdate).toHaveBeenCalledWith({
        where: { id: 'org2' },
        data: { polarCustomerId: 'polar_cus_new456' },
      });
    });

    it('should find existing Polar customer by externalId', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org3',
        name: 'Existing Org',
        slug: 'existing-org',
        billingEmail: 'b@example.com',
        polarCustomerId: null,
      });
      mockCustomersGetExternal.mockResolvedValue({ id: 'polar_cus_found789' });
      mockOrgUpdate.mockResolvedValue({});

      const result = await service.getOrCreateCustomer('org3');

      expect(result).toBe('polar_cus_found789');
      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockOrgUpdate).toHaveBeenCalledWith({
        where: { id: 'org3' },
        data: { polarCustomerId: 'polar_cus_found789' },
      });
    });

    it('should throw 404 for non-existent org', async () => {
      mockOrgFindUnique.mockResolvedValue(null);
      await expect(service.getOrCreateCustomer('bad')).rejects.toThrow(
        'Organization not found',
      );
    });
  });

  // ── createCheckoutSession ───────────────────────────
  describe('createCheckoutSession', () => {
    it('should reject free plan checkout', async () => {
      await expect(
        service.createCheckoutSession('org1', 'STARTER', 'http://ok'),
      ).rejects.toThrow('Cannot checkout for free plan');
    });

    it('should create checkout session for PROFESSIONAL plan', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org1',
        polarCustomerId: 'polar_cus_123',
      });
      mockCheckoutsCreate.mockResolvedValue({
        id: 'chk_123',
        url: 'https://polar.sh/checkout/test',
      });

      const result = await service.createCheckoutSession(
        'org1',
        'PROFESSIONAL',
        'http://success',
      );

      expect(result.checkoutId).toBe('chk_123');
      expect(result.url).toBe('https://polar.sh/checkout/test');
      expect(mockCheckoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'polar_cus_123',
          successUrl: 'http://success',
          metadata: { orgId: 'org1', plan: 'PROFESSIONAL' },
        }),
      );
    });
  });

  // ── createPortalSession ─────────────────────────────
  describe('createPortalSession', () => {
    it('should create a customer portal session', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org1',
        polarCustomerId: 'polar_cus_123',
      });
      mockCustomerSessionsCreate.mockResolvedValue({
        token: 'portal_token_abc',
        customerPortalUrl: 'https://polar.sh/portal/abc',
      });

      const result = await service.createPortalSession('org1');

      expect(result.token).toBe('portal_token_abc');
      expect(result.customerPortalUrl).toBe('https://polar.sh/portal/abc');
      expect(mockCustomerSessionsCreate).toHaveBeenCalledWith({
        customerId: 'polar_cus_123',
      });
    });
  });

  // ── getSubscription ─────────────────────────────────
  describe('getSubscription', () => {
    it('should return plan info with no subscription', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org1',
        plan: 'STARTER',
        maxTargets: 1,
        maxScansPerMonth: 10,
        scansUsed: 3,
        polarCustomerId: null,
        polarSubId: null,
      });

      const result = await service.getSubscription('org1');

      expect(result.plan).toBe('STARTER');
      expect(result.scansUsed).toBe(3);
      expect(result.subscription).toBeNull();
    });

    it('should retrieve Polar subscription when polarSubId exists', async () => {
      mockOrgFindUnique.mockResolvedValue({
        id: 'org1',
        plan: 'PROFESSIONAL',
        maxTargets: 10,
        maxScansPerMonth: 100,
        scansUsed: 22,
        polarCustomerId: 'polar_cus_1',
        polarSubId: 'polar_sub_1',
      });
      mockSubscriptionsGet.mockResolvedValue({
        id: 'polar_sub_1',
        status: 'active',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        canceledAt: null,
        productId: 'prod_pro',
      });

      const result = await service.getSubscription('org1');

      expect(result.plan).toBe('PROFESSIONAL');
      expect(result.subscription).not.toBeNull();
      expect(result.subscription.status).toBe('active');
      expect(result.subscription.cancelAtPeriodEnd).toBe(false);
      expect(result.subscription.productId).toBe('prod_pro');
    });
  });

  // ── cancelSubscription ──────────────────────────────
  describe('cancelSubscription', () => {
    it('should throw when no subscription exists', async () => {
      mockOrgFindUnique.mockResolvedValue({ id: 'org1', polarSubId: null });
      await expect(service.cancelSubscription('org1')).rejects.toThrow(
        'No active subscription',
      );
    });

    it('should set cancelAtPeriodEnd on subscription', async () => {
      mockOrgFindUnique.mockResolvedValue({ id: 'org1', polarSubId: 'polar_sub_1' });
      mockSubscriptionsUpdate.mockResolvedValue({});

      const result = await service.cancelSubscription('org1');

      expect(result.message).toContain('cancelled');
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith({
        id: 'polar_sub_1',
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      });
    });
  });

  // ── resumeSubscription ──────────────────────────────
  describe('resumeSubscription', () => {
    it('should throw when no subscription exists', async () => {
      mockOrgFindUnique.mockResolvedValue({ id: 'org1', polarSubId: null });
      await expect(service.resumeSubscription('org1')).rejects.toThrow(
        'No subscription to resume',
      );
    });

    it('should re-enable subscription', async () => {
      mockOrgFindUnique.mockResolvedValue({ id: 'org1', polarSubId: 'polar_sub_1' });
      mockSubscriptionsUpdate.mockResolvedValue({});

      const result = await service.resumeSubscription('org1');

      expect(result.message).toContain('resumed');
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith({
        id: 'polar_sub_1',
        subscriptionUpdate: { cancelAtPeriodEnd: false },
      });
    });
  });

  // ── handleWebhook ───────────────────────────────────
  describe('handleWebhook', () => {
    it('should upgrade plan on checkout.updated (succeeded)', async () => {
      mockOrgUpdate.mockResolvedValue({});

      await service.handleWebhook({
        type: 'checkout.updated',
        data: {
          status: 'succeeded',
          metadata: { orgId: 'org1', plan: 'BUSINESS' },
          subscriptionId: 'polar_sub_new',
        },
      });

      expect(mockOrgUpdate).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: expect.objectContaining({
          plan: 'BUSINESS',
          polarSubId: 'polar_sub_new',
          maxTargets: 50,
          maxScansPerMonth: 500,
        }),
      });
    });

    it('should NOT upgrade on checkout.updated when status is not succeeded', async () => {
      await service.handleWebhook({
        type: 'checkout.updated',
        data: {
          status: 'pending',
          metadata: { orgId: 'org1', plan: 'BUSINESS' },
        },
      });

      expect(mockOrgUpdate).not.toHaveBeenCalled();
    });

    it('should downgrade to STARTER on subscription.revoked', async () => {
      mockOrgUpdate.mockResolvedValue({});

      await service.handleWebhook({
        type: 'subscription.revoked',
        data: { metadata: { orgId: 'org1' } },
      });

      expect(mockOrgUpdate).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: expect.objectContaining({
          plan: 'STARTER',
          polarSubId: null,
          maxTargets: 1,
          maxScansPerMonth: 10,
        }),
      });
    });

    it('should NOT downgrade on subscription.canceled (pending period end)', async () => {
      await service.handleWebhook({
        type: 'subscription.canceled',
        data: { metadata: { orgId: 'org1' } },
      });

      expect(mockOrgUpdate).not.toHaveBeenCalled();
    });

    it('should handle order.paid without throwing', async () => {
      await expect(
        service.handleWebhook({
          type: 'order.paid',
          data: { id: 'order_1', customerId: 'cus_1', amount: 4900 },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle unknown event type gracefully', async () => {
      await expect(
        service.handleWebhook({
          type: 'customer.created',
          data: {},
        }),
      ).resolves.not.toThrow();
    });
  });
});

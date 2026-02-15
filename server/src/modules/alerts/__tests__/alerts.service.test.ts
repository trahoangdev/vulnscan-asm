/**
 * Tests for AlertRulesService
 * - CRUD operations
 * - evaluateRules logic (severity/target/category filtering, threshold)
 */

import { AlertRulesService } from '../alerts.service';

// ── Mock Prisma ──────────────────────────────────────────────
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockNotifCreate = jest.fn();

jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: {
    alertRule: {
      findMany: (...args: any[]) => mockFindMany(...args),
      count: (...args: any[]) => mockCount(...args),
      findFirst: (...args: any[]) => mockFindFirst(...args),
      create: (...args: any[]) => mockCreate(...args),
      update: (...args: any[]) => mockUpdate(...args),
      delete: (...args: any[]) => mockDelete(...args),
    },
    notification: {
      create: (...args: any[]) => mockNotifCreate(...args),
    },
  },
}));

describe('AlertRulesService', () => {
  let service: AlertRulesService;

  beforeEach(() => {
    service = new AlertRulesService();
    jest.clearAllMocks();
  });

  // ── list() ─────────────────────────────────────────
  describe('list', () => {
    it('should return paginated alert rules', async () => {
      const mockRules = [
        { id: '1', name: 'Rule 1', orgId: 'org1', isActive: true },
        { id: '2', name: 'Rule 2', orgId: 'org1', isActive: true },
      ];
      mockFindMany.mockResolvedValue(mockRules);
      mockCount.mockResolvedValue(2);

      const result = await service.list('org1', { page: '1', limit: '10' });

      expect(result.rules).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await service.list('org1', { isActive: 'true' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org1', isActive: true },
        }),
      );
    });
  });

  // ── getById() ──────────────────────────────────────
  describe('getById', () => {
    it('should return a rule', async () => {
      const mockRule = { id: 'r1', name: 'Test Rule', orgId: 'org1' };
      mockFindFirst.mockResolvedValue(mockRule);

      const result = await service.getById('org1', 'r1');
      expect(result).toEqual(mockRule);
    });

    it('should throw 404 when rule not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(service.getById('org1', 'nonexistent')).rejects.toThrow(
        'Alert rule not found',
      );
    });
  });

  // ── create() ───────────────────────────────────────
  describe('create', () => {
    it('should create an alert rule with defaults', async () => {
      const createData = {
        name: 'New Vuln Alert',
        eventType: 'NEW_VULNERABILITY',
      };
      const expectedRule = { id: 'new1', ...createData };
      mockCreate.mockResolvedValue(expectedRule);

      const result = await service.create('org1', 'user1', createData);

      expect(result).toEqual(expectedRule);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: 'org1',
          createdById: 'user1',
          name: 'New Vuln Alert',
          eventType: 'NEW_VULNERABILITY',
          severityFilter: ['CRITICAL', 'HIGH'],
          threshold: 1,
          timeWindowMins: 60,
          channels: ['in_app'],
        }),
      });
    });

    it('should accept custom severity/category filters', async () => {
      mockCreate.mockResolvedValue({ id: 'new2' });

      await service.create('org1', 'user1', {
        name: 'Custom Rule',
        eventType: 'SCAN_COMPLETED',
        severityFilter: ['MEDIUM', 'LOW'],
        categoryFilter: ['XSS', 'SQL_INJECTION'],
        threshold: 5,
        timeWindowMins: 30,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severityFilter: ['MEDIUM', 'LOW'],
          categoryFilter: ['XSS', 'SQL_INJECTION'],
          threshold: 5,
          timeWindowMins: 30,
        }),
      });
    });
  });

  // ── update() ───────────────────────────────────────
  describe('update', () => {
    it('should update existing rule fields', async () => {
      mockFindFirst.mockResolvedValue({ id: 'r1', orgId: 'org1' });
      mockUpdate.mockResolvedValue({ id: 'r1', name: 'Updated' });

      const result = await service.update('org1', 'r1', { name: 'Updated', isActive: false });

      expect(result.name).toBe('Updated');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { name: 'Updated', isActive: false },
      });
    });

    it('should throw 404 for non-existent rule', async () => {
      mockFindFirst.mockResolvedValue(null);
      await expect(service.update('org1', 'bad', { name: 'x' })).rejects.toThrow(
        'Alert rule not found',
      );
    });
  });

  // ── delete() ───────────────────────────────────────
  describe('delete', () => {
    it('should delete existing rule', async () => {
      mockFindFirst.mockResolvedValue({ id: 'r1', orgId: 'org1' });
      mockDelete.mockResolvedValue({ id: 'r1' });

      const result = await service.delete('org1', 'r1');
      expect(result.message).toBe('Alert rule deleted');
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('should throw 404 for non-existent rule', async () => {
      mockFindFirst.mockResolvedValue(null);
      await expect(service.delete('org1', 'bad')).rejects.toThrow(
        'Alert rule not found',
      );
    });
  });

  // ── evaluateRules() ────────────────────────────────
  describe('evaluateRules', () => {
    const baseRule = {
      id: 'rule1',
      createdById: 'user1',
      channels: ['in_app'],
      severityFilter: ['CRITICAL', 'HIGH'],
      targetFilter: [],
      categoryFilter: [],
      threshold: 1,
      timeWindowMins: 60,
    };

    it('should trigger a rule matching all conditions', async () => {
      mockFindMany.mockResolvedValue([baseRule]);
      mockNotifCreate.mockResolvedValue({});
      mockUpdate.mockResolvedValue({});

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'CRITICAL',
      });

      expect(result.triggered).toContain('rule1');
      expect(mockNotifCreate).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ triggerCount: { increment: 1 } }),
        }),
      );
    });

    it('should skip rule when severity does not match filter', async () => {
      mockFindMany.mockResolvedValue([baseRule]); // filter = CRITICAL, HIGH

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'LOW',
      });

      expect(result.triggered).toHaveLength(0);
      expect(mockNotifCreate).not.toHaveBeenCalled();
    });

    it('should skip rule when target does not match filter', async () => {
      const ruleWithTarget = { ...baseRule, targetFilter: ['target-A'] };
      mockFindMany.mockResolvedValue([ruleWithTarget]);

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'CRITICAL',
        targetId: 'target-B',
      });

      expect(result.triggered).toHaveLength(0);
    });

    it('should skip rule when category does not match filter', async () => {
      const ruleWithCategory = { ...baseRule, categoryFilter: ['SQL_INJECTION'] };
      mockFindMany.mockResolvedValue([ruleWithCategory]);

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'HIGH',
        category: 'XSS',
      });

      expect(result.triggered).toHaveLength(0);
    });

    it('should skip rule when count < threshold', async () => {
      const highThreshold = { ...baseRule, threshold: 10 };
      mockFindMany.mockResolvedValue([highThreshold]);

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'CRITICAL',
        count: 5,
      });

      expect(result.triggered).toHaveLength(0);
    });

    it('should trigger when count >= threshold', async () => {
      const highThreshold = { ...baseRule, threshold: 5 };
      mockFindMany.mockResolvedValue([highThreshold]);
      mockNotifCreate.mockResolvedValue({});
      mockUpdate.mockResolvedValue({});

      const result = await service.evaluateRules('org1', 'NEW_VULNERABILITY', {
        severity: 'CRITICAL',
        count: 5,
      });

      expect(result.triggered).toContain('rule1');
    });

    it('should handle no matching rules gracefully', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await service.evaluateRules('org1', 'SCAN_COMPLETED', {});
      expect(result.triggered).toHaveLength(0);
    });
  });
});

/**
 * Tests for Jira Integration Service (#70)
 */

// ── Mocks (must be before imports due to jest.mock hoisting) ────────────────

const mockPrisma = {
  vulnFinding: { findUnique: jest.fn() },
};

jest.mock('../../../config/database', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('../../../utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { JiraService } from '../jira.service';
import { ApiError } from '../../../utils/ApiError';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ── Helpers ─────────────────────────────────────────────────────────────────

const JIRA_CFG = {
  baseUrl: 'https://test.atlassian.net',
  email: 'user@test.com',
  apiToken: 'tok-123',
};

function jsonResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function errorResponse(status: number, body = 'error') {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ message: body }),
    text: () => Promise.resolve(body),
  });
}

// ── Suite ───────────────────────────────────────────────────────────────────

describe('JiraService', () => {
  let svc: JiraService;

  beforeEach(() => {
    svc = new JiraService();
    jest.clearAllMocks();
  });

  // ── testConnection ──────────────────────────────────────────────────────

  describe('testConnection', () => {
    it('should return connected=true on success', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          displayName: 'John Doe',
          emailAddress: 'john@test.com',
          accountId: 'acc-1',
        }),
      );

      const result = await svc.testConnection(JIRA_CFG);

      expect(result.connected).toBe(true);
      expect(result.user.displayName).toBe('John Doe');
      expect(result.user.email).toBe('john@test.com');

      // Verify auth header
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://test.atlassian.net/rest/api/3/myself');
      expect(opts.headers.Authorization).toMatch(/^Basic /);
    });

    it('should throw ApiError on failure', async () => {
      mockFetch.mockReturnValueOnce(errorResponse(401, 'Unauthorized'));

      await expect(svc.testConnection(JIRA_CFG)).rejects.toThrow(ApiError);
    });
  });

  // ── getProjects ─────────────────────────────────────────────────────────

  describe('getProjects', () => {
    it('should map project data correctly', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          values: [
            { id: '1', key: 'SEC', name: 'Security', avatarUrls: { '48x48': 'https://img' } },
            { id: '2', key: 'DEV', name: 'Dev', avatarUrls: {} },
          ],
        }),
      );

      const projects = await svc.getProjects(JIRA_CFG);

      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        id: '1',
        key: 'SEC',
        name: 'Security',
        avatarUrl: 'https://img',
      });
    });
  });

  // ── getIssueTypes ───────────────────────────────────────────────────────

  describe('getIssueTypes', () => {
    it('should return mapped issue types', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          issueTypes: [
            { id: '10', name: 'Bug', description: 'A bug', subtask: false },
            { id: '11', name: 'Task', description: 'A task', subtask: false },
          ],
        }),
      );

      const types = await svc.getIssueTypes(JIRA_CFG, 'SEC');

      expect(types).toHaveLength(2);
      expect(types[0].name).toBe('Bug');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/project/SEC');
    });

    it('should handle project with no issueTypes', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({}));

      const types = await svc.getIssueTypes(JIRA_CFG, 'EMPTY');

      expect(types).toEqual([]);
    });
  });

  // ── createIssue ─────────────────────────────────────────────────────────

  describe('createIssue', () => {
    it('should create an issue with correct ADF description', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ id: '101', key: 'SEC-42', self: 'https://jira/issue/101' }),
      );

      const result = await svc.createIssue(JIRA_CFG, {
        projectKey: 'SEC',
        summary: 'Test XSS',
        description: 'Found reflected XSS on /search',
        priority: 'High',
        labels: ['security'],
        assignee: 'acc-99',
      });

      expect(result.key).toBe('SEC-42');
      expect(result.url).toBe('https://test.atlassian.net/browse/SEC-42');

      // Verify the request body
      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.fields.project.key).toBe('SEC');
      expect(body.fields.summary).toBe('Test XSS');
      expect(body.fields.description.type).toBe('doc');
      expect(body.fields.priority.name).toBe('High');
      expect(body.fields.labels).toEqual(['security']);
      expect(body.fields.assignee.accountId).toBe('acc-99');
    });

    it('should default issueType to Bug', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: '1', key: 'X-1', self: '' }));

      await svc.createIssue(JIRA_CFG, {
        projectKey: 'X',
        summary: 's',
        description: 'd',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.fields.issuetype.name).toBe('Bug');
    });

    it('should throw ApiError on Jira API error', async () => {
      mockFetch.mockReturnValueOnce(errorResponse(400, 'Bad fields'));

      await expect(
        svc.createIssue(JIRA_CFG, {
          projectKey: 'BAD',
          summary: 's',
          description: 'd',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('should merge customFields into fields', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ id: '1', key: 'C-1', self: '' }));

      await svc.createIssue(JIRA_CFG, {
        projectKey: 'C',
        summary: 's',
        description: 'd',
        customFields: { customfield_10001: 'story-points' },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.fields.customfield_10001).toBe('story-points');
    });
  });

  // ── createIssueFromFinding ──────────────────────────────────────────────

  describe('createIssueFromFinding', () => {
    it('should look up finding and create Jira issue', async () => {
      mockPrisma.vulnFinding.findUnique.mockResolvedValue({
        id: 'f-1',
        title: 'SQL Injection',
        severity: 'CRITICAL',
        category: 'SQL_INJECTION',
        description: 'SQLi found',
        remediation: 'Use parameterized queries',
        affectedUrl: 'https://example.com/api',
        cveId: 'CVE-2024-0001',
        cweId: 'CWE-89',
        scan: { id: 's-1', target: { value: 'example.com' } },
      });

      mockFetch.mockReturnValueOnce(
        jsonResponse({ id: '200', key: 'SEC-99', self: 'https://jira/200' }),
      );

      const result = await svc.createIssueFromFinding(JIRA_CFG, 'SEC', 'f-1');

      expect(result.key).toBe('SEC-99');
      expect(result.findingId).toBe('f-1');

      // Verify summary includes severity
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.fields.summary).toContain('[CRITICAL]');
      expect(body.fields.summary).toContain('SQL Injection');
      expect(body.fields.priority.name).toBe('Highest');
      expect(body.fields.labels).toContain('vulnscan');
      expect(body.fields.labels).toContain('critical');
    });

    it('should throw 404 when finding not found', async () => {
      mockPrisma.vulnFinding.findUnique.mockResolvedValue(null);

      await expect(
        svc.createIssueFromFinding(JIRA_CFG, 'SEC', 'nope'),
      ).rejects.toThrow(ApiError);
    });

    it('should map severity to Jira priority correctly', async () => {
      const severities = [
        ['CRITICAL', 'Highest'],
        ['HIGH', 'High'],
        ['MEDIUM', 'Medium'],
        ['LOW', 'Low'],
        ['INFO', 'Lowest'],
      ];

      for (const [severity, expectedPriority] of severities) {
        mockPrisma.vulnFinding.findUnique.mockResolvedValue({
          id: `f-${severity}`,
          title: 'Test',
          severity,
          category: 'OTHER',
          description: 'desc',
          scan: { id: 's-1', target: { value: 'test.com' } },
        });

        mockFetch.mockReturnValueOnce(
          jsonResponse({ id: '1', key: 'T-1', self: '' }),
        );

        await svc.createIssueFromFinding(JIRA_CFG, 'T', `f-${severity}`);

        const body = JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
        expect(body.fields.priority.name).toBe(expectedPriority);
      }
    });
  });
});

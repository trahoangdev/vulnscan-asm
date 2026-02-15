/**
 * Jira Integration Service
 *
 * Creates Jira issues from VulnScan findings using Jira REST API v3.
 * Supports: create issue, get projects, get issue types, sync status.
 * Uses basic auth (email + API token) — no @atlassian/jira dependency needed.
 */

import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

interface JiraConfig {
  baseUrl: string;   // e.g. https://yourcompany.atlassian.net
  email: string;     // Jira account email
  apiToken: string;  // Jira API token
}

interface CreateIssuePayload {
  projectKey: string;
  issueType?: string;
  summary: string;
  description: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  customFields?: Record<string, any>;
}

const SEVERITY_TO_JIRA_PRIORITY: Record<string, string> = {
  CRITICAL: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Lowest',
};

export class JiraService {
  private getHeaders(config: JiraConfig) {
    const token = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
  }

  private baseUrl(config: JiraConfig) {
    return `${config.baseUrl.replace(/\/$/, '')}/rest/api/3`;
  }

  private async request(config: JiraConfig, path: string, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl(config)}${path}`;
    const resp = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(config), ...(options?.headers || {}) },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Jira API ${resp.status}: ${body}`);
    }
    return resp.json();
  }

  /**
   * Test Jira connection credentials.
   */
  async testConnection(config: JiraConfig) {
    try {
      const data = await this.request(config, '/myself');
      return {
        connected: true,
        user: {
          displayName: data.displayName,
          email: data.emailAddress,
          accountId: data.accountId,
        },
      };
    } catch (error: any) {
      logger.warn('Jira connection test failed', { error: error.message });
      throw ApiError.badRequest('Failed to connect to Jira. Check your credentials.');
    }
  }

  /**
   * List available Jira projects.
   */
  async getProjects(config: JiraConfig) {
    const data = await this.request(config, '/project/search?maxResults=50');
    return data.values.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.['48x48'],
    }));
  }

  /**
   * Get issue types for a project.
   */
  async getIssueTypes(config: JiraConfig, projectKey: string) {
    const data = await this.request(config, `/project/${projectKey}`);
    return (data.issueTypes || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      subtask: t.subtask,
    }));
  }

  /**
   * Create a Jira issue from a finding.
   */
  async createIssue(config: JiraConfig, payload: CreateIssuePayload) {
    const fields: any = {
      project: { key: payload.projectKey },
      issuetype: { name: payload.issueType || 'Bug' },
      summary: payload.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: payload.description }],
          },
        ],
      },
    };

    if (payload.priority) {
      fields.priority = { name: payload.priority };
    }

    if (payload.labels && payload.labels.length) {
      fields.labels = payload.labels;
    }

    if (payload.assignee) {
      fields.assignee = { accountId: payload.assignee };
    }

    if (payload.customFields) {
      Object.assign(fields, payload.customFields);
    }

    try {
      const data = await this.request(config, '/issue', {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      return {
        id: data.id,
        key: data.key,
        self: data.self,
        url: `${config.baseUrl}/browse/${data.key}`,
      };
    } catch (error: any) {
      logger.error('Jira create issue failed', { error: error.message });
      throw ApiError.badRequest(`Failed to create Jira issue: ${error.message}`);
    }
  }

  /**
   * Create a Jira issue from a VulnFinding.
   */
  async createIssueFromFinding(
    config: JiraConfig,
    projectKey: string,
    findingId: string,
  ) {
    const finding = await prisma.vulnFinding.findUnique({
      where: { id: findingId },
      include: {
        scan: { select: { id: true, target: { select: { value: true } } } },
      },
    });

    if (!finding) {
      throw ApiError.notFound('Finding not found');
    }

    const priority = SEVERITY_TO_JIRA_PRIORITY[finding.severity] || 'Medium';

    const description = [
      `**Severity:** ${finding.severity}`,
      `**Category:** ${finding.category}`,
      `**Target:** ${finding.scan?.target?.value || 'N/A'}`,
      `**Affected URL:** ${finding.affectedUrl || 'N/A'}`,
      ``,
      `## Description`,
      finding.description,
      ``,
      finding.remediation ? `## Remediation\n${finding.remediation}` : '',
      finding.cveId ? `**CVE:** ${finding.cveId}` : '',
      finding.cweId ? `**CWE:** ${finding.cweId}` : '',
      ``,
      `---`,
      `*Created by VulnScan ASM — Finding ID: ${finding.id}*`,
    ].filter(Boolean).join('\n');

    const issue = await this.createIssue(config, {
      projectKey,
      issueType: 'Bug',
      summary: `[${finding.severity}] ${finding.title}`,
      description,
      priority,
      labels: ['vulnscan', 'security', finding.severity.toLowerCase()],
    });

    return {
      ...issue,
      findingId: finding.id,
    };
  }
}

export const jiraService = new JiraService();

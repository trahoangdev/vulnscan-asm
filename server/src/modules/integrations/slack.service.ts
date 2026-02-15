/**
 * Dedicated Slack integration service.
 *
 * Uses Slack Incoming Webhooks with Block Kit formatting
 * for rich vulnerability alerts, scan notifications, and weekly digests.
 */

import prisma from '../../config/database';
import { logger } from '../../utils/logger';

// ── Slack Block Kit helpers ────────────────────────────────────────────────

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  fields?: any[];
  accessory?: any;
  block_id?: string;
}

interface SlackMessage {
  text: string;               // Fallback text for notifications
  blocks?: SlackBlock[];
  attachments?: any[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

// Severity → Slack emoji + color
const SEVERITY_MAP: Record<string, { emoji: string; color: string }> = {
  CRITICAL: { emoji: '🔴', color: '#dc2626' },
  HIGH:     { emoji: '🟠', color: '#ea580c' },
  MEDIUM:   { emoji: '🟡', color: '#ca8a04' },
  LOW:      { emoji: '🔵', color: '#2563eb' },
  INFO:     { emoji: 'ℹ️', color: '#6b7280' },
};

export class SlackService {
  /**
   * Send a raw Slack message via incoming webhook URL
   */
  async sendMessage(webhookUrl: string, message: SlackMessage): Promise<void> {
    const body = JSON.stringify(message);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Slack returned ${res.status}: ${text}`);
      }
    } catch (error: any) {
      logger.error('Slack message delivery failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Test a Slack webhook connection
   */
  async testConnection(webhookUrl: string): Promise<{ ok: boolean; message: string }> {
    try {
      await this.sendMessage(webhookUrl, {
        text: '✅ VulnScan ASM — Slack integration test successful!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':white_check_mark: *VulnScan ASM* — Slack integration connected successfully!',
            },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Tested at ${new Date().toISOString()}` },
            ],
          },
        ],
      });
      return { ok: true, message: 'Slack webhook is working' };
    } catch (error: any) {
      return { ok: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Send a critical vulnerability alert to Slack
   */
  async sendVulnAlert(
    webhookUrl: string,
    vuln: {
      title: string;
      severity: string;
      target: string;
      description: string;
      solution?: string;
      url?: string;
    },
  ): Promise<void> {
    const sev = SEVERITY_MAP[vuln.severity] || SEVERITY_MAP.INFO;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${sev.emoji} Vulnerability Detected`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Title:*\n${vuln.title}` },
          { type: 'mrkdwn', text: `*Severity:*\n${sev.emoji} ${vuln.severity}` },
          { type: 'mrkdwn', text: `*Target:*\n${vuln.target}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Description:*\n${vuln.description.slice(0, 500)}` },
      },
    ];

    if (vuln.solution) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Remediation:*\n${vuln.solution.slice(0, 300)}` },
      });
    }

    if (vuln.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details', emoji: true },
            url: vuln.url,
            style: 'primary',
          },
        ],
      });
    }

    blocks.push({ type: 'divider' });

    await this.sendMessage(webhookUrl, {
      text: `${sev.emoji} [${vuln.severity}] ${vuln.title} — ${vuln.target}`,
      blocks,
    });
  }

  /**
   * Send a scan completed notification
   */
  async sendScanCompleted(
    webhookUrl: string,
    scan: {
      target: string;
      profile: string;
      duration: string;
      totalFindings: number;
      severityCounts: Record<string, number>;
      url?: string;
    },
  ): Promise<void> {
    const severityLine = Object.entries(scan.severityCounts)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => `${SEVERITY_MAP[sev]?.emoji || '•'} ${sev}: ${count}`)
      .join('  |  ');

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔍 Scan Completed', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Target:*\n${scan.target}` },
          { type: 'mrkdwn', text: `*Profile:*\n${scan.profile}` },
          { type: 'mrkdwn', text: `*Duration:*\n${scan.duration}` },
          { type: 'mrkdwn', text: `*Total Findings:*\n${scan.totalFindings}` },
        ],
      },
    ];

    if (severityLine) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Breakdown:*\n${severityLine}` },
      });
    }

    if (scan.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Scan Report', emoji: true },
            url: scan.url,
            style: 'primary',
          },
        ],
      });
    }

    blocks.push({ type: 'divider' });

    await this.sendMessage(webhookUrl, {
      text: `🔍 Scan completed for ${scan.target} — ${scan.totalFindings} findings`,
      blocks,
    });
  }

  /**
   * Send a weekly digest summary
   */
  async sendWeeklyDigest(
    webhookUrl: string,
    digest: {
      orgName: string;
      period: string;
      newVulns: number;
      resolvedVulns: number;
      openCritical: number;
      openHigh: number;
      scansRun: number;
      riskScore: number;
      url?: string;
    },
  ): Promise<void> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Weekly Security Digest', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${digest.orgName}* — ${digest.period}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*New Vulnerabilities:*\n${digest.newVulns}` },
          { type: 'mrkdwn', text: `*Resolved:*\n${digest.resolvedVulns}` },
          { type: 'mrkdwn', text: `*Open Critical:*\n🔴 ${digest.openCritical}` },
          { type: 'mrkdwn', text: `*Open High:*\n🟠 ${digest.openHigh}` },
          { type: 'mrkdwn', text: `*Scans Run:*\n${digest.scansRun}` },
          { type: 'mrkdwn', text: `*Risk Score:*\n${digest.riskScore}/100` },
        ],
      },
    ];

    if (digest.url) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Open Dashboard', emoji: true },
            url: digest.url,
          },
        ],
      });
    }

    blocks.push({ type: 'divider' });

    await this.sendMessage(webhookUrl, {
      text: `📊 Weekly Digest: ${digest.newVulns} new vulns, ${digest.resolvedVulns} resolved`,
      blocks,
    });
  }

  /**
   * Send Slack notifications for an organization
   * Looks up org's Slack webhook config and dispatches
   */
  async notifyOrg(
    orgId: string,
    eventType: 'vuln_alert' | 'scan_completed' | 'weekly_digest',
    data: any,
  ): Promise<void> {
    // Look up Slack webhooks configured for this org
    const slackWebhooks = await prisma.webhook.findMany({
      where: {
        orgId,
        isActive: true,
        events: { has: `slack.${eventType}` },
        url: { startsWith: 'https://hooks.slack.com/' },
      },
    });

    if (slackWebhooks.length === 0) return;

    for (const wh of slackWebhooks) {
      try {
        switch (eventType) {
          case 'vuln_alert':
            await this.sendVulnAlert(wh.url, data);
            break;
          case 'scan_completed':
            await this.sendScanCompleted(wh.url, data);
            break;
          case 'weekly_digest':
            await this.sendWeeklyDigest(wh.url, data);
            break;
        }

        await prisma.webhook.update({
          where: { id: wh.id },
          data: { lastTriggeredAt: new Date(), lastError: null },
        });
      } catch (error: any) {
        logger.error('Slack notification failed', {
          orgId, eventType, webhookId: wh.id, error: error.message,
        });
        await prisma.webhook.update({
          where: { id: wh.id },
          data: { lastTriggeredAt: new Date(), lastError: error.message?.slice(0, 500) },
        }).catch(() => {});
      }
    }
  }
}

export const slackService = new SlackService();

import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { generateVerificationToken } from '../../utils/crypto';
import { isValidDomain, isValidIp, parsePagination, parseSort } from '../../utils/helpers';
import { logger } from '../../utils/logger';

const PLAN_LIMITS = {
  STARTER:      { maxTargets: 1,   maxScansPerMonth: 10,  maxTeamMembers: 1,  apiAccess: false, scheduling: false },
  PROFESSIONAL: { maxTargets: 5,   maxScansPerMonth: 50,  maxTeamMembers: 3,  apiAccess: true,  scheduling: true },
  BUSINESS:     { maxTargets: 20,  maxScansPerMonth: 200, maxTeamMembers: 10, apiAccess: true,  scheduling: true },
  ENTERPRISE:   { maxTargets: -1,  maxScansPerMonth: -1,  maxTeamMembers: -1, apiAccess: true,  scheduling: true },
} as const;
import dns from 'dns/promises';
import https from 'https';
import http from 'http';
import type { CreateTargetInput, UpdateTargetInput } from './targets.schema';

export class TargetsService {
  /**
   * List all targets for an organization
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort as string);

    const where: any = { orgId, isActive: true };

    if (query.status) {
      where.verificationStatus = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.tags) {
      where.tags = { hasSome: (query.tags as string).split(',') };
    }

    const [targets, total] = await Promise.all([
      prisma.target.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.target.count({ where }),
    ]);

    return { targets, total, page, limit };
  }

  /**
   * Create a new target
   */
  async create(orgId: string, data: CreateTargetInput) {
    // Validate based on type
    if (data.type === 'DOMAIN' && !isValidDomain(data.value)) {
      throw ApiError.badRequest('Invalid domain format');
    }
    if (data.type === 'IP' && !isValidIp(data.value)) {
      throw ApiError.badRequest('Invalid IP address format');
    }

    // Check quota
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw ApiError.notFound('Organization not found');

    const currentTargets = await prisma.target.count({
      where: { orgId, isActive: true },
    });

    const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS].maxTargets;
    if (planLimit !== -1 && currentTargets >= planLimit) {
      throw ApiError.forbidden(
        `Target limit reached (${planLimit}). Upgrade your plan for more targets.`,
      );
    }

    // Check duplicate
    const existing = await prisma.target.findUnique({
      where: { orgId_value: { orgId, value: data.value } },
    });
    if (existing) {
      throw ApiError.conflict('Target already exists');
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    const target = await prisma.target.create({
      data: {
        orgId,
        type: data.type,
        value: data.value,
        label: data.label,
        notes: data.notes,
        scanProfile: data.scanProfile,
        tags: data.tags || [],
        verificationToken,
      },
    });

    return {
      ...target,
      verificationMethods: {
        dns: {
          type: 'TXT',
          host: `_vulnscan-verify.${data.value}`,
          value: verificationToken,
          altHost: data.value,
          altNote: 'If you have a wildcard CNAME record, add the TXT record to the root domain instead.',
        },
        html: {
          path: '/.well-known/vulnscan-verify.txt',
          content: verificationToken,
        },
        meta: {
          tag: `<meta name="vulnscan-verify" content="${verificationToken}">`,
        },
      },
    };
  }

  /**
   * Bulk import targets from CSV data
   * CSV format: value,type,label,scanProfile,tags (header row optional)
   */
  async bulkImport(orgId: string, csvData: string) {
    const lines = csvData
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) throw ApiError.badRequest('CSV file is empty');

    // Detect header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('value') || firstLine.includes('domain') || firstLine.includes('target');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) throw ApiError.badRequest('No data rows in CSV');

    // Check org quota
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organization not found');

    const currentTargets = await prisma.target.count({ where: { orgId, isActive: true } });
    const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS].maxTargets;

    if (planLimit !== -1 && currentTargets + dataLines.length > planLimit) {
      throw ApiError.forbidden(
        `Import would exceed target limit (${planLimit}). Current: ${currentTargets}, Importing: ${dataLines.length}.`,
      );
    }

    const results: { success: any[]; errors: { line: number; value: string; error: string }[] } = {
      success: [],
      errors: [],
    };

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const value = cols[0];
      const type = (['DOMAIN', 'IP', 'CIDR'].includes(cols[1]?.toUpperCase()) ? cols[1].toUpperCase() : 'DOMAIN') as 'DOMAIN' | 'IP' | 'CIDR';
      const label = cols[2] || undefined;
      const scanProfile = (['QUICK', 'STANDARD', 'DEEP'].includes(cols[3]?.toUpperCase()) ? cols[3].toUpperCase() : 'STANDARD') as any;
      const tags = cols[4] ? cols[4].split(';').map((t) => t.trim()).filter(Boolean) : [];

      if (!value) {
        results.errors.push({ line: i + 1, value: '', error: 'Empty value' });
        continue;
      }

      if (type === 'DOMAIN' && !isValidDomain(value)) {
        results.errors.push({ line: i + 1, value, error: 'Invalid domain format' });
        continue;
      }
      if (type === 'IP' && !isValidIp(value)) {
        results.errors.push({ line: i + 1, value, error: 'Invalid IP format' });
        continue;
      }

      // Check duplicate
      const existing = await prisma.target.findUnique({
        where: { orgId_value: { orgId, value } },
      });
      if (existing) {
        results.errors.push({ line: i + 1, value, error: 'Target already exists' });
        continue;
      }

      try {
        const verificationToken = generateVerificationToken();
        const target = await prisma.target.create({
          data: {
            orgId,
            type,
            value,
            label,
            scanProfile,
            tags,
            verificationToken,
          },
        });
        results.success.push({ id: target.id, value: target.value, type: target.type });
      } catch (err: any) {
        results.errors.push({ line: i + 1, value, error: err.message || 'Unknown error' });
      }
    }

    return {
      imported: results.success.length,
      failed: results.errors.length,
      total: dataLines.length,
      targets: results.success,
      errors: results.errors,
    };
  }

  /**
   * Get target by ID
   */
  async getById(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
      include: {
        _count: {
          select: {
            assets: true,
            scans: true,
          },
        },
      },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    return target;
  }

  /**
   * Update target
   */
  async update(orgId: string, targetId: string, data: UpdateTargetInput) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    return prisma.target.update({
      where: { id: targetId },
      data,
    });
  }

  /**
   * Delete target (soft delete)
   */
  async delete(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    await prisma.target.update({
      where: { id: targetId },
      data: { isActive: false },
    });

    return { message: 'Target deleted successfully' };
  }

  /**
   * Skip verification (development only)
   */
  async skipVerification(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });
    if (!target) throw ApiError.notFound('Target not found');
    if (target.verificationStatus === 'VERIFIED') {
      return { message: 'Target already verified', status: 'VERIFIED' };
    }
    await prisma.target.update({
      where: { id: targetId },
      data: {
        verificationStatus: 'VERIFIED',
        verificationMethod: 'DNS_TXT',
        verifiedAt: new Date(),
      },
    });
    return { message: 'Target verified (dev skip)', status: 'VERIFIED' };
  }

  /**
   * Verify domain ownership
   */
  async verify(orgId: string, targetId: string, method: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });

    if (!target) {
      throw ApiError.notFound('Target not found');
    }

    if (target.verificationStatus === 'VERIFIED') {
      return { message: 'Target already verified', status: 'VERIFIED' };
    }

    if (!target.verificationToken) {
      throw ApiError.badRequest('No verification token found. Please recreate the target.');
    }

    let verified = false;

    try {
      switch (method) {
        case 'DNS_TXT':
          verified = await this.verifyDnsTxt(target.value, target.verificationToken);
          break;
        case 'HTML_FILE':
          verified = await this.verifyHtmlFile(target.value, target.verificationToken);
          break;
        case 'META_TAG':
          verified = await this.verifyMetaTag(target.value, target.verificationToken);
          break;
        default:
          throw ApiError.badRequest('Invalid verification method');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Verification check error', { error, targetId, method });
    }

    if (verified) {
      await prisma.target.update({
        where: { id: targetId },
        data: {
          verificationStatus: 'VERIFIED',
          verificationMethod: method as any,
          verifiedAt: new Date(),
        },
      });
      return { message: 'Domain verified successfully', status: 'VERIFIED' };
    }

    await prisma.target.update({
      where: { id: targetId },
      data: {
        verificationStatus: 'FAILED',
        verificationMethod: method as any,
      },
    });

    return {
      message: `Verification failed. Please ensure the ${method === 'DNS_TXT' ? 'DNS TXT record' : method === 'HTML_FILE' ? 'verification file' : 'meta tag'} is correctly set up and try again.`,
      status: 'FAILED',
    };
  }

  /**
   * Verify via DNS TXT record
   * Strategy:
   *   1. Check _vulnscan-verify.<domain> TXT records (standard)
   *   2. Fallback: check root <domain> TXT records (handles wildcard CNAME conflicts)
   *   3. Fallback: query Google DNS-over-HTTPS API as last resort
   */
  private async verifyDnsTxt(domain: string, token: string): Promise<boolean> {
    // 1) Standard subdomain TXT lookup
    if (await this.lookupTxtRecords(`_vulnscan-verify.${domain}`, token)) {
      return true;
    }

    // 2) Fallback: root domain TXT lookup (handles wildcard CNAME overriding subdomain)
    //    Many DNS providers (like Namecheap) have wildcard CNAME records that
    //    intercept subdomain lookups. Checking root TXT as fallback.
    if (await this.lookupTxtRecords(domain, token)) {
      return true;
    }

    // 3) Fallback: Google DNS-over-HTTPS API (bypasses local resolver issues)
    try {
      const dohUrl = `https://dns.google/resolve?name=_vulnscan-verify.${domain}&type=TXT`;
      const resp = await fetch(dohUrl, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json() as any;
        const answers = data.Answer || [];
        for (const ans of answers) {
          // Type 16 = TXT
          if (ans.type === 16) {
            const value = (ans.data || '').replace(/^"|"$/g, '');
            if (value === token) return true;
          }
        }
      }
    } catch {
      // DOH query failed, continue
    }

    return false;
  }

  /**
   * Helper: lookup TXT records for a hostname and match against token
   */
  private async lookupTxtRecords(hostname: string, token: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(hostname);
      for (const record of records) {
        const value = record.join('');
        if (value === token) {
          return true;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
        logger.error('DNS TXT lookup error', { error: error.message, hostname });
      }
    }
    return false;
  }

  /**
   * Verify via HTML file
   * Checks https://<domain>/.well-known/vulnscan-verify.txt for the token
   */
  private async verifyHtmlFile(domain: string, token: string): Promise<boolean> {
    const urls = [
      `https://${domain}/.well-known/vulnscan-verify.txt`,
      `http://${domain}/.well-known/vulnscan-verify.txt`,
    ];

    for (const url of urls) {
      try {
        const content = await this.fetchUrl(url);
        if (content.trim() === token) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Verify via meta tag
   * Checks the homepage for <meta name="vulnscan-verify" content="TOKEN">
   */
  private async verifyMetaTag(domain: string, token: string): Promise<boolean> {
    const urls = [`https://${domain}`, `http://${domain}`];

    for (const url of urls) {
      try {
        const html = await this.fetchUrl(url);
        const metaRegex = /<meta\s+name=["']vulnscan-verify["']\s+content=["']([^"']+)["']/i;
        const match = html.match(metaRegex);
        if (match && match[1] === token) {
          return true;
        }
        // Also check reversed order (content before name)
        const metaRegex2 = /<meta\s+content=["']([^"']+)["']\s+name=["']vulnscan-verify["']/i;
        const match2 = html.match(metaRegex2);
        if (match2 && match2[1] === token) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Simple HTTP(S) fetch helper with timeout
   */
  private fetchUrl(url: string, timeout = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const request = client.get(url, { timeout, rejectUnauthorized: false }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow one redirect
          this.fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
    });
  }

  /**
   * Get verification status and methods for a target
   */
  async getVerifyStatus(orgId: string, targetId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
      select: {
        id: true,
        value: true,
        verificationStatus: true,
        verificationMethod: true,
        verificationToken: true,
        verifiedAt: true,
      },
    });

    if (!target) throw ApiError.notFound('Target not found');

    return {
      status: target.verificationStatus,
      method: target.verificationMethod,
      verifiedAt: target.verifiedAt,
      verificationMethods: target.verificationToken ? {
        dns: {
          type: 'TXT',
          host: `_vulnscan-verify.${target.value}`,
          value: target.verificationToken,
          altHost: target.value,
          altNote: 'If you have a wildcard CNAME record, add the TXT record to the root domain instead.',
        },
        html: {
          path: '/.well-known/vulnscan-verify.txt',
          content: target.verificationToken,
        },
        meta: {
          tag: `<meta name="vulnscan-verify" content="${target.verificationToken}">`,
        },
      } : null,
    };
  }

  /**
   * Get assets for a target
   */
  async getAssets(orgId: string, targetId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId },
    });
    if (!target) throw ApiError.notFound('Target not found');

    const where: any = { targetId };
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { lastSeenAt: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    return { assets, total, page, limit };
  }

  /**
   * Set scan schedule for a target
   */
  async setSchedule(orgId: string, targetId: string, data: { scanSchedule: string | null; scanProfile?: string }) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, orgId, isActive: true },
    });
    if (!target) throw ApiError.notFound('Target not found');

    const SCHEDULE_INTERVALS: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const updateData: any = {
      scanSchedule: data.scanSchedule,
      nextScanAt: data.scanSchedule
        ? new Date(Date.now() + (SCHEDULE_INTERVALS[data.scanSchedule] || SCHEDULE_INTERVALS.daily))
        : null,
    };

    if (data.scanProfile) {
      updateData.scanProfile = data.scanProfile;
    }

    const updated = await prisma.target.update({
      where: { id: targetId },
      data: updateData,
    });

    return updated;
  }
}

export const targetsService = new TargetsService();

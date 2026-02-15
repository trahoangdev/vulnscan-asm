import { Request } from 'express';

/**
 * Parse pagination params from query string
 */
export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Parse sort string: "-createdAt,name" => { createdAt: 'desc', name: 'asc' }
 */
export function parseSort(sortStr?: string): Record<string, 'asc' | 'desc'> {
  if (!sortStr) return { createdAt: 'desc' };

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const fields = sortStr.split(',');
  for (const field of fields) {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      orderBy[trimmed.substring(1)] = 'desc';
    } else {
      orderBy[trimmed] = 'asc';
    }
  }
  return orderBy;
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validate IP address format
 */
export function isValidIp(ip: string): boolean {
  if (!ip) return false;
  // IPv4: each octet 0-255
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const v4Match = ipv4Regex.exec(ip);
  if (v4Match) {
    return v4Match.slice(1).every((o) => {
      const n = parseInt(o, 10);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Calculate expiry time from string like "15m", "7d", "1h"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900000; // default 15min

  const [, amount, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return parseInt(amount) * (multipliers[unit] || 60_000);
}

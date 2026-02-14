import crypto from 'crypto';
import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import type { CreateApiKeyInput } from './apikeys.schema';

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  const fullKey = `vsa_${raw}`;
  const prefix = fullKey.substring(0, 12);
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hash };
}

export class ApiKeysService {
  /**
   * List API keys for org (hides full key)
   */
  async list(orgId: string, userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { orgId, userId, isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  /**
   * Generate a new API key — returns full key only once
   */
  async create(orgId: string, userId: string, data: CreateApiKeyInput) {
    const { fullKey, prefix, hash } = generateApiKey();

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        orgId,
        name: data.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: data.permissions || ['read'],
        expiresAt,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey,  // Only returned on creation!
      keyPrefix: prefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revoke(orgId: string, userId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, orgId, userId },
    });
    if (!key) throw ApiError.notFound('API key not found');

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return { message: 'API key revoked successfully' };
  }

  /**
   * Validate an API key and return user context
   */
  async validateKey(rawKey: string) {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
        organization: { select: { id: true, isActive: true } },
      },
    });

    if (!apiKey || !apiKey.isActive) return null;
    if (!apiKey.user.isActive || !apiKey.organization.isActive) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: apiKey.userId,
      email: apiKey.user.email,
      orgId: apiKey.orgId,
      permissions: apiKey.permissions,
    };
  }
}

export const apiKeysService = new ApiKeysService();

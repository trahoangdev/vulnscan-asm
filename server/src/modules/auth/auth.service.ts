import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  TokenPayload,
} from '../../utils/crypto';
import { generateSlug } from '../../utils/crypto';
import { sendEmail, verificationEmailHtml, resetPasswordEmailHtml } from '../../utils/email';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { OAuth2Client } from 'google-auth-library';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthService {
  /**
   * Register a new user + auto-create organization
   */
  async register(data: RegisterInput, clientIp: string) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);
    const emailVerifyToken = generateRandomToken();

    // Create user + organization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const orgName = data.orgName || `${data.name}'s Organization`;
      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: generateSlug(orgName),
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          emailVerifyToken,
          lastLoginIp: clientIp,
        },
      });

      // Add user as org owner
      await tx.orgMember.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'OWNER',
        },
      });

      return { user, org };
    });

    // Send verification email (non-blocking)
    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
    sendEmail({
      to: data.email,
      subject: `Verify your email — ${env.APP_NAME}`,
      html: verificationEmailHtml(data.name, verifyUrl),
    }).catch((err) => logger.error('Failed to send verification email:', err));

    // Audit log
    prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'auth.register',
        entity: 'user',
        entityId: result.user.id,
        ipAddress: clientIp,
        details: { method: 'email' },
      },
    }).catch(() => {});

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: result.user.emailVerified,
      },
      message: 'Verification email sent',
    };
  }

  /**
   * Login with email & password
   */
  async login(data: LoginInput, clientIp: string) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        orgMemberships: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // If 2FA enabled, return a flag instead of tokens
    if (user.twoFactorEnabled) {
      return {
        requires2fa: true,
        message: 'Two-factor authentication required',
      };
    }

    // Get primary organization
    const orgMembership = user.orgMemberships[0];
    if (!orgMembership) {
      throw ApiError.internal('User has no organization');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      orgId: orgMembership.orgId,
      systemRole: user.systemRole,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.login',
        entity: 'user',
        entityId: user.id,
        ipAddress: clientIp,
        details: { method: 'password' },
      },
    }).catch(() => {}); // non-blocking

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        systemRole: user.systemRole,
        organization: {
          id: orgMembership.organization.id,
          name: orgMembership.organization.name,
          plan: orgMembership.organization.plan,
        },
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenStr: string) {
    try {
      const payload = verifyRefreshToken(refreshTokenStr);

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          orgMemberships: {
            include: { organization: true },
            take: 1,
          },
        },
      });

      if (!user || !user.isActive) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      const orgMembership = user.orgMemberships[0];
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        orgId: orgMembership?.orgId,
        systemRole: user.systemRole,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent' };
    }

    const resetToken = generateRandomToken();
    const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    });

    // Send reset email
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    sendEmail({
      to: data.email,
      subject: `Reset your password — ${env.APP_NAME}`,
      html: resetPasswordEmailHtml(user.name, resetUrl),
    }).catch((err) => logger.error('Failed to send reset email:', err));

    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordInput) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: data.token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(data.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                maxTargets: true,
                maxScansPerMonth: true,
                scansUsed: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      timezone: user.timezone,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      organizations: user.orgMemberships.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    };
  }

  // ======== OAuth Login ========

  // ======== Two-Factor Authentication ========

  /**
   * Generate a 2FA secret + QR code for the user to scan
   */
  async setup2fa(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.twoFactorEnabled) throw ApiError.badRequest('2FA is already enabled');

    const secret = generateSecret();

    // Save secret (but don't enable yet until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const otpauth = generateURI({ secret, issuer: env.APP_NAME, label: user.email });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return {
      secret,
      qrCode: qrCodeDataUrl,
      otpauth,
    };
  }

  /**
   * Verify a TOTP token and enable 2FA
   */
  async enable2fa(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.twoFactorEnabled) throw ApiError.badRequest('2FA is already enabled');
    if (!user.twoFactorSecret) throw ApiError.badRequest('Call setup-2fa first');

    const result = verifySync({ token, secret: user.twoFactorSecret });
    if (!result.valid) throw ApiError.badRequest('Invalid TOTP token');

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    // Audit log
    prisma.auditLog.create({
      data: {
        userId,
        action: 'auth.2fa_enabled',
        entity: 'user',
        entityId: userId,
        details: { method: 'totp' },
      },
    }).catch(() => {});

    return { message: '2FA enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  async disable2fa(userId: string, token: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (!user.twoFactorEnabled) throw ApiError.badRequest('2FA is not enabled');

    // Verify password
    if (user.passwordHash) {
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) throw ApiError.unauthorized('Invalid password');
    }

    // Verify TOTP
    if (!user.twoFactorSecret) throw ApiError.badRequest('No 2FA secret found');
    const result = verifySync({ token, secret: user.twoFactorSecret });
    if (!result.valid) throw ApiError.badRequest('Invalid TOTP token');

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    // Audit log
    prisma.auditLog.create({
      data: {
        userId,
        action: 'auth.2fa_disabled',
        entity: 'user',
        entityId: userId,
        details: { method: 'totp' },
      },
    }).catch(() => {});

    return { message: '2FA disabled successfully' };
  }

  /**
   * Verify 2FA during login (called after password check)
   */
  async verify2faLogin(email: string, password: string, token: string, clientIp: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orgMemberships: { include: { organization: true }, take: 1 },
      },
    });

    if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid credentials');
    if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) throw ApiError.unauthorized('Invalid credentials');

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw ApiError.badRequest('2FA is not enabled for this account');
    }

    const totpResult = verifySync({ token, secret: user.twoFactorSecret });
    if (!totpResult.valid) throw ApiError.unauthorized('Invalid 2FA token');

    const orgMembership = user.orgMemberships[0];
    if (!orgMembership) throw ApiError.internal('User has no organization');

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      orgId: orgMembership.orgId,
      systemRole: user.systemRole,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: clientIp },
    });

    // Audit log
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.login_2fa',
        entity: 'user',
        entityId: user.id,
        ipAddress: clientIp,
        details: { method: '2fa_totp' },
      },
    }).catch(() => {});

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        systemRole: user.systemRole,
        twoFactorEnabled: true,
        organization: {
          id: orgMembership.organization.id,
          name: orgMembership.organization.name,
          plan: orgMembership.organization.plan,
        },
      },
    };
  }

  /**
   * Google OAuth login — verify Google ID token, create/link account, return JWT
   */
  async googleLogin(idToken: string, clientIp: string) {
    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw ApiError.unauthorized('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw ApiError.unauthorized('Google token missing email');
    }

    return this.oauthUpsert({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture || null,
      emailVerified: !!payload.email_verified,
      clientIp,
    });
  }

  /**
   * GitHub OAuth login — exchange code for access token, fetch profile, return JWT
   */
  async githubLogin(code: string, clientIp: string) {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = (await tokenRes.json()) as any;

    if (!tokenData.access_token) {
      throw ApiError.unauthorized('Invalid GitHub code');
    }

    // Fetch user profile
    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
      }),
    ]);

    const ghUser = (await userRes.json()) as any;
    const ghEmails = (await emailsRes.json()) as any[];

    // Find primary verified email
    const primaryEmail = ghEmails?.find((e: any) => e.primary && e.verified)?.email
      || ghEmails?.find((e: any) => e.verified)?.email
      || ghUser.email;

    if (!primaryEmail) {
      throw ApiError.badRequest('GitHub account has no verified email');
    }

    return this.oauthUpsert({
      provider: 'github',
      providerId: String(ghUser.id),
      email: primaryEmail,
      name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url || null,
      emailVerified: true,
      clientIp,
    });
  }

  /**
   * Internal: upsert user from OAuth provider
   */
  private async oauthUpsert(data: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatar: string | null;
    emailVerified: boolean;
    clientIp: string;
  }) {
    // Check if OAuth account already linked
    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: data.provider, providerId: data.providerId } },
      include: { user: { include: { orgMemberships: { include: { organization: true }, take: 1 } } } },
    });

    let user: any;

    if (oauthAccount) {
      // Existing OAuth link → login
      user = oauthAccount.user;
    } else {
      // Try to find user by email
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        include: { orgMemberships: { include: { organization: true }, take: 1 } },
      });

      if (existingUser) {
        // Link OAuth to existing account
        await prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: data.provider,
            providerId: data.providerId,
          },
        });
        user = existingUser;
      } else {
        // Brand new user — create account + org
        const result = await prisma.$transaction(async (tx) => {
          const orgName = `${data.name}'s Organization`;
          const org = await tx.organization.create({
            data: { name: orgName, slug: generateSlug(orgName) },
          });

          const newUser = await tx.user.create({
            data: {
              email: data.email,
              name: data.name,
              avatar: data.avatar,
              emailVerified: data.emailVerified,
              lastLoginIp: data.clientIp,
            },
          });

          await tx.orgMember.create({
            data: { userId: newUser.id, orgId: org.id, role: 'OWNER' },
          });

          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider: data.provider,
              providerId: data.providerId,
            },
          });

          return { user: newUser, org };
        });

        user = await prisma.user.findUnique({
          where: { id: result.user.id },
          include: { orgMemberships: { include: { organization: true }, take: 1 } },
        });
      }
    }

    if (!user || !user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const orgMembership = user.orgMemberships?.[0];
    if (!orgMembership) throw ApiError.internal('User has no organization');

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      orgId: orgMembership.orgId,
      systemRole: user.systemRole,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: data.clientIp },
    });

    // Audit log
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.oauth_login',
        entity: 'user',
        entityId: user.id,
        ipAddress: data.clientIp,
        details: { method: 'oauth', provider: data.provider },
      },
    }).catch(() => {});

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        systemRole: user.systemRole,
        organization: {
          id: orgMembership.organization.id,
          name: orgMembership.organization.name,
          plan: orgMembership.organization.plan,
        },
      },
    };
  }
}

export const authService = new AuthService();

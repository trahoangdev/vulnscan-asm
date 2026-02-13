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
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema';

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

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
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
}

export const authService = new AuthService();

import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { generateRandomToken } from '../../utils/crypto';
import type { UpdateOrgInput, InviteMemberInput, UpdateMemberRoleInput } from './organizations.schema';

export class OrganizationsService {
  /**
   * Get organization details
   */
  async getOrg(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { members: true, targets: true, reports: true },
        },
      },
    });
    if (!org) throw ApiError.notFound('Organization not found');
    return org;
  }

  /**
   * Update organization settings
   */
  async updateOrg(orgId: string, data: UpdateOrgInput) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organization not found');

    return prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
      },
    });
  }

  // ===== Team / Member Management =====

  /**
   * List org members
   */
  async listMembers(orgId: string) {
    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            lastLoginAt: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });
    return members;
  }

  /**
   * Invite a new member by email
   */
  async inviteMember(orgId: string, invitedByUserId: string, data: InviteMemberInput) {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw ApiError.notFound('No user found with that email. They must register first.');
    }

    // Check if already a member
    const existing = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId } },
    });
    if (existing) {
      throw ApiError.conflict('User is already a member of this organization');
    }

    // Create membership
    const member = await prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId,
        role: data.role as any,
        invitedBy: invitedByUserId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Create notification for the invited user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Team Invitation',
        message: `You have been added to an organization as ${data.role}`,
        data: { orgId, role: data.role },
      },
    });

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(orgId: string, memberId: string, data: UpdateMemberRoleInput) {
    const member = await prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) throw ApiError.notFound('Member not found');

    // Cannot change owner role via this endpoint
    if (member.role === 'OWNER') {
      throw ApiError.forbidden('Cannot change the owner role');
    }

    return prisma.orgMember.update({
      where: { id: memberId },
      data: { role: data.role as any },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  /**
   * Remove a member from org
   */
  async removeMember(orgId: string, memberId: string) {
    const member = await prisma.orgMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) throw ApiError.notFound('Member not found');

    if (member.role === 'OWNER') {
      throw ApiError.forbidden('Cannot remove the organization owner');
    }

    await prisma.orgMember.delete({ where: { id: memberId } });
    return { message: 'Member removed successfully' };
  }
}

export const organizationsService = new OrganizationsService();

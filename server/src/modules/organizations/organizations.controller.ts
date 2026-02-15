import { Request, Response, NextFunction } from 'express';
import { organizationsService } from './organizations.service';

class OrganizationsController {
  async getOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationsService.getOrg(req.user!.orgId);
      res.json({ data: org });
    } catch (error) {
      next(error);
    }
  }

  async updateOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationsService.updateOrg(req.user!.orgId, req.body);
      res.json({ data: org });
    } catch (error) {
      next(error);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await organizationsService.listMembers(req.user!.orgId);
      res.json({ data: members });
    } catch (error) {
      next(error);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await organizationsService.inviteMember(
        req.user!.orgId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await organizationsService.updateMemberRole(
        req.user!.orgId,
        req.params.memberId,
        req.body,
      );
      res.json({ data: member });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizationsService.removeMember(
        req.user!.orgId,
        req.params.memberId,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizationsService.getUsage(req.user!.orgId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationsController = new OrganizationsController();

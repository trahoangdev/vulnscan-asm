import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { adminService } from './admin.service';
import {
  listUsersSchema,
  updateUserSchema,
  deleteUserSchema,
  listOrgsSchema,
  updateOrgSchema,
  deleteOrgSchema,
  updateSettingSchema,
  batchUpdateSettingsSchema,
  listAuditLogsSchema,
} from './admin.schema';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ============================================
// DASHBOARD
// ============================================

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = listUsersSchema.parse({ query: req.query });
    const result = await adminService.listUsers(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params, body } = updateUserSchema.parse({ params: req.params, body: req.body });
    const updated = await adminService.updateUser(params.id, body, req.user!.userId, req.ip);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params } = deleteUserSchema.parse({ params: req.params });
    const result = await adminService.deleteUser(params.id, req.user!.userId, req.ip);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/reset-password', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters' } });
    }
    const result = await adminService.resetUserPassword(req.params.id, newPassword, req.user!.userId, req.ip);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

router.get('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = listOrgsSchema.parse({ query: req.query });
    const result = await adminService.listOrgs(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/organizations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await adminService.getOrgById(req.params.id);
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
});

router.put('/organizations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params, body } = updateOrgSchema.parse({ params: req.params, body: req.body });
    const updated = await adminService.updateOrg(params.id, body, req.user!.userId, req.ip);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/organizations/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params } = deleteOrgSchema.parse({ params: req.params });
    const result = await adminService.deleteOrg(params.id, req.user!.userId, req.ip);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SYSTEM SETTINGS
// ============================================

router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const settings = await adminService.getSettings(category as string);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.get('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await adminService.getSetting(req.params.key);
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

router.put('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { params, body } = updateSettingSchema.parse({ params: req.params, body: req.body });
    const setting = await adminService.upsertSetting(params.key, body.value, req.user!.userId, body.label, undefined, req.ip);
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = batchUpdateSettingsSchema.parse({ body: req.body });
    const results = await adminService.batchUpdateSettings(body.settings, req.user!.userId, req.ip);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ============================================
// AUDIT LOGS
// ============================================

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = listAuditLogsSchema.parse({ query: req.query });
    const result = await adminService.listAuditLogs(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SCAN MANAGEMENT (cross-org)
// ============================================

router.get('/scans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await adminService.listAllScans(page, limit, status);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/scans/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.cancelScan(req.params.id, req.user!.userId, req.ip);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;

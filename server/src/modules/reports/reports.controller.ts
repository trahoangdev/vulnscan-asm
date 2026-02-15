import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { generateSarif } from './sarif';
import prisma from '../../config/database';

export class ReportsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { reports, total, page, limit } = await reportsService.list(
        req.user!.orgId,
        req.query as Record<string, any>,
      );
      return ApiResponse.paginated(res, reports, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.getById(req.user!.orgId, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.generate(req.user!.orgId, req.body);
      return ApiResponse.accepted(res, result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await reportsService.delete(req.user!.orgId, req.params.id);
      return ApiResponse.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportsService.download(req.user!.orgId, req.params.id);

      if ('buffer' in result && result.buffer) {
        const filename = `${result.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.${result.ext}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', result.mime);
        res.setHeader('Content-Length', result.buffer!.length);
        return res.send(result.buffer);
      }

      // S3/MinIO URL redirect
      return ApiResponse.success(res, { url: result.url });
    } catch (error) {
      next(error);
    }
  }
  /**
   * GET /reports/scans/:scanId/sarif — Export scan findings as SARIF
   */
  async exportSarif(req: Request, res: Response, next: NextFunction) {
    try {
      const scan = await prisma.scan.findFirst({
        where: {
          id: req.params.scanId,
          target: { orgId: req.user!.orgId },
        },
        include: {
          target: { select: { value: true, type: true } },
          findings: true,
        },
      });

      if (!scan) {
        return ApiResponse.error(res, 404, 'NOT_FOUND', 'Scan not found');
      }

      const sarifFindings = scan.findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description || '',
        solution: f.remediation || undefined,
        affectedComponent: f.affectedUrl || f.affectedParam || undefined,
        evidence: f.evidence ? JSON.stringify(f.evidence) : undefined,
        cvssScore: f.cvssScore || undefined,
        cweId: f.cweId || undefined,
        cveId: f.cveId || undefined,
        references: (f.references as string[]) || undefined,
        firstFoundAt: f.firstFoundAt?.toISOString(),
      }));

      const sarif = generateSarif(sarifFindings, {
        targetValue: scan.target.value,
        scanId: scan.id,
        startedAt: scan.startedAt?.toISOString(),
        completedAt: scan.completedAt?.toISOString(),
        profile: scan.profile,
      });

      const filename = `vulnscan-${scan.target.value}-${scan.id}.sarif`;
      res.setHeader('Content-Type', 'application/sarif+json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(sarif);
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();

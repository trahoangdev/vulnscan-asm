import prisma from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { parsePagination } from '../../utils/helpers';
import { executiveSummaryHtml, technicalDetailHtml, owaspComplianceHtml, pciDssComplianceHtml } from './templates';
import puppeteer from 'puppeteer';

export class ReportsService {
  /**
   * List all reports for an organization
   */
  async list(orgId: string, query: Record<string, any>) {
    const { page, limit, skip } = parsePagination(query);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.report.count({ where: { orgId } }),
    ]);

    return { reports, total, page, limit };
  }

  /**
   * Get report by ID
   */
  async getById(orgId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      throw ApiError.notFound('Report not found');
    }

    return report;
  }

  /**
   * Generate a new report (supports PDF, HTML, CSV, JSON)
   */
  async generate(orgId: string, data: {
    type: string;
    format?: string;
    title: string;
    parameters?: Record<string, any>;
  }) {
    const format = data.format || 'PDF';

    const report = await prisma.report.create({
      data: {
        orgId,
        type: data.type as any,
        title: data.title,
        format: format as any,
        status: 'generating',
        parameters: data.parameters || {},
      },
    });

    try {
      const reportData = await this.buildReportData(orgId, data.parameters);
      let fileUrl: string;
      let fileSize: number;

      if (format === 'PDF') {
        const html = this.renderHtml(data.type, reportData);
        const pdfBuffer = await this.htmlToPdf(html);
        fileUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
        fileSize = pdfBuffer.length;
      } else if (format === 'HTML') {
        const html = this.renderHtml(data.type, reportData);
        fileUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
        fileSize = Buffer.byteLength(html);
      } else if (format === 'CSV') {
        const csv = this.buildCsv(reportData);
        fileUrl = `data:text/csv;base64,${Buffer.from(csv).toString('base64')}`;
        fileSize = Buffer.byteLength(csv);
      } else {
        // JSON
        const json = JSON.stringify(reportData, null, 2);
        fileUrl = `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
        fileSize = Buffer.byteLength(json);
      }

      const updatedReport = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'ready',
          fileUrl,
          fileSize,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return updatedReport;
    } catch (error) {
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Pick HTML template based on report type
   */
  private renderHtml(type: string, data: any): string {
    switch (type) {
      case 'EXECUTIVE_SUMMARY':
        return executiveSummaryHtml(data);
      case 'COMPLIANCE_OWASP':
        return owaspComplianceHtml(data);
      case 'COMPLIANCE_PCI':
        return pciDssComplianceHtml(data);
      case 'TECHNICAL_DETAIL':
      default:
        return technicalDetailHtml(data);
    }
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Build CSV from report data (findings export)
   */
  private buildCsv(data: any): string {
    const headers = [
      'Title', 'Severity', 'CVSS', 'Category', 'OWASP', 'Status',
      'Affected URL', 'Target', 'Description', 'Remediation',
    ];
    const rows = (data.vulnerabilities || []).map((v: any) => [
      `"${(v.title || '').replace(/"/g, '""')}"`,
      v.severity,
      v.cvssScore ?? '',
      v.category,
      v.owaspCategory ?? '',
      v.status,
      `"${(v.affectedUrl || '').replace(/"/g, '""')}"`,
      `"${(v.scan?.target?.value || '').replace(/"/g, '""')}"`,
      `"${(v.description || '').replace(/"/g, '""')}"`,
      `"${(v.remediation || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
  }

  /**
   * Build report data from database
   */
  private async buildReportData(orgId: string, parameters?: Record<string, any>) {
    const targetIds = parameters?.targetIds;
    const dateFrom = parameters?.dateRange?.from;
    const dateTo = parameters?.dateRange?.to;
    const includeSeverities = parameters?.includeSeverities;

    const targetWhere: any = { orgId };
    if (targetIds?.length) {
      targetWhere.id = { in: targetIds };
    }

    const scanWhere: any = {
      target: targetWhere,
      status: 'COMPLETED',
    };
    if (dateFrom || dateTo) {
      scanWhere.createdAt = {};
      if (dateFrom) scanWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) scanWhere.createdAt.lte = new Date(dateTo);
    }

    const findingWhere: any = {
      scan: scanWhere,
    };
    if (includeSeverities?.length) {
      findingWhere.severity = { in: includeSeverities };
    }

    const [targets, scans, findings, assets] = await Promise.all([
      prisma.target.findMany({
        where: targetWhere,
        select: {
          id: true, value: true, type: true,
          verificationStatus: true, securityScore: true, lastScanAt: true,
        },
      }),
      prisma.scan.findMany({
        where: scanWhere,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, profile: true, status: true,
          totalAssets: true, totalVulns: true,
          criticalCount: true, highCount: true, mediumCount: true,
          lowCount: true, infoCount: true,
          startedAt: true, completedAt: true, duration: true,
          target: { select: { value: true } },
        },
      }),
      prisma.vulnFinding.findMany({
        where: findingWhere,
        orderBy: [{ severity: 'asc' }, { cvssScore: 'desc' }],
        select: {
          id: true, title: true, description: true,
          severity: true, cvssScore: true, category: true,
          owaspCategory: true, affectedUrl: true,
          remediation: true, status: true, firstFoundAt: true,
          scan: { select: { target: { select: { value: true } } } },
        },
      }),
      prisma.asset.count({ where: { target: targetWhere } }),
    ]);

    const severitySummary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    const categorySummary: Record<string, number> = {};
    for (const f of findings) {
      severitySummary[f.severity as keyof typeof severitySummary]++;
      categorySummary[f.category] = (categorySummary[f.category] || 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      organization: orgId,
      summary: {
        totalTargets: targets.length,
        totalAssets: assets,
        totalVulnerabilities: findings.length,
        totalScans: scans.length,
        severityBreakdown: severitySummary,
        categoryBreakdown: categorySummary,
      },
      targets,
      recentScans: scans,
      vulnerabilities: findings,
    };
  }

  /**
   * Download report — returns buffer/data + metadata
   */
  async download(orgId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      throw ApiError.notFound('Report not found');
    }
    if (report.status !== 'ready' || !report.fileUrl) {
      throw ApiError.badRequest('Report is not ready for download');
    }

    const format = report.format || 'JSON';
    const mimeMap: Record<string, string> = {
      PDF: 'application/pdf',
      HTML: 'text/html',
      CSV: 'text/csv',
      JSON: 'application/json',
    };
    const extMap: Record<string, string> = { PDF: 'pdf', HTML: 'html', CSV: 'csv', JSON: 'json' };
    const mime = mimeMap[format] || 'application/octet-stream';
    const ext = extMap[format] || 'json';

    // Extract data from base64 data URL
    const dataUrlPrefix = `data:${mime};base64,`;
    if (report.fileUrl.startsWith('data:')) {
      const b64 = report.fileUrl.substring(report.fileUrl.indexOf(',') + 1);
      const buffer = Buffer.from(b64, 'base64');
      return { buffer, mime, ext, title: report.title, format };
    }

    // S3/MinIO URL fallback
    return { url: report.fileUrl, mime, ext, title: report.title, format };
  }

  /**
   * Delete a report
   */
  async delete(orgId: string, reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      throw ApiError.notFound('Report not found');
    }

    await prisma.report.delete({ where: { id: reportId } });
    return { deleted: true };
  }
}

export const reportsService = new ReportsService();

/**
 * Tests for Report Templates (#52 / #53)
 * - brandedLayout()
 * - generateVulnListTemplate()
 * - generateAssetInventoryTemplate()
 * - generateCustomReport()
 */

import {
  executiveSummaryHtml,
  generateCustomReport,
  ReportBranding,
} from '../templates';

describe('Report Templates', () => {
  // ── Executive Summary (existing) ─────────────────────
  describe('executiveSummaryHtml', () => {
    it('should produce valid HTML with all sections', () => {
      const html = executiveSummaryHtml({
        summary: {
          totalTargets: 5,
          totalAssets: 120,
          totalFindings: 47,
          severityBreakdown: { CRITICAL: 3, HIGH: 12, MEDIUM: 20, LOW: 8, INFO: 4 },
          riskScore: 72,
        },
        targets: [{ value: 'example.com', riskScore: 72, findings: [{ severity: 'CRITICAL' }] }],
        recentScans: [],
        generatedAt: '2025-01-01T00:00:00Z',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Executive Summary');
      expect(html).toContain('example.com');
      expect(html).toContain('VulnScan ASM');
    });
  });

  // ── generateCustomReport (branded) ──────────────────
  describe('generateCustomReport', () => {
    const baseData = {
      target: 'test.example.com',
      scanDate: '2025-02-01',
      riskScore: 65,
      findings: [
        {
          severity: 'HIGH',
          title: 'SQL Injection',
          category: 'SQL_INJECTION',
          description: 'Input not sanitized',
          affectedUrl: '/api/users?id=1',
          remediation: 'Use parameterized queries',
          cveId: 'CVE-2024-0001',
          cweId: 'CWE-89',
        },
        {
          severity: 'MEDIUM',
          title: 'XSS Reflected',
          category: 'XSS',
          description: 'Script injection via search param',
          affectedUrl: '/search?q=test',
          remediation: 'Encode output',
        },
      ],
      assets: [
        { type: 'SUBDOMAIN', value: 'api.test.com', isActive: true, firstSeenAt: '2025-01-15' },
        { type: 'SUBDOMAIN', value: 'cdn.test.com', isActive: true, firstSeenAt: '2025-01-15' },
        { type: 'IP_ADDRESS', value: '1.2.3.4', isActive: true, firstSeenAt: '2025-01-15' },
      ],
      severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, INFO: 0 },
    };

    it('should generate vulnerability_list report', () => {
      const html = generateCustomReport('vulnerability_list', baseData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Vulnerability Report');
      expect(html).toContain('SQL Injection');
      expect(html).toContain('XSS Reflected');
      expect(html).toContain('/api/users?id=1');
      expect(html).toContain('CVE-2024-0001');
      expect(html).toContain('CWE-89');
      expect(html).toContain('Detailed Findings');
    });

    it('should generate asset_inventory report', () => {
      const html = generateCustomReport('asset_inventory', baseData);

      expect(html).toContain('Asset Inventory');
      expect(html).toContain('api.test.com');
      expect(html).toContain('cdn.test.com');
      expect(html).toContain('1.2.3.4');
      expect(html).toContain('SUBDOMAIN');
      expect(html).toContain('IP_ADDRESS');
      expect(html).toContain('Active');
    });

    it('should apply custom branding', () => {
      const branding: ReportBranding = {
        companyName: 'AcmeSec Corp',
        primaryColor: '#ff0000',
        accentColor: '#00ff00',
        headerText: '🔒 AcmeSec Security',
        footerText: 'Confidential — AcmeSec Corp 2025',
        showWatermark: true,
      };

      const html = generateCustomReport('vulnerability_list', baseData, branding);

      expect(html).toContain('AcmeSec Corp');
      expect(html).toContain('#ff0000');
      expect(html).toContain('#00ff00');
      expect(html).toContain('AcmeSec Security');
      expect(html).toContain('Confidential — AcmeSec Corp 2025');
      expect(html).toContain('watermark');
    });

    it('should support logo URL in branding', () => {
      const branding: ReportBranding = {
        logoUrl: 'https://example.com/logo.png',
        companyName: 'LogoCo',
      };

      const html = generateCustomReport('vulnerability_list', baseData, branding);

      expect(html).toContain('https://example.com/logo.png');
      expect(html).toContain('LogoCo');
    });

    it('should hide watermark when showWatermark is false', () => {
      const branding: ReportBranding = { showWatermark: false };

      const html = generateCustomReport('vulnerability_list', baseData, branding);

      expect(html).not.toContain('class="watermark"');
    });

    it('should handle empty findings', () => {
      const emptyData = {
        ...baseData,
        findings: [],
        severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
      };

      const html = generateCustomReport('vulnerability_list', emptyData);

      expect(html).toContain('No vulnerabilities found');
    });

    it('should fallback to vuln list for unknown template type', () => {
      const html = generateCustomReport('executive_summary' as any, baseData);

      // Should still produce valid HTML (falls to default case)
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Vulnerability Report');
    });
  });
});

import { OWASP_TOP_10, SEVERITY_CONFIG, VULN_TO_OWASP } from '../../../../shared/constants/index';

/**
 * Report template engine — generates HTML reports
 */

const BRAND_COLOR = '#1e40af';
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#6b7280',
};

function baseLayout(title: string, body: string, generatedAt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.6; font-size: 13px; }
    .page { padding: 40px; max-width: 900px; margin: auto; }
    .header { border-bottom: 3px solid ${BRAND_COLOR}; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: ${BRAND_COLOR}; font-size: 24px; }
    .header .meta { color: #6b7280; font-size: 12px; margin-top: 6px; }
    h2 { color: ${BRAND_COLOR}; font-size: 18px; margin: 28px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 15px; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 12px; }
    th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0 24px; }
    .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-card .value { font-size: 28px; font-weight: 700; }
    .stat-card .label { color: #6b7280; font-size: 11px; text-transform: uppercase; margin-top: 4px; }
    .sev-bar { display: flex; height: 28px; border-radius: 6px; overflow: hidden; margin: 10px 0 20px; }
    .sev-bar > div { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; }
    .finding-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
    .finding-card .title { font-weight: 600; font-size: 14px; }
    .finding-card .meta { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .finding-card .desc { margin-top: 8px; font-size: 12px; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 40px; color: #9ca3af; font-size: 11px; text-align: center; }
    .owasp-item { border-left: 3px solid ${BRAND_COLOR}; padding: 10px 14px; margin-bottom: 12px; background: #f8fafc; }
    .owasp-item .id { font-weight: 700; color: ${BRAND_COLOR}; }
    .owasp-item .count { float: right; background: #ef4444; color: #fff; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .pass { color: #16a34a; font-weight: 600; }
    .fail { color: #ef4444; font-weight: 600; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>🛡️ VulnScan ASM</h1>
      <div class="meta">Generated on ${new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
    </div>
    ${body}
    <div class="footer">
      © ${new Date().getFullYear()} VulnScan ASM — Confidential Security Report
    </div>
  </div>
</body>
</html>`;
}

function severityBadge(sev: string): string {
  return `<span class="badge" style="background:${SEVERITY_COLORS[sev] || '#6b7280'}">${sev}</span>`;
}

function severityBarHtml(s: Record<string, number>): string {
  const total = (s.CRITICAL || 0) + (s.HIGH || 0) + (s.MEDIUM || 0) + (s.LOW || 0) + (s.INFO || 0);
  if (total === 0) return '<p>No vulnerabilities found.</p>';
  const bar = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const)
    .filter((k) => s[k] > 0)
    .map((k) => `<div style="background:${SEVERITY_COLORS[k]};width:${(s[k]! / total) * 100}%">${s[k]}</div>`)
    .join('');
  return `<div class="sev-bar">${bar}</div>`;
}

// ========================
// Executive Summary Template
// ========================
export function executiveSummaryHtml(data: any): string {
  const { summary, targets, recentScans, generatedAt } = data;
  const s = summary.severityBreakdown;

  const body = `
    <h2>Executive Summary</h2>
    <p>This report provides a high-level overview of the security posture across ${summary.totalTargets} monitored target(s).</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="value">${summary.totalTargets}</div>
        <div class="label">Targets</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalAssets}</div>
        <div class="label">Assets</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalVulnerabilities}</div>
        <div class="label">Vulnerabilities</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalScans}</div>
        <div class="label">Scans</div>
      </div>
    </div>

    <h2>Severity Distribution</h2>
    ${severityBarHtml(s)}
    <table>
      <thead><tr><th>Severity</th><th>Count</th><th>% of Total</th></tr></thead>
      <tbody>
        ${['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((sev) => {
          const count = s[sev] || 0;
          const pct = summary.totalVulnerabilities > 0 ? ((count / summary.totalVulnerabilities) * 100).toFixed(1) : '0.0';
          return `<tr><td>${severityBadge(sev)}</td><td>${count}</td><td>${pct}%</td></tr>`;
        }).join('')}
      </tbody>
    </table>

    <h2>Targets Overview</h2>
    <table>
      <thead><tr><th>Target</th><th>Type</th><th>Status</th><th>Security Score</th></tr></thead>
      <tbody>
        ${targets.map((t: any) => `
          <tr>
            <td><strong>${t.value}</strong></td>
            <td>${t.type}</td>
            <td>${t.verificationStatus}</td>
            <td>${t.securityScore !== null ? t.securityScore + '/100' : 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Recent Scans</h2>
    <table>
      <thead><tr><th>Target</th><th>Profile</th><th>Date</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr></thead>
      <tbody>
        ${recentScans.slice(0, 10).map((sc: any) => `
          <tr>
            <td>${sc.target?.value || 'N/A'}</td>
            <td>${sc.profile}</td>
            <td>${sc.completedAt ? new Date(sc.completedAt).toLocaleDateString() : 'In progress'}</td>
            <td style="color:${SEVERITY_COLORS.CRITICAL};font-weight:600">${sc.criticalCount || 0}</td>
            <td style="color:${SEVERITY_COLORS.HIGH};font-weight:600">${sc.highCount || 0}</td>
            <td style="color:${SEVERITY_COLORS.MEDIUM};font-weight:600">${sc.mediumCount || 0}</td>
            <td style="color:${SEVERITY_COLORS.LOW};font-weight:600">${sc.lowCount || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Top Vulnerability Categories</h2>
    <table>
      <thead><tr><th>Category</th><th>Count</th></tr></thead>
      <tbody>
        ${Object.entries(summary.categoryBreakdown)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 10)
          .map(([cat, count]: any) => `<tr><td>${cat.replace(/_/g, ' ')}</td><td>${count}</td></tr>`)
          .join('')}
      </tbody>
    </table>
  `;

  return baseLayout('Executive Summary Report', body, generatedAt);
}

// ========================
// Technical Detail Template
// ========================
export function technicalDetailHtml(data: any): string {
  const { summary, vulnerabilities, generatedAt } = data;
  const s = summary.severityBreakdown;

  const body = `
    <h2>Technical Security Report</h2>
    <p>Detailed vulnerability findings with evidence and remediation guidance.</p>

    <h2>Summary</h2>
    ${severityBarHtml(s)}
    <p>Total findings: <strong>${summary.totalVulnerabilities}</strong> across ${summary.totalTargets} target(s).</p>

    <h2>All Findings (${vulnerabilities.length})</h2>
    ${vulnerabilities.length === 0 ? '<p>No findings to report.</p>' : ''}
    ${vulnerabilities.map((v: any, i: number) => `
      <div class="finding-card" style="border-left: 4px solid ${SEVERITY_COLORS[v.severity] || '#6b7280'}">
        <div class="title">${i + 1}. ${v.title}</div>
        <div class="meta">
          ${severityBadge(v.severity)}
          ${v.cvssScore ? `CVSS: ${v.cvssScore}` : ''}
          &nbsp;|&nbsp; Category: ${v.category.replace(/_/g, ' ')}
          ${v.owaspCategory ? `&nbsp;|&nbsp; ${v.owaspCategory}` : ''}
          &nbsp;|&nbsp; Status: ${v.status}
        </div>
        ${v.affectedUrl ? `<div class="meta">URL: ${v.affectedUrl}</div>` : ''}
        ${v.scan?.target?.value ? `<div class="meta">Target: ${v.scan.target.value}</div>` : ''}
        <div class="desc">${v.description || ''}</div>
        ${v.remediation ? `<div class="desc"><strong>Remediation:</strong> ${v.remediation}</div>` : ''}
      </div>
    `).join('')}
  `;

  return baseLayout('Technical Detail Report', body, generatedAt);
}

// ========================
// OWASP Compliance Template
// ========================
export function owaspComplianceHtml(data: any): string {
  const { vulnerabilities, generatedAt, summary } = data;

  // Build OWASP mapping from findings
  const owaspFindings: Record<string, any[]> = {};
  for (const entry of Object.values(OWASP_TOP_10)) {
    owaspFindings[entry.id] = [];
  }

  for (const v of vulnerabilities) {
    const owaspId = VULN_TO_OWASP[v.category];
    if (owaspId && owaspFindings[owaspId]) {
      owaspFindings[owaspId].push(v);
    }
  }

  const body = `
    <h2>OWASP Top 10 (2021) Compliance Report</h2>
    <p>Mapping of discovered vulnerabilities to the OWASP Top 10 categories.</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="value">${Object.values(owaspFindings).filter((arr) => arr.length > 0).length}/10</div>
        <div class="label">Categories Affected</div>
      </div>
      <div class="stat-card">
        <div class="value">${Object.values(owaspFindings).filter((arr) => arr.length === 0).length}/10</div>
        <div class="label">Categories Clear</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalVulnerabilities}</div>
        <div class="label">Total Findings</div>
      </div>
      <div class="stat-card">
        <div class="value">${summary.totalTargets}</div>
        <div class="label">Targets Assessed</div>
      </div>
    </div>

    <h2>Category Breakdown</h2>
    ${Object.entries(OWASP_TOP_10).map(([key, entry]) => {
      const findings = owaspFindings[entry.id] || [];
      const status = findings.length > 0 ? 'fail' : 'pass';
      return `
        <div class="owasp-item">
          <span class="id">${entry.id}</span> — ${entry.name}
          ${findings.length > 0 ? `<span class="count">${findings.length} finding(s)</span>` : ''}
          <br><span class="${status}">${status === 'pass' ? '✅ PASS' : '❌ FAIL'}</span>
          <p style="color:#6b7280;font-size:12px;margin-top:4px">${entry.description}</p>
          ${findings.length > 0 ? `
            <table style="margin-top:8px">
              <thead><tr><th>Severity</th><th>Finding</th><th>Target</th></tr></thead>
              <tbody>
                ${findings.slice(0, 5).map((f: any) => `
                  <tr>
                    <td>${severityBadge(f.severity)}</td>
                    <td>${f.title}</td>
                    <td>${f.scan?.target?.value || ''}</td>
                  </tr>
                `).join('')}
                ${findings.length > 5 ? `<tr><td colspan="3" style="color:#6b7280">...and ${findings.length - 5} more</td></tr>` : ''}
              </tbody>
            </table>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;

  return baseLayout('OWASP Top 10 Compliance Report', body, generatedAt);
}

// ========================================
// PCI-DSS Compliance Template
// ========================================

const PCI_DSS_REQUIREMENTS: { id: string; title: string; vulnCategories: string[] }[] = [
  { id: '1', title: 'Install and maintain network security controls', vulnCategories: ['OPEN_PORTS', 'FIREWALL_MISCONFIG'] },
  { id: '2', title: 'Apply secure configurations to all system components', vulnCategories: ['SECURITY_HEADERS', 'SERVER_INFO_DISCLOSURE', 'DEFAULT_CREDENTIALS', 'DIRECTORY_LISTING'] },
  { id: '3', title: 'Protect stored account data', vulnCategories: ['SENSITIVE_DATA_EXPOSURE', 'INFORMATION_DISCLOSURE'] },
  { id: '4', title: 'Protect cardholder data with strong cryptography during transmission', vulnCategories: ['SSL_TLS', 'CERTIFICATE_EXPIRY', 'WEAK_CIPHER'] },
  { id: '5', title: 'Protect all systems and networks from malicious software', vulnCategories: ['MALWARE', 'FILE_UPLOAD'] },
  { id: '6', title: 'Develop and maintain secure systems and software', vulnCategories: ['SQL_INJECTION', 'XSS_REFLECTED', 'XSS_STORED', 'COMMAND_INJECTION', 'PATH_TRAVERSAL', 'SSRF', 'LFI', 'OPEN_REDIRECT', 'CORS_MISCONFIG', 'COOKIE_SECURITY', 'CSRF'] },
  { id: '7', title: 'Restrict access to system components and cardholder data by business need to know', vulnCategories: ['IDOR', 'BROKEN_AUTH', 'EXPOSED_ADMIN'] },
  { id: '8', title: 'Identify users and authenticate access to system components', vulnCategories: ['BROKEN_AUTH', 'DEFAULT_CREDENTIALS', 'WEAK_PASSWORD'] },
  { id: '9', title: 'Restrict physical access to cardholder data', vulnCategories: [] },
  { id: '10', title: 'Log and monitor all access to system components and cardholder data', vulnCategories: ['LOGGING_MISSING'] },
  { id: '11', title: 'Test security of systems and networks regularly', vulnCategories: ['OUTDATED_SOFTWARE', 'CVE_MATCH'] },
  { id: '12', title: 'Support information security with organizational policies and programs', vulnCategories: ['EMAIL_SECURITY'] },
];

export function pciDssComplianceHtml(data: any): string {
  const generatedAt = new Date().toISOString();
  const findings = data.findings || [];

  // Map findings to PCI requirements
  const reqResults = PCI_DSS_REQUIREMENTS.map((req) => {
    const relatedFindings = findings.filter((f: any) =>
      req.vulnCategories.includes(f.category)
    );
    const hasCritical = relatedFindings.some((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    const status = req.vulnCategories.length === 0
      ? 'N/A'
      : relatedFindings.length === 0
        ? 'PASS'
        : hasCritical ? 'FAIL' : 'WARN';
    return { ...req, findings: relatedFindings, status };
  });

  const passCount = reqResults.filter((r) => r.status === 'PASS').length;
  const failCount = reqResults.filter((r) => r.status === 'FAIL').length;
  const warnCount = reqResults.filter((r) => r.status === 'WARN').length;
  const naCount = reqResults.filter((r) => r.status === 'N/A').length;
  const complianceScore = Math.round((passCount / (reqResults.length - naCount)) * 100) || 0;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PASS: 'background:#22c55e;color:#fff',
      FAIL: 'background:#ef4444;color:#fff',
      WARN: 'background:#f59e0b;color:#fff',
      'N/A': 'background:#9ca3af;color:#fff',
    };
    return `<span style="${colors[status] || colors['N/A']};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${status}</span>`;
  };

  const body = `
    <h2>PCI-DSS v4.0 Compliance Assessment</h2>
    <p style="color:#6b7280">Assessment of ${data.targets?.length || 0} target(s) against PCI-DSS requirements based on automated scanning results.</p>

    <div style="display:flex;gap:16px;margin:20px 0">
      <div style="flex:1;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${complianceScore}%</div>
        <div style="font-size:12px;color:#6b7280">Compliance Score</div>
      </div>
      <div style="flex:1;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#22c55e">${passCount}</div>
        <div style="font-size:12px;color:#6b7280">Pass</div>
      </div>
      <div style="flex:1;padding:16px;background:#fef2f2;border-radius:8px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#ef4444">${failCount}</div>
        <div style="font-size:12px;color:#6b7280">Fail</div>
      </div>
      <div style="flex:1;padding:16px;background:#fffbeb;border-radius:8px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#f59e0b">${warnCount}</div>
        <div style="font-size:12px;color:#6b7280">Warning</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:60px">Req #</th>
          <th>Requirement</th>
          <th style="width:80px">Status</th>
          <th style="width:80px">Findings</th>
        </tr>
      </thead>
      <tbody>
        ${reqResults.map((r) => `
          <tr>
            <td style="font-weight:700">${r.id}</td>
            <td>${r.title}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${r.findings.length > 0 ? r.findings.length : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${failCount > 0 ? `
      <h3 style="margin-top:24px">Failed Requirements — Details</h3>
      ${reqResults.filter((r) => r.status === 'FAIL').map((r) => `
        <div class="owasp-item">
          <div class="id">Requirement ${r.id}: ${r.title}</div>
          <table style="margin-top:8px">
            <thead><tr><th>Severity</th><th>Finding</th><th>Target</th></tr></thead>
            <tbody>
              ${r.findings.slice(0, 10).map((f: any) => `
                <tr>
                  <td><span style="${
                    f.severity === 'CRITICAL' ? 'background:#ef4444;color:#fff' :
                    f.severity === 'HIGH' ? 'background:#f97316;color:#fff' :
                    'background:#eab308;color:#fff'
                  };padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${f.severity}</span></td>
                  <td>${f.title}</td>
                  <td>${f.scan?.target?.value || ''}</td>
                </tr>
              `).join('')}
              ${r.findings.length > 10 ? `<tr><td colspan="3" style="color:#6b7280">...and ${r.findings.length - 10} more</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      `).join('')}
    ` : ''}

    <div style="margin-top:24px;padding:12px;background:#eff6ff;border-radius:8px;font-size:12px;color:#6b7280">
      <strong>Disclaimer:</strong> This automated assessment provides an indication of compliance posture based on technical scanning results. 
      A full PCI-DSS assessment requires manual review by a Qualified Security Assessor (QSA).
    </div>
  `;

  return baseLayout('PCI-DSS Compliance Report', body, generatedAt);
}

// ============================================
// VulnScan ASM — Shared Constants
// ============================================

// ========================
// Scan Profiles Config
// ========================
export const SCAN_PROFILES = {
  QUICK: {
    name: 'Quick Scan',
    description: 'Basic health check — SSL, DNS, technology detection',
    estimatedDuration: 300, // 5 minutes
    modules: ['dns_enumerator', 'ssl_analyzer', 'tech_detector'],
  },
  STANDARD: {
    name: 'Standard Scan',
    description: 'Comprehensive scan — discovery + web crawl + admin detection',
    estimatedDuration: 1200, // 20 minutes
    modules: [
      'dns_enumerator',
      'port_scanner',
      'ssl_analyzer',
      'web_crawler',
      'tech_detector',
      'admin_detector',
    ],
  },
  DEEP: {
    name: 'Deep Scan',
    description: 'Full assessment — all modules including active vulnerability testing & CVE matching',
    estimatedDuration: 3600, // 60 minutes
    modules: [
      'dns_enumerator',
      'port_scanner',
      'ssl_analyzer',
      'web_crawler',
      'tech_detector',
      'vuln_checker',
      'subdomain_takeover',
      'admin_detector',
      'nvd_cve_matcher',
    ],
  },
} as const;

// All available scanner modules
export const SCANNER_MODULES = [
  { id: 'dns_enumerator', name: 'DNS Enumeration', description: 'DNS records & subdomain discovery' },
  { id: 'port_scanner', name: 'Port Scanner', description: 'TCP port scanning via nmap' },
  { id: 'ssl_analyzer', name: 'SSL/TLS Analyzer', description: 'Certificate & TLS configuration checks' },
  { id: 'web_crawler', name: 'Web Crawler', description: 'HTTP endpoint discovery & security headers' },
  { id: 'tech_detector', name: 'Tech Detector', description: 'Technology fingerprinting' },
  { id: 'vuln_checker', name: 'Vulnerability Checker', description: 'Active injection testing (SQLi, XSS, SSRF, LFI)' },
  { id: 'subdomain_takeover', name: 'Subdomain Takeover', description: 'Dangling CNAME & unclaimed service detection' },
  { id: 'admin_detector', name: 'Admin Panel Detector', description: 'Exposed admin interfaces & login pages' },
  { id: 'nvd_cve_matcher', name: 'NVD CVE Matcher', description: 'Known CVE lookup via NVD API' },
] as const;

// ========================
// Severity Config
// ========================
export const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Critical', color: '#DC2626', cvssMin: 9.0, cvssMax: 10.0, slaHours: 24 },
  HIGH:     { label: 'High',     color: '#EA580C', cvssMin: 7.0, cvssMax: 8.9,  slaHours: 168 },
  MEDIUM:   { label: 'Medium',   color: '#CA8A04', cvssMin: 4.0, cvssMax: 6.9,  slaHours: 720 },
  LOW:      { label: 'Low',      color: '#2563EB', cvssMin: 0.1, cvssMax: 3.9,  slaHours: 2160 },
  INFO:     { label: 'Info',     color: '#6B7280', cvssMin: 0.0, cvssMax: 0.0,  slaHours: 0 },
} as const;

// ========================
// Plan Limits
// ========================
export const PLAN_LIMITS = {
  STARTER:      { maxTargets: 1,   maxScansPerMonth: 10,  maxTeamMembers: 1,  apiAccess: false, scheduling: false },
  PROFESSIONAL: { maxTargets: 5,   maxScansPerMonth: 50,  maxTeamMembers: 3,  apiAccess: true,  scheduling: true },
  BUSINESS:     { maxTargets: 20,  maxScansPerMonth: 200, maxTeamMembers: 10, apiAccess: true,  scheduling: true },
  ENTERPRISE:   { maxTargets: -1,  maxScansPerMonth: -1,  maxTeamMembers: -1, apiAccess: true,  scheduling: true },
} as const;

// ========================
// Validation
// ========================
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  ORG_NAME_MAX_LENGTH: 100,
  TARGET_LABEL_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  TAGS_MAX_COUNT: 10,
  TAG_MAX_LENGTH: 30,
} as const;

// ========================
// API
// ========================
export const API = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_FREE: 100,
  RATE_LIMIT_MAX_PAID: 1000,
} as const;

// ========================
// Scanner
// ========================
export const SCANNER = {
  MAX_SCAN_DURATION_MS: 3_600_000,    // 60 minutes
  DEFAULT_RATE_LIMIT: 10,              // requests per second per target
  MAX_RESPONSE_SIZE: 5_242_880,        // 5MB
  REQUEST_TIMEOUT_MS: 30_000,          // 30 seconds
  USER_AGENT: 'VulnScan-ASM/1.0 (+https://vulnscan.io/bot)',
  BLOCKED_IP_RANGES: [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '0.0.0.0/8',
    '100.64.0.0/10',
  ],
} as const;

// ========================
// OWASP Top 10 (2021) Mapping
// ========================
export const OWASP_TOP_10 = {
  'A01': {
    id: 'A01:2021',
    name: 'Broken Access Control',
    description: 'Restrictions on what authenticated users are allowed to do are not properly enforced.',
    categories: ['OPEN_REDIRECT', 'PATH_TRAVERSAL', 'IDOR', 'CSRF', 'DIRECTORY_LISTING'],
  },
  'A02': {
    id: 'A02:2021',
    name: 'Cryptographic Failures',
    description: 'Failures related to cryptography which often lead to sensitive data exposure.',
    categories: ['SSL_TLS', 'CERT_ISSUE', 'COOKIE_SECURITY'],
  },
  'A03': {
    id: 'A03:2021',
    name: 'Injection',
    description: 'User-supplied data is not validated, filtered, or sanitized by the application.',
    categories: ['SQL_INJECTION', 'XSS_REFLECTED', 'XSS_STORED', 'COMMAND_INJECTION', 'LFI', 'RFI'],
  },
  'A04': {
    id: 'A04:2021',
    name: 'Insecure Design',
    description: 'Missing or ineffective control design. Requires threat modeling and secure design patterns.',
    categories: [],
  },
  'A05': {
    id: 'A05:2021',
    name: 'Security Misconfiguration',
    description: 'Missing security hardening, misconfigured permissions, unnecessary features enabled.',
    categories: ['SECURITY_HEADERS', 'CORS_MISCONFIG', 'HTTP_METHODS', 'INFO_DISCLOSURE', 'DEFAULT_CREDENTIALS', 'SENSITIVE_FILE'],
  },
  'A06': {
    id: 'A06:2021',
    name: 'Vulnerable and Outdated Components',
    description: 'Using components with known vulnerabilities.',
    categories: ['OUTDATED_SOFTWARE'],
  },
  'A07': {
    id: 'A07:2021',
    name: 'Identification and Authentication Failures',
    description: 'Confirmation of user identity, authentication, and session management is weak.',
    categories: [],
  },
  'A08': {
    id: 'A08:2021',
    name: 'Software and Data Integrity Failures',
    description: 'Code and infrastructure that does not protect against integrity violations.',
    categories: [],
  },
  'A09': {
    id: 'A09:2021',
    name: 'Security Logging and Monitoring Failures',
    description: 'Insufficient logging, detection, monitoring, and active response.',
    categories: [],
  },
  'A10': {
    id: 'A10:2021',
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'Fetching a remote resource without validating the user-supplied URL.',
    categories: ['SSRF'],
  },
} as const;

/**
 * Get OWASP category ID from VulnCategory
 */
export function getOwaspFromCategory(category: string): string | null {
  for (const [key, entry] of Object.entries(OWASP_TOP_10)) {
    if ((entry.categories as readonly string[]).includes(category)) {
      return entry.id;
    }
  }
  return null;
}

/** Map VulnCategory → OWASP ID lookup (flat) */
export const VULN_TO_OWASP: Record<string, string> = {};
for (const [key, entry] of Object.entries(OWASP_TOP_10)) {
  for (const cat of entry.categories) {
    VULN_TO_OWASP[cat] = entry.id;
  }
}

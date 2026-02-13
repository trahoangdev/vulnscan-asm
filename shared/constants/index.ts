// ============================================
// VulnScan ASM — Shared Constants
// ============================================

// ========================
// Scan Profiles Config
// ========================
export const SCAN_PROFILES = {
  QUICK: {
    name: 'Quick Scan',
    description: 'Basic health check — headers, SSL, exposed files',
    estimatedDuration: 300, // 5 minutes
    modules: ['header_check', 'ssl_check', 'sensitive_files', 'port_scan_top20'],
  },
  STANDARD: {
    name: 'Standard Scan',
    description: 'Comprehensive scan — discovery + OWASP top vulnerabilities',
    estimatedDuration: 1200, // 20 minutes
    modules: [
      'subdomain_enum',
      'port_scan_top100',
      'tech_detect',
      'header_check',
      'ssl_check',
      'cors_check',
      'cookie_check',
      'sensitive_files',
      'directory_listing',
      'sqli_scan',
      'xss_scan',
      'open_redirect',
      'email_security',
    ],
  },
  DEEP: {
    name: 'Deep Scan',
    description: 'Full assessment — all modules, thorough testing',
    estimatedDuration: 3600, // 60 minutes
    modules: [
      'subdomain_enum',
      'subdomain_bruteforce',
      'port_scan_full',
      'tech_detect',
      'header_check',
      'ssl_check',
      'cors_check',
      'cookie_check',
      'sensitive_files',
      'directory_enum',
      'directory_listing',
      'sqli_scan',
      'xss_scan',
      'ssrf_scan',
      'path_traversal',
      'open_redirect',
      'http_methods',
      'info_disclosure',
      'email_security',
      'service_version',
    ],
  },
} as const;

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

// ============================================
// VulnScan ASM — Shared Type Definitions
// ============================================
// Types shared between client and server

// ========================
// Enums
// ========================

export enum Plan {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  BUSINESS = 'BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
}

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum TargetType {
  DOMAIN = 'DOMAIN',
  IP = 'IP',
  CIDR = 'CIDR',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum VerificationMethod {
  DNS_TXT = 'DNS_TXT',
  HTML_FILE = 'HTML_FILE',
  META_TAG = 'META_TAG',
}

export enum ScanProfile {
  QUICK = 'QUICK',
  STANDARD = 'STANDARD',
  DEEP = 'DEEP',
  CUSTOM = 'CUSTOM',
}

export enum ScanStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ScanType {
  ON_DEMAND = 'ON_DEMAND',
  SCHEDULED = 'SCHEDULED',
  CONTINUOUS = 'CONTINUOUS',
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  FIXED = 'FIXED',
  ACCEPTED = 'ACCEPTED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export enum VulnCategory {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS_REFLECTED = 'XSS_REFLECTED',
  XSS_STORED = 'XSS_STORED',
  SSRF = 'SSRF',
  LFI = 'LFI',
  RFI = 'RFI',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  OPEN_REDIRECT = 'OPEN_REDIRECT',
  CSRF = 'CSRF',
  IDOR = 'IDOR',
  CORS_MISCONFIG = 'CORS_MISCONFIG',
  SECURITY_HEADERS = 'SECURITY_HEADERS',
  SSL_TLS = 'SSL_TLS',
  CERT_ISSUE = 'CERT_ISSUE',
  INFO_DISCLOSURE = 'INFO_DISCLOSURE',
  DIRECTORY_LISTING = 'DIRECTORY_LISTING',
  SENSITIVE_FILE = 'SENSITIVE_FILE',
  OUTDATED_SOFTWARE = 'OUTDATED_SOFTWARE',
  DEFAULT_CREDENTIALS = 'DEFAULT_CREDENTIALS',
  EMAIL_SECURITY = 'EMAIL_SECURITY',
  COOKIE_SECURITY = 'COOKIE_SECURITY',
  HTTP_METHODS = 'HTTP_METHODS',
  OTHER = 'OTHER',
}

// ========================
// API Response Types
// ========================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ========================
// Entity Types
// ========================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  timezone: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  maxTargets: number;
  maxScansPerMonth: number;
  scansUsed: number;
}

export interface Target {
  id: string;
  orgId: string;
  type: TargetType;
  value: string;
  label?: string;
  verificationStatus: VerificationStatus;
  scanProfile: ScanProfile;
  securityScore?: number;
  tags: string[];
  lastScanAt?: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  targetId: string;
  status: ScanStatus;
  profile: ScanProfile;
  progress: number;
  modules: string[];
  totalVulns?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  infoCount?: number;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface Asset {
  id: string;
  targetId: string;
  type: string;
  value: string;
  ip?: string;
  ports?: PortInfo[];
  technologies?: TechInfo[];
  httpStatus?: number;
  sslInfo?: SslInfo;
  isActive: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PortInfo {
  port: number;
  protocol: string;
  service?: string;
  version?: string;
}

export interface TechInfo {
  name: string;
  version?: string;
  category?: string;
}

export interface SslInfo {
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  grade: string;
}

export interface VulnFinding {
  id: string;
  scanId: string;
  assetId?: string;
  title: string;
  description: string;
  severity: Severity;
  cvssScore?: number;
  cvssVector?: string;
  category: VulnCategory;
  owaspCategory?: string;
  cveId?: string;
  cweId?: string;
  affectedUrl?: string;
  remediation?: string;
  references: string[];
  status: FindingStatus;
  firstFoundAt: string;
  lastFoundAt: string;
  occurrences: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ========================
// Dashboard Types
// ========================

export interface DashboardStats {
  securityScore: number;
  totalTargets: number;
  totalAssets: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recentScans: Scan[];
  topVulnerableAssets: Array<{
    asset: Asset;
    vulnCount: number;
  }>;
}

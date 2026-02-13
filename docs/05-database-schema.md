# 🗄️ Database Schema — VulnScan ASM

## 1. ERD Overview

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  users   │────<│ org_     │>────│organizations │
│          │     │ members  │     │              │
└──────────┘     └──────────┘     └──────┬───────┘
     │                                    │
     │                              ┌─────┴────────┐
     │                              │   targets     │
     │                              │              │
     │                              └─────┬────────┘
     │                                    │
     │                              ┌─────┴────────┐
     │                              │   scans      │
     │                              │              │
     │                              └─────┬────────┘
     │                                    │
     │                     ┌──────────────┼──────────────┐
     │                     │              │              │
     │              ┌──────┴───┐  ┌───────┴────┐  ┌─────┴──────┐
     │              │ assets   │  │ vuln_      │  │ scan_      │
     │              │          │  │ findings   │  │ results    │
     │              └──────────┘  └────────────┘  └────────────┘
     │
     │         ┌──────────────┐     ┌──────────────┐
     └────────<│ api_keys     │     │notifications │
               └──────────────┘     └──────────────┘
```

## 2. Schema Definitions (Prisma)

### 2.1 Users & Authentication

```prisma
// =============================================
// USER & AUTHENTICATION
// =============================================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   @map("password_hash")
  name            String
  avatar          String?
  emailVerified   Boolean   @default(false) @map("email_verified")
  emailVerifyToken String?  @map("email_verify_token")
  resetToken      String?   @map("reset_token")
  resetTokenExp   DateTime? @map("reset_token_exp")
  twoFactorEnabled Boolean  @default(false) @map("two_factor_enabled")
  twoFactorSecret  String?  @map("two_factor_secret")
  timezone        String    @default("UTC")
  lastLoginAt     DateTime? @map("last_login_at")
  lastLoginIp     String?   @map("last_login_ip")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  orgMemberships  OrgMember[]
  apiKeys         ApiKey[]
  scansCreated    Scan[]        @relation("ScanCreator")
  notifications   Notification[]
  oauthAccounts   OAuthAccount[]

  @@map("users")
}

model OAuthAccount {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  provider    String   // "google", "github"
  providerId  String   @map("provider_id")
  accessToken String?  @map("access_token")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@map("oauth_accounts")
}

model ApiKey {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  orgId       String    @map("org_id")
  name        String
  keyHash     String    @unique @map("key_hash")
  keyPrefix   String    @map("key_prefix")  // "vsa_xxxx" hiển thị cho user
  permissions String[]  @default(["read"])   // ["read", "write", "scan"]
  lastUsedAt  DateTime? @map("last_used_at")
  expiresAt   DateTime? @map("expires_at")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("api_keys")
}
```

### 2.2 Organization & Team

```prisma
// =============================================
// ORGANIZATION & TEAM
// =============================================

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  plan        Plan     @default(STARTER)
  maxTargets  Int      @default(1) @map("max_targets")
  maxScansPerMonth Int @default(10) @map("max_scans_per_month")
  scansUsed   Int      @default(0) @map("scans_used")
  billingEmail String? @map("billing_email")
  stripeCustomerId String? @map("stripe_customer_id")
  stripeSubId String?  @map("stripe_sub_id")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  members     OrgMember[]
  targets     Target[]
  apiKeys     ApiKey[]
  reports     Report[]

  @@map("organizations")
}

model OrgMember {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  orgId     String   @map("org_id")
  role      OrgRole  @default(MEMBER)
  invitedBy String?  @map("invited_by")
  joinedAt  DateTime @default(now()) @map("joined_at")

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
  @@map("org_members")
}

enum Plan {
  STARTER
  PROFESSIONAL
  BUSINESS
  ENTERPRISE
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

### 2.3 Targets & Domain Verification

```prisma
// =============================================
// TARGETS & DOMAIN VERIFICATION
// =============================================

model Target {
  id                String             @id @default(cuid())
  orgId             String             @map("org_id")
  type              TargetType         @default(DOMAIN)
  value             String             // domain name or IP
  label             String?            // friendly name
  notes             String?
  verificationStatus VerificationStatus @default(PENDING) @map("verification_status")
  verificationToken  String?           @map("verification_token")
  verificationMethod VerificationMethod? @map("verification_method")
  verifiedAt        DateTime?          @map("verified_at")
  lastScanAt        DateTime?          @map("last_scan_at")
  nextScanAt        DateTime?          @map("next_scan_at")
  scanSchedule      String?            @map("scan_schedule")  // cron expression
  scanProfile       ScanProfile        @default(STANDARD) @map("scan_profile")
  securityScore     Int?               @map("security_score")  // 0-100
  tags              String[]           @default([])
  isActive          Boolean            @default(true) @map("is_active")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  scans        Scan[]
  assets       Asset[]

  @@unique([orgId, value])
  @@map("targets")
}

enum TargetType {
  DOMAIN
  IP
  CIDR
}

enum VerificationStatus {
  PENDING
  VERIFIED
  FAILED
  EXPIRED
}

enum VerificationMethod {
  DNS_TXT
  HTML_FILE
  META_TAG
}

enum ScanProfile {
  QUICK
  STANDARD
  DEEP
  CUSTOM
}
```

### 2.4 Scans

```prisma
// =============================================
// SCANS
// =============================================

model Scan {
  id              String     @id @default(cuid())
  targetId        String     @map("target_id")
  createdById     String     @map("created_by_id")
  type            ScanType   @default(ON_DEMAND)
  profile         ScanProfile @default(STANDARD)
  status          ScanStatus @default(QUEUED)
  modules         String[]   @default([])  // ["discovery", "web_scan", "ssl_check"]
  progress        Int        @default(0)   // 0-100
  startedAt       DateTime?  @map("started_at")
  completedAt     DateTime?  @map("completed_at")
  duration        Int?       // seconds
  errorMessage    String?    @map("error_message")

  // Summary (populated after scan completes)
  totalAssets     Int?       @map("total_assets")
  newAssets       Int?       @map("new_assets")
  totalVulns      Int?       @map("total_vulns")
  criticalCount   Int?       @default(0) @map("critical_count")
  highCount       Int?       @default(0) @map("high_count")
  mediumCount     Int?       @default(0) @map("medium_count")
  lowCount        Int?       @default(0) @map("low_count")
  infoCount       Int?       @default(0) @map("info_count")

  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  // Relations
  target          Target     @relation(fields: [targetId], references: [id], onDelete: Cascade)
  createdBy       User       @relation("ScanCreator", fields: [createdById], references: [id])
  findings        VulnFinding[]
  scanResults     ScanResult[]

  @@index([targetId, createdAt(sort: Desc)])
  @@index([status])
  @@map("scans")
}

enum ScanType {
  ON_DEMAND
  SCHEDULED
  CONTINUOUS
}

enum ScanStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 2.5 Assets (Discovered)

```prisma
// =============================================
// ASSETS (DISCOVERED)
// =============================================

model Asset {
  id              String    @id @default(cuid())
  targetId        String    @map("target_id")
  type            AssetType
  value           String    // hostname, IP, URL
  ip              String?
  ports           Json?     // [{ port: 443, protocol: "tcp", service: "https", version: "nginx/1.24" }]
  technologies    Json?     // [{ name: "React", version: "18.2", category: "frontend" }]
  httpStatus      Int?      @map("http_status")
  title           String?   // HTML <title>
  headers         Json?     // Response headers snapshot
  dnsRecords      Json?     @map("dns_records")  // { A: [...], CNAME: [...], MX: [...] }
  whois           Json?
  sslInfo         Json?     @map("ssl_info")     // { issuer, expiry, grade, ... }
  firstSeenAt     DateTime  @default(now()) @map("first_seen_at")
  lastSeenAt      DateTime  @default(now()) @map("last_seen_at")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  target          Target    @relation(fields: [targetId], references: [id], onDelete: Cascade)
  findings        VulnFinding[]

  @@unique([targetId, type, value])
  @@index([targetId])
  @@map("assets")
}

enum AssetType {
  SUBDOMAIN
  IP_ADDRESS
  URL
  API_ENDPOINT
}
```

### 2.6 Vulnerability Findings

```prisma
// =============================================
// VULNERABILITY FINDINGS
// =============================================

model VulnFinding {
  id              String        @id @default(cuid())
  scanId          String        @map("scan_id")
  assetId         String?       @map("asset_id")
  title           String
  description     String
  severity        Severity
  cvssScore       Float?        @map("cvss_score")      // 0.0 - 10.0
  cvssVector      String?       @map("cvss_vector")      // CVSS:3.1/AV:N/AC:L/...
  category        VulnCategory
  owaspCategory   String?       @map("owasp_category")   // "A01:2021", "A03:2021"
  cveId           String?       @map("cve_id")           // "CVE-2024-1234"
  cweId           String?       @map("cwe_id")           // "CWE-79"

  // Evidence
  affectedUrl     String?       @map("affected_url")
  affectedParam   String?       @map("affected_param")
  evidence        Json?         // { request, response, payload, screenshot }
  reproduction    String?       // Steps to reproduce

  // Remediation
  remediation     String?       // How to fix
  references      String[]      @default([])  // External reference URLs

  // Status tracking
  status          FindingStatus @default(OPEN)
  assignedTo      String?       @map("assigned_to")
  resolvedAt      DateTime?     @map("resolved_at")
  falsePositive   Boolean       @default(false) @map("false_positive")

  // Metadata
  firstFoundAt    DateTime      @default(now()) @map("first_found_at")
  lastFoundAt     DateTime      @default(now()) @map("last_found_at")
  occurrences     Int           @default(1)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Relations
  scan            Scan          @relation(fields: [scanId], references: [id], onDelete: Cascade)
  asset           Asset?        @relation(fields: [assetId], references: [id], onDelete: SetNull)

  @@index([scanId])
  @@index([severity])
  @@index([status])
  @@index([category])
  @@map("vuln_findings")
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

enum VulnCategory {
  SQL_INJECTION
  XSS_REFLECTED
  XSS_STORED
  SSRF
  LFI
  RFI
  COMMAND_INJECTION
  PATH_TRAVERSAL
  OPEN_REDIRECT
  CSRF
  IDOR
  CORS_MISCONFIG
  SECURITY_HEADERS
  SSL_TLS
  CERT_ISSUE
  INFO_DISCLOSURE
  DIRECTORY_LISTING
  SENSITIVE_FILE
  OUTDATED_SOFTWARE
  DEFAULT_CREDENTIALS
  EMAIL_SECURITY
  COOKIE_SECURITY
  HTTP_METHODS
  OTHER
}

enum FindingStatus {
  OPEN
  IN_PROGRESS
  FIXED
  ACCEPTED      // Risk accepted
  FALSE_POSITIVE
}
```

### 2.7 Scan Results (Raw)

```prisma
// =============================================
// SCAN RESULTS (RAW MODULE OUTPUT)
// =============================================

model ScanResult {
  id          String   @id @default(cuid())
  scanId      String   @map("scan_id")
  module      String   // "subdomain_enum", "port_scan", "header_check", etc.
  status      String   // "completed", "failed", "timeout"
  rawOutput   Json     @map("raw_output")   // Full module output
  duration    Int?     // milliseconds
  startedAt   DateTime @map("started_at")
  completedAt DateTime? @map("completed_at")
  errorMsg    String?  @map("error_msg")
  createdAt   DateTime @default(now()) @map("created_at")

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)

  @@index([scanId])
  @@map("scan_results")
}
```

### 2.8 Reports

```prisma
// =============================================
// REPORTS
// =============================================

model Report {
  id          String       @id @default(cuid())
  orgId       String       @map("org_id")
  type        ReportType
  title       String
  format      ReportFormat @default(PDF)
  status      String       @default("generating") // "generating", "ready", "failed"
  fileUrl     String?      @map("file_url")       // S3 URL
  fileSize    Int?         @map("file_size")       // bytes
  parameters  Json?        // { targetIds, dateRange, includeFixed, etc. }
  generatedAt DateTime?    @map("generated_at")
  expiresAt   DateTime?    @map("expires_at")      // Auto-delete after X days
  createdAt   DateTime     @default(now()) @map("created_at")

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@map("reports")
}

enum ReportType {
  EXECUTIVE_SUMMARY
  TECHNICAL_DETAIL
  COMPLIANCE_OWASP
  COMPLIANCE_PCI
  ASSET_INVENTORY
  CUSTOM
}

enum ReportFormat {
  PDF
  HTML
  CSV
  JSON
}
```

### 2.9 Notifications

```prisma
// =============================================
// NOTIFICATIONS
// =============================================

model Notification {
  id          String           @id @default(cuid())
  userId      String           @map("user_id")
  type        NotificationType
  title       String
  message     String
  data        Json?            // { scanId, findingId, targetId, etc. }
  channel     String           @default("in_app")  // "in_app", "email", "slack"
  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at")
  createdAt   DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([createdAt(sort: Desc)])
  @@map("notifications")
}

enum NotificationType {
  SCAN_COMPLETED
  SCAN_FAILED
  CRITICAL_VULN_FOUND
  HIGH_VULN_FOUND
  NEW_ASSET_DISCOVERED
  CERT_EXPIRING
  DOMAIN_VERIFY_REMINDER
  WEEKLY_DIGEST
  SYSTEM
}
```

---

## 3. Indexes & Performance

### Key Indexes
```sql
-- Scans: query by target + time range
CREATE INDEX idx_scans_target_created ON scans (target_id, created_at DESC);

-- Findings: filter by severity and status
CREATE INDEX idx_findings_severity ON vuln_findings (severity);
CREATE INDEX idx_findings_status ON vuln_findings (status);
CREATE INDEX idx_findings_scan ON vuln_findings (scan_id);
CREATE INDEX idx_findings_category ON vuln_findings (category);

-- Assets: lookup by target
CREATE INDEX idx_assets_target ON assets (target_id);

-- Notifications: user inbox query
CREATE INDEX idx_notif_user_read ON notifications (user_id, is_read);

-- Full text search on vulnerability title + description
CREATE INDEX idx_findings_search ON vuln_findings 
  USING gin(to_tsvector('english', title || ' ' || description));
```

### Partitioning Strategy (Phase 2+)
```sql
-- Partition scan_results by month for large-scale deployments
CREATE TABLE scan_results (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE scan_results_2025_q1 
  PARTITION OF scan_results 
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

---

## 4. Data Retention Policy

| Data Type | Retention | Action |
|---|---|---|
| Scan results (raw) | 90 days | Archive to S3, delete from DB |
| Vulnerability findings | Indefinite (while active) | Soft delete khi target bị xóa |
| Assets | Indefinite | Mark inactive sau 90 ngày không thấy |
| Reports (files) | 30 days | Auto-delete từ S3 |
| Notifications | 90 days | Hard delete |
| Audit logs | 1 year | Archive |
| User sessions | 7 days | Auto-expire in Redis |

---

## 5. Seed Data

```typescript
// prisma/seed.ts — Vulnerability templates & reference data

const vulnTemplates = [
  {
    category: "SECURITY_HEADERS",
    title: "Missing Content-Security-Policy Header",
    severity: "MEDIUM",
    cvssScore: 5.3,
    description: "The Content-Security-Policy header is not set...",
    remediation: "Add Content-Security-Policy header with appropriate directives..."
  },
  {
    category: "SSL_TLS",
    title: "SSL Certificate Expiring Soon",
    severity: "HIGH",
    cvssScore: 7.5,
    description: "The SSL certificate will expire within 30 days...",
    remediation: "Renew the SSL certificate before expiration..."
  },
  // ... more templates
];
```

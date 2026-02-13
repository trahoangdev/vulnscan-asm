# 🗺️ Development Roadmap — VulnScan ASM

## 1. Tổng quan Timeline

```
Phase 1: MVP Core         ██████████████████████████░░░░░░░░░░░░░ Tuần 1-8
Phase 2: Growth Features  ░░░░░░░░░░░░░░░░░░░░░░░░████████████░░ Tuần 9-14
Phase 3: Advanced          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████ Tuần 15-22
Phase 4: Enterprise        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████ Tuần 23+
```

---

## 2. Phase 1 — MVP Core (Tuần 1-8)

> **Mục tiêu:** Platform hoạt động end-to-end — user đăng ký, thêm domain, scan, xem kết quả.

### Sprint 1 (Tuần 1-2): Foundation Setup

#### Backend
- [ ] Khởi tạo project Node.js + TypeScript + Express
- [ ] Setup Prisma ORM + PostgreSQL schema (users, orgs, targets)
- [ ] Setup Redis connection
- [ ] Implement auth module:
  - [ ] Register (email + password)
  - [ ] Login (JWT access + refresh token)
  - [ ] Email verification flow
  - [ ] Forgot password / reset password
- [ ] Middleware: auth, error handler, validation (Zod), rate limiter
- [ ] Implement user profile CRUD
- [ ] Auto-create organization on register
- [ ] Setup logging (Winston)
- [ ] API documentation setup (Swagger)
- [ ] Unit tests cho auth module

#### Frontend
- [ ] Khởi tạo project Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Setup project structure (layouts, routing)
- [ ] Implement auth pages:
  - [ ] Login page
  - [ ] Register page
  - [ ] Forgot password page
  - [ ] Email verification page
- [ ] Setup Axios API client + interceptors (JWT refresh)
- [ ] Setup Zustand store (auth state)
- [ ] Protected route wrapper
- [ ] Basic layout: Sidebar + Header + Main content

#### Infrastructure
- [ ] Docker Compose cho dev environment (all services)
- [ ] Environment variables setup (.env templates)
- [ ] README.md với setup instructions

**Deliverable Sprint 1:** User có thể register, login, thấy dashboard shell.

---

### Sprint 2 (Tuần 3-4): Target Management & Asset Discovery

#### Backend
- [ ] Target module:
  - [ ] CRUD targets (domain/IP)
  - [ ] Domain verification token generation
  - [ ] DNS TXT verification check
  - [ ] HTML file verification check
  - [ ] Verification status management
- [ ] Setup BullMQ job queue
- [ ] Quota checking middleware (max targets per plan)

#### Scanner Engine (Python)
- [ ] Khởi tạo Python scanner project
- [ ] Setup Celery + Redis broker
- [ ] Asset Discovery modules:
  - [ ] Subdomain enumeration (passive: crt.sh, SecurityTrails API)
  - [ ] DNS records resolver (A, AAAA, MX, NS, TXT, CNAME)
  - [ ] Port scanner (top 100 ports, nmap wrapper)
  - [ ] Technology detection (HTTP headers, response body analysis)
  - [ ] HTTP status & response info
- [ ] Result parser → normalize output → save to PostgreSQL
- [ ] Scan orchestrator (coordinate modules)
- [ ] Worker ↔ API Server communication (Redis pub/sub)

#### Frontend
- [ ] Targets page:
  - [ ] Target list (table with filters)
  - [ ] Add target dialog (domain input + validation)
  - [ ] Domain verification wizard (3 methods)
  - [ ] Target detail page
- [ ] Real-time scan status (polling initially)

**Deliverable Sprint 2:** User thêm domain, verify, chạy discovery, thấy assets.

---

### Sprint 3 (Tuần 5-6): Vulnerability Scanning

#### Scanner Engine
- [ ] Web vulnerability modules:
  - [ ] Security headers checker (CSP, HSTS, X-Frame, X-Content-Type, etc.)
  - [ ] SSL/TLS analyzer (cert info, protocol versions, cipher suites)
  - [ ] Certificate expiry check
  - [ ] CORS misconfiguration checker
  - [ ] Cookie security analysis (Secure, HttpOnly, SameSite)
  - [ ] Sensitive file exposure (.env, .git, .htaccess, backup files)
  - [ ] Directory listing detection
  - [ ] Information disclosure (server headers, error pages)
  - [ ] HTTP methods check (TRACE, OPTIONS)
  - [ ] SQL Injection scanner (error-based, basic blind)
  - [ ] Reflected XSS scanner
  - [ ] Open redirect detection
  - [ ] Path traversal detection
- [ ] Email security checks (SPF, DKIM, DMARC)
- [ ] CVSS v3.1 risk scoring engine
- [ ] Scan profiles implementation (Quick, Standard, Deep)

#### Backend
- [ ] Scan module:
  - [ ] Create scan API
  - [ ] Scan status tracking
  - [ ] Scan progress updates (WebSocket)
  - [ ] Get scan results & findings
  - [ ] Cancel scan
- [ ] Vulnerability module:
  - [ ] List findings with filters
  - [ ] Finding detail
  - [ ] Update finding status
  - [ ] Vulnerability statistics endpoint
- [ ] WebSocket server (Socket.io) cho real-time updates
- [ ] Database: Create VulnFinding, ScanResult tables

#### Frontend
- [ ] Scans page:
  - [ ] Scan list
  - [ ] New scan dialog (select target, profile)
  - [ ] Scan progress view (real-time)
  - [ ] Scan result summary
- [ ] Vulnerabilities page:
  - [ ] Findings list (filterable by severity, status, category)
  - [ ] Finding detail view (description, evidence, remediation)
  - [ ] Status change dropdown
  - [ ] Severity badges & icons

**Deliverable Sprint 3:** Full scan cycle hoạt động — discovery + vuln scan + findings.

---

### Sprint 4 (Tuần 7-8): Dashboard, Polish & Launch

#### Backend
- [ ] Dashboard aggregation endpoints:
  - [ ] Security score calculation
  - [ ] Vulnerability summary by severity
  - [ ] Asset summary
  - [ ] Recent scans
  - [ ] Top vulnerable assets
- [ ] Notification module:
  - [ ] In-app notifications
  - [ ] Email notification (critical/high findings)
  - [ ] Unread count API
- [ ] Rate limiting fine-tuning
- [ ] Input sanitization audit
- [ ] API documentation complete

#### Frontend
- [ ] Dashboard page:
  - [ ] Security score gauge
  - [ ] Vulnerability breakdown chart (pie/donut)
  - [ ] Recent scans timeline
  - [ ] Top vulnerable assets list
  - [ ] Asset count cards
- [ ] Notification center (bell icon + dropdown)
- [ ] Settings page (profile, password, notifications)
- [ ] Responsive design check
- [ ] Loading states, empty states, error states
- [ ] 404 page
- [ ] Landing page (marketing — basic)

#### Testing & QA
- [ ] End-to-end testing (key flows)
- [ ] Security review (OWASP checklist cho own app)
- [ ] Performance testing (scan 5 domains simultaneously)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Fix critical bugs

#### Deployment
- [ ] Production deployment setup (Vercel + Railway hoặc VPS)
- [ ] SSL certificates
- [ ] Environment variables (production)
- [ ] Database migration (production)
- [ ] Monitoring setup (Sentry, UptimeRobot)
- [ ] Backup strategy

**Deliverable Sprint 4:** MVP ready for beta users.

---

## 3. Phase 2 — Growth Features (Tuần 9-14)

### Sprint 5 (Tuần 9-10): Scheduling & Teams

- [ ] Scheduled scans (cron-based: daily, weekly, monthly)
- [ ] Scan scheduler worker
- [ ] Team management:
  - [ ] Invite members (email)
  - [ ] Roles & permissions (Owner, Admin, Member, Viewer)
  - [ ] Member list management
- [ ] OAuth login (Google, GitHub)
- [ ] API key management (generate, revoke, list)
- [ ] Organization settings page

### Sprint 6 (Tuần 11-12): Reporting & Integrations

- [ ] Report generation engine (Puppeteer for PDF)
- [ ] Executive summary report template
- [ ] Technical detail report template
- [ ] OWASP Top 10 compliance mapping
- [ ] Slack notification integration
- [ ] Webhook integration (custom endpoints)
- [ ] Weekly digest email
- [ ] Scan diff (compare with previous scan)
- [ ] Vulnerability re-scan verification

### Sprint 7 (Tuần 13-14): Enhanced Scanning

- [ ] Subdomain takeover detection
- [ ] More vulnerability types:
  - [ ] Stored XSS detection
  - [ ] SSRF detection
  - [ ] Command injection
  - [ ] LFI/RFI detection
- [ ] Outdated software/CVE matching (NVD API integration)
- [ ] Exposed admin panels detection
- [ ] Custom scan configuration (select specific modules)
- [ ] Scan exclusion rules (exclude paths/params)
- [ ] Scan speed/concurrency control
- [ ] Export findings (CSV, JSON)

---

## 4. Phase 3 — Advanced Features (Tuần 15-22)

### Sprint 8-9 (Tuần 15-18)
- [ ] API endpoint discovery & scanning
- [ ] Broken authentication detection
- [ ] Two-factor authentication (TOTP)
- [ ] Compliance reports (PCI-DSS, CIS)
- [ ] Custom report templates
- [ ] SARIF output format (GitHub Security integration)
- [ ] Risk trend analytics (30/60/90 days)
- [ ] Vulnerability trend charts
- [ ] CLI tool for developers

### Sprint 10-11 (Tuần 19-22)
- [ ] AI-assisted vulnerability prioritization
- [ ] Auto-remediation code suggestions
- [ ] Natural language scan reports
- [ ] Advanced asset topology/map view
- [ ] Continuous monitoring mode
- [ ] Browser extension for quick checks
- [ ] CI/CD integration guide & examples
- [ ] Performance optimization & caching

---

## 5. Phase 4 — Enterprise (Tuần 23+)

- [ ] SSO (SAML 2.0)
- [ ] On-premise deployment option
- [ ] Jira integration (auto-create tickets)
- [ ] Custom scan templates marketplace
- [ ] Multi-tenant architecture optimization
- [ ] Audit logging
- [ ] Data residency options
- [ ] SLA & dedicated support
- [ ] Billing system (Stripe integration)
- [ ] White-label option

---

## 6. Milestone Summary

| Milestone | Tuần | Deliverable |
|---|---|---|
| **M1: Foundation** | 2 | Auth + basic UI chạy được |
| **M2: Discovery** | 4 | Target management + asset discovery |
| **M3: Scanning** | 6 | Full vuln scan + findings |
| **M4: MVP Launch** | 8 | Dashboard + notifications + beta ready |
| **M5: Teams & Reports** | 12 | Multi-user + PDF reports + scheduling |
| **M6: Advanced Scan** | 14 | More vulns + integrations |
| **M7: API & Compliance** | 18 | API scanning + compliance |
| **M8: AI & CLI** | 22 | AI features + CLI tool |
| **M9: Enterprise** | 26+ | SSO + billing + on-prem |

---

## 7. Definition of Done (DoD)

Mỗi feature phải đáp ứng:
- [ ] Code reviewed (self-review hoặc peer review)
- [ ] Unit tests pass (>80% coverage cho critical modules)
- [ ] API endpoints documented (Swagger)
- [ ] Error handling implemented
- [ ] Input validation implemented
- [ ] UI responsive (mobile + desktop)
- [ ] No critical/high security vulnerabilities
- [ ] Environment variables documented
- [ ] Database migrations created
- [ ] Deployed to staging

---

## 8. Risk Mitigation per Phase

| Phase | Risk | Mitigation |
|---|---|---|
| Phase 1 | Scope creep | Strict MVP features only, defer nice-to-haves |
| Phase 1 | Scanner false positives | Manual verification layer, confidence scoring |
| Phase 2 | PDF report complexity | Start with simple HTML→PDF, iterate |
| Phase 2 | OAuth complexity | Use Passport.js, proven strategies |
| Phase 3 | AI accuracy | Start with rule-based, add ML gradually |
| Phase 4 | Enterprise requirements | Collect feedback from beta users first |

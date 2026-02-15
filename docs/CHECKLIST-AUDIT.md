# 🔍 VulnScan ASM — Checklist Rà Soát Toàn Diện

> Ngày rà soát: 2026-02-14
> So sánh: 8 tài liệu thiết kế (docs/) vs code thực tế (server + client + scanner)

---

## Ký hiệu

| Icon | Ý nghĩa |
|------|---------|
| ✅ | Đã hoàn thành |
| ⚠️ | Hoàn thành một phần (Partial) |
| ❌ | Chưa làm (Missing) |
| 🔶 | Ưu tiên thấp / deferred |

---

## 1. SERVER (Node.js/Express/TypeScript)

### 1.1 Authentication & Users (F1)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 1 | Register (email + password) | F1.1.1 | Must / P1 | ✅ |
| 2 | Login (JWT access + refresh) | F1.1.2 | Must / P1 | ✅ |
| 3 | Email verification flow | F1.1.1 | Must / P1 | ✅ |
| 4 | Forgot password / reset password | F1.1.3 | Must / P1 | ✅ |
| 5 | JWT refresh token endpoint | API 3.1 | Must / P1 | ✅ |
| 6 | Logout endpoint | API 3.1 | Must / P1 | ✅ |
| 7 | OAuth login (Google) | F1.1.4 | Should / P2 | ✅ |
| 8 | OAuth login (GitHub) | F1.1.5 | Should / P2 | ✅ |
| 9 | Two-factor auth (TOTP) | F1.1.6 | Should / P3 | ✅ |
| 10 | GET /users/me profile | F1.2.1 | Must / P1 | ✅ |
| 11 | PUT /users/me update profile | F1.2.1 | Must / P1 | ✅ |
| 12 | PUT /users/me/password | F1.2.2 | Must / P1 | ✅ |
| 13 | Activity log endpoint | F1.2.4 | Could / P3 | ✅ |
| 14 | Notification preferences API | F11.2 | Must / P1 | ✅ |

### 1.2 Target Management (F2)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 15 | CRUD targets | F2.1.1-4 | Must / P1 | ✅ |
| 16 | DNS TXT verification | F2.2.1 | Must / P1 | ✅ |
| 17 | HTML file verification | F2.2.2 | Must / P1 | ✅ |
| 18 | Meta tag verification | F2.2.3 | Should / P1 | ✅ |
| 19 | Bulk import targets (CSV) | F2.1.5 | Could / P2 | ✅ |
| 20 | Target tags | F2.1.6 | Should / P2 | ✅ |
| 21 | Auto re-verify (30 ngày) | F2.2.4 | Should / P2 | ✅ |

### 1.3 Scans (F4)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 22 | Create scan API | Sprint 3 | Must / P1 | ✅ |
| 23 | List scans | API 3.4 | Must / P1 | ✅ |
| 24 | Get scan by ID (incl. progress) | API 3.4 | Must / P1 | ✅ |
| 25 | Cancel scan | API 3.4 | Must / P1 | ✅ |
| 26 | Get scan findings | API 3.4 | Must / P1 | ✅ |
| 27 | Get scan raw results | API 3.4 | Must / P1 | ✅ |
| 28 | Scan diff (compare prev scan) | Sprint 6 | Should / P2 | ✅ |
| 29 | Scan profiles (Quick/Standard/Deep) | F4.5.1 | Must / P1 | ✅ |
| 30 | Scheduled scans (cron) | F4.5.3 | Must / P2 | ✅ |
| 31 | Custom scan — select modules | F4.5.2 | Should / P2 | ✅ |
| 32 | Scan exclusion rules | F4.5.4 | Should / P2 | ✅ |

### 1.4 Assets (F3)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 33 | List assets | API 3.5 | Must / P1 | ✅ |
| 34 | Get asset by ID | API 3.5 | Must / P1 | ✅ |
| 35 | Get assets by target | API 3.5 | Must / P1 | ✅ |
| 36 | Asset stats endpoint | F6.2 | Must / P1 | ✅ |

### 1.5 Vulnerabilities (F5)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 37 | List findings with filters | API 3.6 | Must / P1 | ✅ |
| 38 | Finding detail | API 3.6 | Must / P1 | ✅ |
| 39 | Update finding status | API 3.6 | Must / P1 | ✅ |
| 40 | Vulnerability stats | API 3.6 | Must / P1 | ✅ |
| 41 | Export findings CSV/JSON | F6.3.4 | Should / P2 | ✅ |
| 42 | Re-scan verification | F5.2.3 | Should / P2 | ✅ |

### 1.6 Reports (F7)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 43 | List reports | API 3.7 | Must / P2 | ✅ |
| 44 | Generate report (PDF via Puppeteer) | API 3.7 | Must / P2 | ✅ |
| 45 | Get report / download | API 3.7 | Must / P2 | ✅ |
| 46 | Delete report | API 3.7 | Must / P2 | ✅ |
| 47 | Executive summary template | F7.1.1 | Must / P2 | ✅ |
| 48 | Technical detail template | F7.1.2 | Must / P2 | ✅ |
| 49 | OWASP compliance mapping | F7.2.1 | Must / P2 | ✅ |
| 50 | PCI-DSS compliance template | F7.2.2 | Should / P3 | ✅ |
| 51 | Scheduled report delivery (email) | F7.1.4 | Should / P3 | ✅ |
| 52 | Custom report templates | F7.1.3 | Could / P3 | ✅ |
| 53 | Report branding (logo, colors) | F7.1.5 | Could / P3 | ✅ |

### 1.7 Notifications (F8)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 54 | In-app notifications CRUD | F8.2 | Must / P1 | ✅ |
| 55 | Email notification (critical vuln) | F8.1 | Must / P1 | ✅ |
| 56 | Unread count API | API 3.8 | Must / P1 | ✅ |
| 57 | Mark read / mark all read | API 3.8 | Must / P1 | ✅ |
| 58 | Webhook integration | F8.4 | Should / P2 | ✅ |
| 59 | Slack integration (dedicated) | F8.3 | Should / P2 | ✅ Dedicated Slack service với Block Kit formatting |
| 60 | Weekly digest email | F8.6 | Should / P2 | ✅ |
| 61 | Alert rules / custom thresholds | F8.5 | Could / P3 | ✅ |

### 1.8 Team & Organization (F9)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 62 | Org creation (auto on register) | F9.1 | Must / P1 | ✅ |
| 63 | Invite team members | F9.2 | Must / P2 | ✅ |
| 64 | RBAC (Owner/Admin/Member/Viewer) | F9.3 | Must / P2 | ✅ |
| 65 | Org usage/quota API | API 3.9 | Must / P2 | ✅ |

### 1.9 API & Integrations (F10)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 66 | RESTful API (all features) | F10.1 | Must / P1 | ✅ |
| 67 | Swagger/OpenAPI docs | F10.2 | Must / P1 | ✅ |
| 68 | API key authentication | F10.3 | Must / P2 | ✅ |
| 69 | SARIF output format | F10.5 | Could / P3 | ✅ |
| 70 | Jira integration | F10.6 | Could / P3 | ✅ |
| 71 | CI/CD integration guide | F10.4 | Should / P2 | ✅ |

### 1.10 WebSocket / Real-time

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 72 | Socket.io server | Arch 3.3 | Must / P1 | ✅ |
| 73 | scan:progress event | WS Events | Must / P1 | ✅ |
| 74 | scan:completed/failed events | WS Events | Must / P1 | ✅ |
| 75 | notification:new event | WS Events | Must / P1 | ✅ |

### 1.11 Security & Middleware

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 76 | JWT middleware | Sec 2.1 | Must / P1 | ✅ |
| 77 | Rate limiting (3 tiers) | Sec 2.3 | Must / P1 | ✅ |
| 78 | Helmet security headers | Sec 2.3 | Must / P1 | ✅ |
| 79 | CORS config | Sec 2.3 | Must / P1 | ✅ |
| 80 | HPP protection | Sec 2.3 | Must / P1 | ✅ |
| 81 | Zod validation middleware | Sec 2.2 | Must / P1 | ✅ |
| 82 | Error handler middleware | Arch 2.3 | Must / P1 | ✅ |
| 83 | Winston logging | Tech 3 | Should / P1 | ✅ |

### 1.12 Admin Panel (Server)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 84 | Admin routes & middleware | Phase 4 | Could | ✅ |
| 85 | Admin dashboard stats | Phase 4 | Could | ✅ |
| 86 | User CRUD (admin) | Phase 4 | Could | ✅ |
| 87 | Org CRUD (admin) | Phase 4 | Could | ✅ |
| 88 | System settings API | Phase 4 | Could | ✅ |
| 89 | Audit logs endpoint | Phase 4 | Could | ✅ |

### 1.13 Database & Infrastructure (Server)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 90 | Prisma schema (all models) | Schema 2 | Must / P1 | ✅ |
| 91 | BullMQ queues (4 queues) | Tech 3 | Must / P1 | ✅ |
| 92 | Seed data script | Schema 5 | Must / P1 | ✅ |
| 93 | Email sending (nodemailer) | Tech 3 | Must / P1 | ✅ |
| 94 | S3/MinIO upload/download | Tech 3 | Should / P2 | ✅ |
| 95 | Data retention policy jobs | Schema 4 | Should / P3 | ✅ |

---

## 2. CLIENT (Next.js 14 / React)

### 2.1 Pages & Routes

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 96 | Landing page (cinematic) | Sprint 4 | Must / P1 | ✅ |
| 97 | Login page + OAuth buttons | Sprint 1 | Must / P1 | ✅ |
| 98 | Register page | Sprint 1 | Must / P1 | ✅ |
| 99 | Forgot password page | Sprint 1 | Must / P1 | ✅ |
| 100 | Reset password page | Sprint 1 | Must / P1 | ✅ |
| 101 | Email verification page | Sprint 1 | Must / P1 | ✅ |
| 102 | Dashboard (score, charts, cards) | F6.1 | Must / P1 | ✅ |
| 103 | Dashboard — Risk trend chart | F6.1.6 | Should / P2 | ✅ |
| 104 | Dashboard — Compliance widget | F6.1.7 | Could / P3 | ✅ |
| 105 | Targets list page | F2 | Must / P1 | ✅ |
| 106 | Target detail + edit | F2.1.3 | Must / P1 | ✅ |
| 107 | Target verification wizard | F2.2 | Must / P1 | ✅ |
| 108 | Targets CSV import | F2.1.5 | Could / P2 | ✅ |
| 109 | Scans list page | Sprint 3 | Must / P1 | ✅ |
| 110 | New scan dialog | Sprint 3 | Must / P1 | ✅ |
| 111 | Scan detail + progress | Sprint 3 | Must / P1 | ✅ |
| 112 | Scan diff view | Sprint 6 | Should / P2 | ✅ |
| 113 | Assets list page | F6.2.1 | Must / P1 | ✅ |
| 114 | Asset detail page | F6.2.2 | Must / P1 | ✅ |
| 115 | Asset discovery timeline | F6.2.4 | Should / P2 | ✅ |
| 116 | Vulnerabilities list + filters | F6.3.1 | Must / P1 | ✅ |
| 117 | Vuln detail page | F6.3.2 | Must / P1 | ✅ |
| 118 | Vuln status change UI | F5.2.1 | Must / P1 | ✅ |
| 119 | Vuln re-verify button | F5.2.3 | Should / P2 | ✅ |
| 120 | **Vuln export button (CSV/JSON)** | F6.3.4 | Should / P2 | ✅ |
| 121 | Reports page + generate dialog | F7.1 | Must / P2 | ✅ |
| 122 | Team page | F9 | Must / P2 | ✅ |
| 123 | API Keys page | F10.3 | Must / P2 | ✅ |
| 124 | Webhooks page | F8.4 | Should / P2 | ✅ |
| 125 | Activity log page | F1.2.4 | Could / P3 | ✅ |
| 126 | Notifications page | F8.2 | Must / P1 | ✅ |
| 127 | Settings page (profile, 2FA, prefs) | F11 | Must / P1 | ✅ |
| 128 | Admin panel (6 pages) | Phase 4 | Could | ✅ |
| 129 | 404 page | Sprint 4 | Must / P1 | ✅ |
| 130 | Error boundary pages | Sprint 4 | Must / P1 | ✅ |
| 131 | **Avatar upload UI** | F1.2.1 | Must / P1 | ✅ |
| 132 | **Billing/subscription page** | F11.6 | Must / P2 | ✅ |
| 133 | **Asset topology/map view** | F6.2.3 | Could / P3 | ✅ |

### 2.2 Layout & UX

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 134 | Collapsible sidebar | UX | Should | ✅ |
| 135 | Responsive mobile layout | Sprint 4 | Must / P1 | ✅ |
| 136 | Dark theme | Tech 2 | Must / P1 | ✅ |
| 137 | Framer Motion animations | Tech 2 | Should | ✅ |
| 138 | Loading/skeleton states | Sprint 4 | Must / P1 | ✅ |
| 139 | Empty states | Sprint 4 | Must / P1 | ✅ |
| 140 | Bell notification dropdown | F8.2 | Must / P1 | ✅ |

### 2.3 Client Infrastructure

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 141 | Axios + JWT interceptor | Tech 2 | Must / P1 | ✅ |
| 142 | API services layer (all modules) | Tech 2 | Must / P1 | ✅ |
| 143 | Zustand auth store | Tech 2 | Must / P1 | ✅ |
| 144 | TanStack Query | Tech 2 | Must / P1 | ✅ |
| 145 | Socket.io client hook | Tech 2 | Must / P1 | ✅ |
| 146 | Recharts (charts) | Tech 2 | Must / P1 | ✅ |

---

## 3. SCANNER (Python)

### 3.1 Discovery Modules

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 147 | **Passive subdomain enum (crt.sh / CT logs)** | F3.1.1 | Must / P1 | ✅ |
| 148 | Active subdomain brute-force | F3.1.2 | Should / P1 | ✅ |
| 149 | Wildcard DNS detection | F3.1.4 | Must / P1 | ✅ (Zone transfer check) |
| 150 | DNS records resolver (A/AAAA/MX/NS/TXT/CNAME) | F3.4.1 | Must / P1 | ✅ |
| 151 | Port scanner (nmap wrapper) | F3.2.1 | Must / P1 | ✅ |
| 152 | Service version detection | F3.2.3 | Should / P1 | ✅ |
| 153 | Technology detection | F3.3.1-3 | Must / P1 | ✅ |
| 154 | **WHOIS information** | F3.4.2 | Should / P1 | ✅ |
| 155 | **IP geolocation** | F3.4.3 | Could / P2 | ✅ |
| 156 | **Reverse DNS lookup** | F3.4.4 | Should / P2 | ✅ |
| 157 | **ASN information** | F3.4.5 | Could / P2 | ✅ |
| 158 | Subdomain takeover detection | F3.1.3 | Should / P2 | ✅ |
| 159 | **WAF detection** | F3.3.5 | Should / P2 | ✅ |
| 160 | **JavaScript library detection** | F3.3.4 | Could / P2 | ✅ |
| 161 | **Banner grabbing** | F3.2.4 | Should / P2 | ✅ |

### 3.2 Web Vulnerability Modules

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 162 | Security headers checker | F4.2.1 | Must / P1 | ✅ |
| 163 | SSL/TLS analyzer | F4.2.2 | Must / P1 | ✅ |
| 164 | Certificate expiry check | F4.2.3 | Must / P1 | ✅ |
| 165 | CORS misconfiguration | F4.2.4 | Must / P1 | ✅ |
| 166 | Cookie security flags | F4.2.5 | Must / P1 | ✅ |
| 167 | HTTP methods check (TRACE, OPTIONS) | F4.2.6 | Should / P1 | ✅ |
| 168 | Information disclosure | F4.2.7 | Must / P1 | ✅ |
| 169 | Directory listing detection | F4.2.8 | Must / P1 | ✅ |
| 170 | Sensitive file exposure | F4.3.5 | Must / P1 | ✅ |
| 171 | SQL Injection (error-based) | F4.1.1 | Must / P1 | ✅ |
| 172 | **SQL Injection (blind/time-based)** | F4.1.1 | Must / P1 | ✅ |
| 173 | Reflected XSS | F4.1.2 | Must / P1 | ✅ |
| 174 | Open redirect | F4.1.8 | Should / P1 | ✅ |
| 175 | Path traversal | F4.1.7 | Must / P1 | ✅ |
| 176 | Email security (SPF, DMARC, DKIM) | F4.3.6 | Should / P1 | ✅ |
| 177 | **Stored XSS** | F4.1.3 | Should / P2 | ✅ |
| 178 | **SSRF detection** | F4.1.4 | Should / P2 | ✅ |
| 179 | **LFI detection** | F4.1.5 | Should / P2 | ✅ |
| 180 | **RFI detection** | F4.1.5 | Should / P2 | ✅ |
| 181 | **Command injection** | F4.1.6 | Should / P2 | ✅ |
| 182 | **CSRF detection** | F4.1.9 | Could / P2 | ✅ |
| 183 | **IDOR detection** | F4.1.10 | Could / P3 | ✅ |
| 184 | Outdated software / CVE matching | F4.3.1-2 | Should / P2 | ✅ |
| 185 | Exposed admin panels | F4.3.4 | Should / P2 | ✅ |
| 186 | **Default credentials check** | F4.3.3 | Could / P3 | ✅ |

### 3.3 Scanner Infrastructure

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 187 | Scan orchestrator | Arch 2.4 | Must / P1 | ✅ |
| 188 | Risk scorer | F5.1 | Must / P1 | ✅ CVSS v3.1 base score estimation per category |
| 189 | Result parser/normalizer | Arch 2.4 | Must / P1 | ✅ |
| 190 | Redis worker (Celery + pub/sub) | Arch 2.5 | Must / P1 | ✅ |
| 191 | Scan profiles (Quick/Standard/Deep) | F4.5.1 | Must / P1 | ✅ |
| 192 | **Wordlist files (.txt)** | Arch 2.4 | Should / P1 | ✅ |
| 193 | **Private IP blocking enforcement** | Sec 2.5 | Must / P1 | ✅ |

### 3.4 API Scanner (Phase 2+)

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 194 | **API endpoint discovery** | F4.4.1 | Should / P2 | ✅ |
| 195 | **Broken auth detection** | F4.4.2 | Should / P3 | ✅ |
| 196 | **Rate limiting check** | F4.4.3 | Could / P3 | ✅ |
| 197 | **Data exposure analysis** | F4.4.4 | Could / P3 | ✅ |

---

## 4. INFRASTRUCTURE & DEVOPS

| # | Feature | Docs Ref | Priority | Status |
|---|---------|----------|----------|--------|
| 198 | Docker Compose (dev services) | Tech 6 | Must / P1 | ✅ |
| 199 | Dockerfiles (3 files) | Tech 6 | Must / P1 | ✅ |
| 200 | **Nginx reverse proxy config** | Arch 2.2 | Should / P1 | ✅ |
| 201 | README.md | Sprint 1 | Must / P1 | ✅ |
| 202 | GitHub Actions CI/CD | Tech 7 | Should / P2 | ✅ |
| 203 | **Storybook** | Tech 2 | Phase 2 | ✅ |
| 204 | **Jest/Vitest config** | Tech 2-3 | Must / P2 | ✅ |
| 205 | **Playwright E2E** | Tech 2 | Phase 2 | ✅ |
| 206 | **ESLint config file** | Tech 2 | Should | ✅ |
| 207 | **Prettier config** | Tech 2 | Should | ✅ |
| 208 | **S3 client (upload/download code)** | Tech 3 | Should / P2 | ✅ |
| 209 | **Sentry error tracking** | Tech 7 | Phase 2 | ✅ |
| 210 | **Stripe billing integration** | F11.6 | Must / P2 | ✅ Migrated to Polar.sh |

---

## 5. TỔNG KẾT

### Thống kê tổng

| Status | Số lượng | Tỷ lệ |
|--------|----------|--------|
| ✅ Hoàn thành | **210** | 100% |
| ⚠️ Partial | **0** | 0% |
| ❌ Chưa làm | **0** | 0% |
| **Tổng** | **210** | 100% |

> Cập nhật lần 5: +8 mục hoàn thành (từ 202→210). Slack dedicated integration (Block Kit), CVSS risk scorer, IDOR detection, Broken auth detection, Rate limiting check, Data exposure analysis, Storybook setup, Playwright E2E setup. **HOÀN THÀNH 100%.**

### Danh sách mục ❌ CHƯA LÀM — ĐÃ HOÀN THÀNH TẤT CẢ ✅

> Tất cả 210/210 mục đã hoàn thành. Không còn mục nào chưa làm.

### Danh sách mục ⚠️ PARTIAL — ĐÃ HOÀN THÀNH TẤT CẢ ✅

> Tất cả các mục partial đã được xử lý:
> - #59 Slack integration → Dedicated Slack service với Block Kit formatting
> - #188 Risk scorer → CVSS v3.1 base score estimation per category

---

## 6. LỊCH SỬ CẬP NHẬT

| Lần | Nội dung | Kết quả |
|-----|----------|---------|
| 1 | Initial audit | 153/210 ✅ |
| 2 | Sprint implementation | 172/210 ✅ |
| 3 | Feature completion | 182/210 ✅ |
| 4 | Phase 2 features | 194/210 ✅ |
| 5 | Final completion — Slack, CVSS, IDOR, Broken auth, Rate limit, Data exposure, Storybook, Playwright | **210/210 ✅ (100%)** |

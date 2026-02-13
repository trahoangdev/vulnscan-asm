# 🔍 Feature Specifications — VulnScan ASM

## 1. Feature Map tổng quan

```
VulnScan ASM
├── F1. Authentication & User Management
├── F2. Target Management & Domain Verification
├── F3. Asset Discovery
├── F4. Vulnerability Scanning
├── F5. Risk Scoring & Prioritization
├── F6. Dashboard & Analytics
├── F7. Reporting & Compliance
├── F8. Notifications & Alerting
├── F9. Team & Organization Management
├── F10. API & Integrations
└── F11. Settings & Configuration
```

---

## F1. Authentication & User Management

### F1.1 Registration & Login
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F1.1.1 | Email/password registration với email verification | Must | 1 |
| F1.1.2 | Login với JWT (access + refresh token) | Must | 1 |
| F1.1.3 | Forgot password / Reset password | Must | 1 |
| F1.1.4 | OAuth login (Google) | Should | 2 |
| F1.1.5 | OAuth login (GitHub) | Should | 2 |
| F1.1.6 | Two-factor authentication (TOTP) | Should | 3 |

### F1.2 Profile Management
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F1.2.1 | View/edit profile (name, avatar, timezone) | Must | 1 |
| F1.2.2 | Change password | Must | 1 |
| F1.2.3 | API key management (generate, revoke, list) | Must | 2 |
| F1.2.4 | Activity log (login history, actions) | Could | 3 |

---

## F2. Target Management & Domain Verification

### F2.1 Target CRUD
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F2.1.1 | Add target (domain hoặc IP) | Must | 1 |
| F2.1.2 | List targets với status, last scan info | Must | 1 |
| F2.1.3 | Edit target (labels, notes, scan profile) | Must | 1 |
| F2.1.4 | Delete target (soft delete, giữ history) | Must | 1 |
| F2.1.5 | Bulk import targets (CSV) | Could | 2 |
| F2.1.6 | Target grouping / tagging | Should | 2 |

### F2.2 Domain Verification
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F2.2.1 | DNS TXT record verification | Must | 1 |
| F2.2.2 | HTML file verification | Must | 1 |
| F2.2.3 | Meta tag verification | Should | 1 |
| F2.2.4 | Auto re-verify periodic (30 ngày) | Should | 2 |

**Verification Flow:**
```
User thêm domain ──► System generate token ──► User add proof
        │                                           │
        │           ┌──────────────────────────────┘
        │           ▼
        │    ┌─────────────────┐
        │    │ Verify Options: │
        │    │ 1. DNS TXT      │
        │    │ 2. HTML file    │
        │    │ 3. Meta tag     │
        │    └────────┬────────┘
        │             │
        ▼             ▼
   Pending ──► Verification check ──► Verified ✅
                      │
                      ▼
               Failed ──► Retry
```

---

## F3. Asset Discovery

### F3.1 Subdomain Discovery
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F3.1.1 | Passive subdomain enumeration (DNS, CT logs, search engines) | Must | 1 |
| F3.1.2 | Active subdomain brute-force (wordlist-based) | Should | 1 |
| F3.1.3 | Subdomain takeover detection | Should | 2 |
| F3.1.4 | Wildcard DNS detection | Must | 1 |

### F3.2 Port & Service Discovery
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F3.2.1 | Top 100 ports scan (TCP) | Must | 1 |
| F3.2.2 | Full port scan (1-65535) - deep mode | Could | 2 |
| F3.2.3 | Service version detection | Should | 1 |
| F3.2.4 | Banner grabbing | Should | 2 |

### F3.3 Technology Detection
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F3.3.1 | Web framework detection (React, Angular, Django, etc.) | Must | 1 |
| F3.3.2 | Web server detection (Nginx, Apache, etc.) | Must | 1 |
| F3.3.3 | CMS detection (WordPress, Drupal, etc.) | Should | 1 |
| F3.3.4 | JavaScript library detection | Could | 2 |
| F3.3.5 | WAF detection | Should | 2 |

### F3.4 DNS & Network
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F3.4.1 | DNS records enumeration (A, AAAA, MX, NS, TXT, CNAME) | Must | 1 |
| F3.4.2 | WHOIS information | Should | 1 |
| F3.4.3 | IP geolocation | Could | 2 |
| F3.4.4 | Reverse DNS lookup | Should | 2 |
| F3.4.5 | ASN information | Could | 2 |

**Asset Discovery Output:**
```json
{
  "domain": "example.com",
  "subdomains": [
    {
      "hostname": "api.example.com",
      "ip": "203.0.113.10",
      "ports": [443, 8080],
      "technologies": ["Nginx 1.24", "Node.js", "Express"],
      "status": "active",
      "firstSeen": "2025-01-15",
      "lastSeen": "2025-03-20"
    }
  ],
  "totalAssets": 47,
  "newAssets": 3,
  "removedAssets": 1
}
```

---

## F4. Vulnerability Scanning

### F4.1 Web Application Scanning
| ID | Feature | Priority | Phase | OWASP |
|---|---|---|---|---|
| F4.1.1 | SQL Injection detection (error-based, blind) | Must | 1 | A03 |
| F4.1.2 | Cross-Site Scripting - Reflected XSS | Must | 1 | A03 |
| F4.1.3 | Cross-Site Scripting - Stored XSS | Should | 2 | A03 |
| F4.1.4 | Server-Side Request Forgery (SSRF) | Should | 2 | A10 |
| F4.1.5 | Local/Remote File Inclusion (LFI/RFI) | Should | 2 | A03 |
| F4.1.6 | Command Injection | Should | 2 | A03 |
| F4.1.7 | Path Traversal | Must | 1 | A01 |
| F4.1.8 | Open Redirect | Should | 1 | A01 |
| F4.1.9 | CSRF detection | Could | 2 | A01 |
| F4.1.10 | Insecure Direct Object Reference (IDOR) | Could | 3 | A01 |

### F4.2 Configuration & Header Scanning
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F4.2.1 | Security headers check (CSP, HSTS, X-Frame-Options, etc.) | Must | 1 |
| F4.2.2 | SSL/TLS configuration analysis | Must | 1 |
| F4.2.3 | Certificate expiry check | Must | 1 |
| F4.2.4 | CORS misconfiguration | Must | 1 |
| F4.2.5 | Cookie security flags (Secure, HttpOnly, SameSite) | Must | 1 |
| F4.2.6 | HTTP methods enumeration (TRACE, OPTIONS) | Should | 1 |
| F4.2.7 | Information disclosure (server headers, error pages) | Must | 1 |
| F4.2.8 | Directory listing enabled | Must | 1 |

### F4.3 Infrastructure Scanning
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F4.3.1 | Outdated software/service detection | Should | 2 |
| F4.3.2 | Known CVE matching (version-based) | Should | 2 |
| F4.3.3 | Default credentials check | Could | 3 |
| F4.3.4 | Exposed admin panels | Should | 2 |
| F4.3.5 | Exposed sensitive files (.env, .git, backup) | Must | 1 |
| F4.3.6 | Email security (SPF, DKIM, DMARC) | Should | 1 |

### F4.4 API Security Scanning (Phase 2+)
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F4.4.1 | API endpoint discovery (crawl, OpenAPI spec) | Should | 2 |
| F4.4.2 | Broken authentication detection | Should | 3 |
| F4.4.3 | Rate limiting check | Could | 3 |
| F4.4.4 | Data exposure analysis | Could | 3 |

### F4.5 Scan Configuration
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F4.5.1 | Scan profiles (Quick, Standard, Deep) | Must | 1 |
| F4.5.2 | Custom scan - chọn modules | Should | 2 |
| F4.5.3 | Scheduled scans (daily, weekly, monthly) | Must | 2 |
| F4.5.4 | Scan exclusion rules (paths, parameters) | Should | 2 |
| F4.5.5 | Scan concurrency/speed control | Should | 2 |

**Scan Profiles:**
| Profile | Modules | Thời gian | Use case |
|---|---|---|---|
| **Quick** | Headers, SSL, Exposed files, Ports (top 20) | 2-5 phút | Health check nhanh |
| **Standard** | Quick + SQLi, XSS, Config, Subdomain, Ports (top 100) | 10-20 phút | Scan định kỳ |
| **Deep** | Standard + Full port, Brute-force, All OWASP, Tech detect | 30-60 phút | Initial assessment |

---

## F5. Risk Scoring & Prioritization

### F5.1 Vulnerability Scoring
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F5.1.1 | CVSS v3.1 base scoring | Must | 1 |
| F5.1.2 | Severity classification (Critical, High, Medium, Low, Info) | Must | 1 |
| F5.1.3 | Contextual risk scoring (asset importance × severity) | Should | 2 |
| F5.1.4 | Exploitability indicator | Could | 3 |
| F5.1.5 | Priority ranking algorithm | Must | 1 |

### F5.2 Vulnerability Management
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F5.2.1 | Vulnerability status tracking (Open, In Progress, Fixed, Accepted, False Positive) | Must | 1 |
| F5.2.2 | Remediation guidance (how to fix) | Must | 1 |
| F5.2.3 | Re-scan verification (verify fix) | Should | 2 |
| F5.2.4 | Vulnerability diff (new vs known) | Should | 2 |
| F5.2.5 | Trend tracking (vuln count over time) | Should | 2 |

**Severity Levels:**
| Level | CVSS Score | Color | SLA (fix time) |
|---|---|---|---|
| 🔴 Critical | 9.0 - 10.0 | Red | 24 hours |
| 🟠 High | 7.0 - 8.9 | Orange | 7 days |
| 🟡 Medium | 4.0 - 6.9 | Yellow | 30 days |
| 🔵 Low | 0.1 - 3.9 | Blue | 90 days |
| ⚪ Info | 0.0 | Grey | No SLA |

---

## F6. Dashboard & Analytics

### F6.1 Main Dashboard
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F6.1.1 | Security score tổng (0-100) | Must | 1 |
| F6.1.2 | Vulnerability summary by severity | Must | 1 |
| F6.1.3 | Asset overview (total, new, removed) | Must | 1 |
| F6.1.4 | Recent scan activities | Must | 1 |
| F6.1.5 | Top vulnerable assets | Should | 1 |
| F6.1.6 | Risk trend chart (30/60/90 days) | Should | 2 |
| F6.1.7 | Compliance posture widget | Could | 3 |

### F6.2 Asset View
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F6.2.1 | Asset list với filter/search | Must | 1 |
| F6.2.2 | Asset detail (ports, tech, vulns) | Must | 1 |
| F6.2.3 | Asset topology/map view | Could | 3 |
| F6.2.4 | Asset change history | Should | 2 |

### F6.3 Vulnerability View
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F6.3.1 | Vulnerability list với filter (severity, status, type) | Must | 1 |
| F6.3.2 | Vulnerability detail (description, evidence, remediation) | Must | 1 |
| F6.3.3 | Vulnerability grouping by type/asset | Should | 1 |
| F6.3.4 | Export findings (CSV, JSON) | Should | 2 |

---

## F7. Reporting & Compliance

### F7.1 Reports
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F7.1.1 | Executive summary report (PDF) | Must | 2 |
| F7.1.2 | Technical detail report (PDF) | Must | 2 |
| F7.1.3 | Custom report templates | Could | 3 |
| F7.1.4 | Scheduled report delivery (email) | Should | 3 |
| F7.1.5 | Report branding (logo, colors) | Could | 3 |

### F7.2 Compliance
| ID | Feature | Priority | Phase |
|---|---|---|---|
| F7.2.1 | OWASP Top 10 mapping & checklist | Must | 2 |
| F7.2.2 | PCI-DSS compliance check | Should | 3 |
| F7.2.3 | CIS Benchmarks mapping | Could | 3 |
| F7.2.4 | ISO 27001 control mapping | Could | 3 |

---

## F8. Notifications & Alerting

| ID | Feature | Priority | Phase |
|---|---|---|---|
| F8.1 | Email notification (new critical/high vuln) | Must | 1 |
| F8.2 | In-app notification center | Must | 1 |
| F8.3 | Slack integration | Should | 2 |
| F8.4 | Webhook (custom integration) | Should | 2 |
| F8.5 | Alert rules (custom thresholds) | Could | 3 |
| F8.6 | Daily/weekly digest email | Should | 2 |

---

## F9. Team & Organization

| ID | Feature | Priority | Phase |
|---|---|---|---|
| F9.1 | Organization creation | Must | 1 |
| F9.2 | Invite team members (email) | Must | 2 |
| F9.3 | Role-based access (Owner, Admin, Member, Viewer) | Must | 2 |
| F9.4 | Team activity log | Could | 3 |
| F9.5 | SSO (SAML) for Enterprise | Could | 4 |

---

## F10. API & Integrations

| ID | Feature | Priority | Phase |
|---|---|---|---|
| F10.1 | RESTful API (all features) | Must | 1 |
| F10.2 | API documentation (Swagger/OpenAPI) | Must | 1 |
| F10.3 | API key authentication | Must | 2 |
| F10.4 | CI/CD integration guide (GitHub Actions, GitLab CI) | Should | 2 |
| F10.5 | SARIF output format | Could | 3 |
| F10.6 | Jira integration (auto create ticket) | Could | 3 |

---

## F11. Settings & Configuration

| ID | Feature | Priority | Phase |
|---|---|---|---|
| F11.1 | Organization settings | Must | 1 |
| F11.2 | Notification preferences | Must | 1 |
| F11.3 | Default scan profile | Should | 2 |
| F11.4 | Custom risk scoring weights | Could | 3 |
| F11.5 | Data retention policy | Should | 3 |
| F11.6 | Billing & subscription management | Must | 2 |

---

## Feature Summary by Phase

| Phase | Timeline | Features |
|---|---|---|
| **Phase 1 (MVP)** | Tuần 1-8 | Auth, Target mgmt, Domain verify, Basic discovery, Core vuln scan, Dashboard, Risk scoring |
| **Phase 2** | Tuần 9-14 | Scheduled scans, Reports, Slack/webhook, Teams, API keys, Subdomain takeover, More vuln checks |
| **Phase 3** | Tuần 15-22 | API scanning, Compliance reports, Custom rules, Deep scan, 2FA, SARIF |
| **Phase 4** | Tuần 23+ | Jira integration, SSO, Asset map, Custom templates, Enterprise features |

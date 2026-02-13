# 🔒 Security & Legal Considerations — VulnScan ASM

## 1. Legal & Compliance

### 1.1 Rủi ro pháp lý khi vận hành Vulnerability Scanner

> ⚠️ **QUAN TRỌNG:** Scanning hệ thống mà không có sự đồng ý của chủ sở hữu có thể vi phạm pháp luật tại nhiều quốc gia.

| Quốc gia/Khu vực | Luật liên quan | Rủi ro |
|---|---|---|
| **Việt Nam** | Luật An toàn thông tin mạng 2015, Luật An ninh mạng 2018 | Truy cập trái phép hệ thống thông tin |
| **USA** | Computer Fraud and Abuse Act (CFAA) | Unauthorized access to protected computers |
| **EU** | Computer Misuse Act, NIS2 Directive | Unauthorized access, GDPR data handling |
| **Singapore** | Computer Misuse Act | Unauthorized access or modification |

### 1.2 Biện pháp bảo vệ pháp lý bắt buộc

#### A. Domain Verification (BẮT BUỘC)
- User **PHẢI** chứng minh họ sở hữu domain trước khi scan
- 3 phương thức xác minh (DNS TXT, HTML file, Meta tag)
- Token xác minh unique, hết hạn sau 7 ngày
- Re-verify mỗi 90 ngày

#### B. Terms of Service (ToS)
Phải bao gồm:
- [ ] User chịu trách nhiệm đảm bảo họ có quyền scan target
- [ ] Cấm scan domain/IP không thuộc ownership
- [ ] Miễn trừ trách nhiệm cho VulnScan ASM nếu user vi phạm
- [ ] Giới hạn liability
- [ ] Acceptable use policy
- [ ] Data handling & retention policy

#### C. Privacy Policy
Phải bao gồm:
- [ ] Dữ liệu thu thập (email, domain, scan results)
- [ ] Mục đích sử dụng dữ liệu
- [ ] Thời gian lưu trữ
- [ ] Quyền xóa dữ liệu (right to deletion)
- [ ] Chia sẻ dữ liệu với bên thứ 3 (không)
- [ ] Cookie policy

#### D. Responsible Disclosure
- Nếu phát hiện lỗ hổng critical trên target của user, chỉ thông báo cho user
- KHÔNG KHAI THÁC lỗ hổng (chỉ detect, không exploit)
- Scan ở mức non-intrusive (không modify data, không brute-force login)

---

## 2. Application Security (Bảo mật cho chính VulnScan ASM)

### 2.1 Authentication Security

| Biện pháp | Implementation | Priority |
|---|---|---|
| Password hashing | bcrypt (cost factor 12) | Must |
| JWT security | Short-lived access (15min), refresh (7d), httpOnly cookie | Must |
| Brute-force protection | Rate limit: 5 failed login/15min/IP | Must |
| Account lockout | Lock after 10 failed attempts, unlock sau 30min | Must |
| Password policy | Min 8 chars, 1 upper, 1 lower, 1 number, 1 special | Must |
| Session management | Invalidate all sessions on password change | Must |
| API key security | Hash API key (SHA-256), chỉ hiển thị 1 lần | Must |
| 2FA | TOTP (Google Authenticator) | Phase 3 |

### 2.2 Input Validation & Injection Prevention

| Threat | Protection |
|---|---|
| SQL Injection | Prisma ORM (parameterized queries), never raw SQL |
| XSS | React auto-escaping, CSP header, sanitize user input |
| CSRF | SameSite cookies, CSRF tokens (non-API routes) |
| Command Injection | Never use `exec()` with user input, whitelist approach |
| Path Traversal | Validate file paths, no user-controlled file access |
| SSRF | Validate/whitelist scan targets, block internal IPs |
| Header Injection | Sanitize headers, use helmet.js |

### 2.3 API Security

```
Security Headers (via helmet.js):
├── Content-Security-Policy
├── Strict-Transport-Security (max-age=31536000)
├── X-Content-Type-Options: nosniff
├── X-Frame-Options: DENY
├── X-XSS-Protection: 0 (deprecated, rely on CSP)
├── Referrer-Policy: strict-origin-when-cross-origin
└── Permissions-Policy: camera=(), microphone=(), geolocation=()
```

| Biện pháp | Implementation |
|---|---|
| Rate limiting | express-rate-limit (per IP + per user) |
| Request size limit | Express body parser limit: 1MB |
| CORS | Whitelist allowed origins |
| HTTPS only | Redirect HTTP → HTTPS, HSTS header |
| Input validation | Zod schemas for all endpoints |
| Output filtering | Không leak internal errors, stack traces |
| Logging | Log failed requests, không log passwords/tokens |

### 2.4 Data Security

#### Encryption
| Data | At Rest | In Transit |
|---|---|---|
| Passwords | bcrypt hash (not reversible) | TLS 1.3 |
| API keys | SHA-256 hash | TLS 1.3 |
| Scan results | PostgreSQL (encrypted volume) | TLS 1.3 |
| Reports (PDF) | S3 server-side encryption (AES-256) | TLS 1.3 |
| Database backups | Encrypted (AES-256) | TLS 1.3 |

#### Data Classification
| Level | Data | Handling |
|---|---|---|
| **Confidential** | Passwords, API keys, OAuth tokens | Hash/encrypt, never log, never expose |
| **Sensitive** | Scan results, vulnerabilities | Encrypt at rest, access control, audit log |
| **Internal** | User profiles, org settings | Access control, standard protection |
| **Public** | Landing page, documentation | No restrictions |

#### Data Isolation
- Multi-tenant: Data isolated by `orgId` in every query
- Prisma middleware tự động filter by orgId
- No cross-organization data access
- Database: Row-Level Security (Phase 2)

### 2.5 Scanner Security

| Risk | Biện pháp |
|---|---|
| Scanner bị lợi dụng để DDoS | Rate limit scan frequency, max concurrent scans |
| Scanner truy cập internal network | Block private IP ranges (10.x, 172.16.x, 192.168.x, 127.x) |
| Scan results bị leak | Encrypt, access control, không index by search engines |
| Malicious scan response | Sandbox parser, timeout, max response size |
| Worker compromise | Container isolation, minimal permissions, no root |

#### Blocked IP Ranges (Scanner)
```python
BLOCKED_RANGES = [
    "10.0.0.0/8",       # Private
    "172.16.0.0/12",     # Private
    "192.168.0.0/16",    # Private
    "127.0.0.0/8",       # Loopback
    "169.254.0.0/16",    # Link-local
    "0.0.0.0/8",         # Current network
    "100.64.0.0/10",     # Shared address
    "198.18.0.0/15",     # Benchmark testing
    "fc00::/7",          # IPv6 private
    "::1/128",           # IPv6 loopback
]
```

### 2.6 Infrastructure Security

| Layer | Biện pháp |
|---|---|
| **Network** | VPC, security groups, chỉ expose ports cần thiết |
| **Container** | Non-root user, read-only filesystem, resource limits |
| **Database** | Private subnet, strong password, SSL connections |
| **Redis** | Password auth, private network, no public exposure |
| **Secrets** | Không commit .env, dùng secret manager (production) |
| **Dependencies** | npm audit, Snyk, update regularly |
| **Backup** | Daily automated backup, test restore monthly |

---

## 3. OWASP Top 10 Self-Check

Checklist bảo mật cho chính ứng dụng VulnScan ASM:

| # | OWASP Category | Controls |
|---|---|---|
| A01 | Broken Access Control | RBAC, orgId isolation, verify ownership on every request |
| A02 | Cryptographic Failures | bcrypt, AES-256, TLS 1.3, no weak algorithms |
| A03 | Injection | Prisma ORM (no raw SQL), input sanitization, CSP |
| A04 | Insecure Design | Threat modeling, principle of least privilege |
| A05 | Security Misconfiguration | helmet.js, disable debug in production, secure defaults |
| A06 | Vulnerable Components | npm audit, automated dependency updates, Snyk |
| A07 | Auth Failures | Strong passwords, rate limiting, JWT best practices |
| A08 | Data Integrity Failures | Verify updates, signed deployments, dependency integrity |
| A09 | Logging & Monitoring | Winston logging, Sentry errors, audit trail |
| A10 | SSRF | Block private IPs in scanner, validate scan targets |

---

## 4. Incident Response Plan

### 4.1 Security Incident Categories
| Level | Mô tả | Response Time |
|---|---|---|
| **P0 - Critical** | Data breach, unauthorized access to user data | < 1 hour |
| **P1 - High** | Service compromise, scanner abuse | < 4 hours |
| **P2 - Medium** | Vulnerability in own app, partial service impact | < 24 hours |
| **P3 - Low** | Minor security issue, no data impact | < 72 hours |

### 4.2 Response Steps
1. **Detect** — Monitor alerts, user reports, automated scanning
2. **Contain** — Isolate affected systems, revoke compromised credentials
3. **Assess** — Determine scope, affected users, data impact
4. **Notify** — Inform affected users (if data breach), regulators if required
5. **Remediate** — Fix vulnerability, patch, deploy
6. **Review** — Post-mortem, update procedures, prevent recurrence

---

## 5. Compliance Considerations

### Các tiêu chuẩn liên quan
| Standard | Relevance | Priority |
|---|---|---|
| **GDPR** | Nếu có user EU, phải comply data protection | Must (nếu có EU users) |
| **PDPA (VN)** | Nghị định 13/2023 về bảo vệ dữ liệu cá nhân | Must |
| **SOC 2** | Nếu bán cho enterprise, họ yêu cầu SOC 2 | Phase 4 |
| **ISO 27001** | Best practice, có thể cần cho enterprise | Phase 4 |

### GDPR/PDPA Requirements
- [ ] Consent mechanism cho data collection
- [ ] Right to access (user export data)
- [ ] Right to deletion (user delete account + all data)
- [ ] Data processing agreement (DPA) template
- [ ] Data breach notification procedure (72 hours)
- [ ] Privacy by design principles

---

## 6. Responsible Scanning Guidelines

### Scan Behavior Rules
1. **Non-intrusive only** — Không modify, delete, hoặc write data trên target
2. **No exploitation** — Chỉ detect, không exploit vulnerabilities
3. **Rate controlled** — Max 10 requests/second per target (default)
4. **Respectful** — Honor robots.txt cho directory crawling
5. **Identifiable** — User-Agent chứa contact info: `VulnScan-ASM/1.0 (+https://vulnscan.io/bot)`
6. **Timeout** — Max scan duration: 60 minutes, auto-cancel
7. **Safe payloads** — XSS/SQLi test payloads designed to not cause damage

### Abuse Prevention
- [ ] Domain verification required before any scan
- [ ] Max 3 scans/day per target (Starter plan)
- [ ] Abuse reporting mechanism (email)
- [ ] Automatic ban cho suspicious activity
- [ ] Log all scan activities (audit trail)
- [ ] Manual review cho bulk scanning requests

# 🔌 API Design — VulnScan ASM

## 1. API Overview

- **Base URL:** `https://api.vulnscan.io/v1`
- **Protocol:** HTTPS only
- **Format:** JSON (request & response)
- **Authentication:** Bearer JWT token hoặc API Key
- **Rate Limiting:** 100 req/min (Starter), 1000 req/min (Business)
- **Versioning:** URL-based (`/v1/`)

---

## 2. Authentication

### Headers
```
Authorization: Bearer <jwt_token>
# hoặc
X-API-Key: vsa_xxxxxxxxxxxxxxxxxxxx
```

### Standard Response Format
```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### Error Codes
| HTTP Status | Code | Mô tả |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 3. API Endpoints

### 3.1 Auth (`/v1/auth`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản | No |
| POST | `/auth/login` | Đăng nhập | No |
| POST | `/auth/refresh` | Refresh JWT token | No (refresh token) |
| POST | `/auth/logout` | Đăng xuất | Yes |
| POST | `/auth/forgot-password` | Yêu cầu reset password | No |
| POST | `/auth/reset-password` | Reset password bằng token | No |
| POST | `/auth/verify-email` | Xác thực email | No |

#### POST `/auth/register`
```json
// Request
{
  "email": "user@company.com",
  "password": "SecureP@ss123",
  "name": "Nguyen Van A",
  "orgName": "Company XYZ"       // tự động tạo org
}

// Response 201
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@company.com",
      "name": "Nguyen Van A",
      "emailVerified": false
    },
    "message": "Verification email sent"
  }
}
```

#### POST `/auth/login`
```json
// Request
{
  "email": "user@company.com",
  "password": "SecureP@ss123"
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "user": {
      "id": "clx...",
      "email": "user@company.com",
      "name": "Nguyen Van A",
      "organization": {
        "id": "clx...",
        "name": "Company XYZ",
        "plan": "STARTER"
      }
    }
  }
}
```

---

### 3.2 Users (`/v1/users`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/users/me` | Lấy user profile | Yes |
| PUT | `/users/me` | Cập nhật profile | Yes |
| PUT | `/users/me/password` | Đổi mật khẩu | Yes |

---

### 3.3 Targets (`/v1/targets`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/targets` | List tất cả targets | Yes |
| POST | `/targets` | Thêm target mới | Yes |
| GET | `/targets/:id` | Chi tiết target | Yes |
| PUT | `/targets/:id` | Cập nhật target | Yes |
| DELETE | `/targets/:id` | Xóa target | Yes |
| POST | `/targets/:id/verify` | Trigger domain verification | Yes |
| GET | `/targets/:id/verify/status` | Check verification status | Yes |

#### POST `/targets`
```json
// Request
{
  "type": "DOMAIN",
  "value": "example.com",
  "label": "Main Website",
  "scanProfile": "STANDARD",
  "tags": ["production", "web"]
}

// Response 201
{
  "success": true,
  "data": {
    "id": "clx...",
    "type": "DOMAIN",
    "value": "example.com",
    "label": "Main Website",
    "verificationStatus": "PENDING",
    "verificationToken": "vsa_verify_abc123def456",
    "verificationMethods": {
      "dns": {
        "type": "TXT",
        "host": "_vulnscan-verify.example.com",
        "value": "vsa_verify_abc123def456"
      },
      "html": {
        "path": "/.well-known/vulnscan-verify.txt",
        "content": "vsa_verify_abc123def456"
      },
      "meta": {
        "tag": "<meta name=\"vulnscan-verify\" content=\"vsa_verify_abc123def456\">"
      }
    }
  }
}
```

#### GET `/targets` (with filters)
```
GET /v1/targets?status=VERIFIED&tags=production&page=1&limit=20&sort=-lastScanAt
```

---

### 3.4 Scans (`/v1/scans`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/scans` | List scans | Yes |
| POST | `/scans` | Tạo scan mới | Yes |
| GET | `/scans/:id` | Chi tiết scan | Yes |
| POST | `/scans/:id/cancel` | Hủy scan đang chạy | Yes |
| GET | `/scans/:id/progress` | Scan progress (polling) | Yes |
| GET | `/scans/:id/findings` | Findings của scan | Yes |
| GET | `/scans/:id/results` | Raw scan results | Yes |

#### POST `/scans`
```json
// Request
{
  "targetId": "clx...",
  "profile": "STANDARD",
  "modules": ["discovery", "web_scan", "ssl_check", "header_check"]
  // modules là optional, nếu không gửi sẽ dùng theo profile
}

// Response 202 (Accepted)
{
  "success": true,
  "data": {
    "id": "clx...",
    "targetId": "clx...",
    "status": "QUEUED",
    "profile": "STANDARD",
    "modules": ["discovery", "web_scan", "ssl_check", "header_check"],
    "progress": 0,
    "estimatedDuration": 600,
    "createdAt": "2025-03-20T10:30:00Z"
  }
}
```

#### GET `/scans/:id` (completed scan)
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "target": {
      "id": "clx...",
      "value": "example.com"
    },
    "status": "COMPLETED",
    "profile": "STANDARD",
    "progress": 100,
    "startedAt": "2025-03-20T10:30:05Z",
    "completedAt": "2025-03-20T10:42:15Z",
    "duration": 730,
    "summary": {
      "totalAssets": 47,
      "newAssets": 3,
      "totalVulns": 12,
      "criticalCount": 1,
      "highCount": 3,
      "mediumCount": 5,
      "lowCount": 2,
      "infoCount": 1
    }
  }
}
```

---

### 3.5 Assets (`/v1/assets`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/assets` | List assets (all targets) | Yes |
| GET | `/assets/:id` | Chi tiết asset | Yes |
| GET | `/targets/:id/assets` | Assets của 1 target | Yes |

#### GET `/assets` (with filters)
```
GET /v1/assets?targetId=clx...&type=SUBDOMAIN&isActive=true&page=1&limit=50
```

#### GET `/assets/:id`
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "type": "SUBDOMAIN",
    "value": "api.example.com",
    "ip": "203.0.113.10",
    "ports": [
      { "port": 443, "protocol": "tcp", "service": "https", "version": "nginx/1.24.0" },
      { "port": 8080, "protocol": "tcp", "service": "http-proxy" }
    ],
    "technologies": [
      { "name": "Nginx", "version": "1.24.0", "category": "Web Server" },
      { "name": "Node.js", "version": null, "category": "Runtime" },
      { "name": "Express", "version": null, "category": "Framework" }
    ],
    "httpStatus": 200,
    "sslInfo": {
      "issuer": "Let's Encrypt",
      "validFrom": "2025-01-15",
      "validTo": "2025-04-15",
      "daysUntilExpiry": 26,
      "grade": "A"
    },
    "firstSeenAt": "2025-01-20T08:00:00Z",
    "lastSeenAt": "2025-03-20T10:35:00Z",
    "isActive": true,
    "findingsCount": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 1,
      "info": 0
    }
  }
}
```

---

### 3.6 Vulnerabilities (`/v1/vulnerabilities`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/vulnerabilities` | List all findings | Yes |
| GET | `/vulnerabilities/:id` | Chi tiết finding | Yes |
| PUT | `/vulnerabilities/:id/status` | Update status | Yes |
| GET | `/vulnerabilities/stats` | Statistics/aggregation | Yes |

#### GET `/vulnerabilities` (with filters)
```
GET /v1/vulnerabilities?severity=CRITICAL,HIGH&status=OPEN&targetId=clx...&category=SQL_INJECTION&page=1&limit=20&sort=-cvssScore
```

#### GET `/vulnerabilities/:id`
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "title": "SQL Injection in Login Form",
    "description": "A SQL injection vulnerability was detected in the login form at /api/login. The 'username' parameter is vulnerable to error-based SQL injection.",
    "severity": "CRITICAL",
    "cvssScore": 9.8,
    "cvssVector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    "category": "SQL_INJECTION",
    "owaspCategory": "A03:2021 - Injection",
    "cweId": "CWE-89",
    "asset": {
      "id": "clx...",
      "value": "api.example.com"
    },
    "evidence": {
      "affectedUrl": "https://api.example.com/api/login",
      "affectedParam": "username",
      "method": "POST",
      "payload": "' OR 1=1 --",
      "request": "POST /api/login HTTP/1.1\nHost: api.example.com\n...",
      "response": "HTTP/1.1 500 Internal Server Error\n... SQL syntax error ..."
    },
    "remediation": "1. Use parameterized queries/prepared statements\n2. Implement input validation\n3. Apply the principle of least privilege to database accounts\n4. Use an ORM framework",
    "references": [
      "https://owasp.org/www-community/attacks/SQL_Injection",
      "https://cwe.mitre.org/data/definitions/89.html"
    ],
    "status": "OPEN",
    "firstFoundAt": "2025-03-20T10:38:00Z",
    "lastFoundAt": "2025-03-20T10:38:00Z",
    "occurrences": 1
  }
}
```

#### PUT `/vulnerabilities/:id/status`
```json
// Request
{
  "status": "IN_PROGRESS",
  "notes": "Assigned to dev team for patching"
}

// Response 200
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "IN_PROGRESS",
    "updatedAt": "2025-03-20T14:00:00Z"
  }
}
```

#### GET `/vulnerabilities/stats`
```json
{
  "success": true,
  "data": {
    "total": 45,
    "bySeverity": {
      "critical": 2,
      "high": 8,
      "medium": 15,
      "low": 12,
      "info": 8
    },
    "byStatus": {
      "open": 25,
      "inProgress": 10,
      "fixed": 5,
      "accepted": 3,
      "falsePositive": 2
    },
    "byCategory": {
      "SECURITY_HEADERS": 10,
      "SSL_TLS": 5,
      "XSS_REFLECTED": 4,
      "SQL_INJECTION": 2,
      "OTHER": 24
    },
    "trend": [
      { "date": "2025-03-14", "open": 30, "fixed": 2 },
      { "date": "2025-03-15", "open": 28, "fixed": 4 },
      { "date": "2025-03-20", "open": 25, "fixed": 5 }
    ]
  }
}
```

---

### 3.7 Reports (`/v1/reports`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/reports` | List reports | Yes |
| POST | `/reports` | Generate report | Yes |
| GET | `/reports/:id` | Report status & download link | Yes |
| DELETE | `/reports/:id` | Delete report | Yes |

#### POST `/reports`
```json
// Request
{
  "type": "EXECUTIVE_SUMMARY",
  "format": "PDF",
  "title": "Monthly Security Report - March 2025",
  "parameters": {
    "targetIds": ["clx...", "clx..."],
    "dateRange": {
      "from": "2025-03-01",
      "to": "2025-03-31"
    },
    "includeSeverities": ["CRITICAL", "HIGH", "MEDIUM"],
    "includeFixed": false
  }
}

// Response 202
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "generating",
    "estimatedTime": 30
  }
}
```

---

### 3.8 Notifications (`/v1/notifications`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/notifications` | List notifications | Yes |
| PUT | `/notifications/:id/read` | Mark as read | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |
| GET | `/notifications/unread-count` | Unread count | Yes |

---

### 3.9 Organization (`/v1/org`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/org` | Current org details | Yes |
| PUT | `/org` | Update org settings | Yes (Admin) |
| GET | `/org/members` | List members | Yes |
| POST | `/org/members/invite` | Invite member | Yes (Admin) |
| PUT | `/org/members/:id/role` | Change member role | Yes (Owner) |
| DELETE | `/org/members/:id` | Remove member | Yes (Admin) |
| GET | `/org/usage` | Usage statistics | Yes |

---

### 3.10 API Keys (`/v1/api-keys`)

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/api-keys` | List API keys | Yes |
| POST | `/api-keys` | Generate new key | Yes |
| DELETE | `/api-keys/:id` | Revoke key | Yes |

---

## 4. WebSocket Events

### Connection
```javascript
const socket = io('wss://api.vulnscan.io', {
  auth: { token: 'jwt_token_here' }
});
```

### Server → Client Events
| Event | Data | Trigger |
|---|---|---|
| `scan:progress` | `{ scanId, progress, currentModule, message }` | Scan progress update |
| `scan:completed` | `{ scanId, summary }` | Scan finished |
| `scan:failed` | `{ scanId, error }` | Scan error |
| `scan:finding` | `{ scanId, finding }` | New vuln found (real-time) |
| `asset:discovered` | `{ scanId, asset }` | New asset found |
| `notification:new` | `{ notification }` | New notification |

### Client → Server Events
| Event | Data | Mô tả |
|---|---|---|
| `scan:subscribe` | `{ scanId }` | Subscribe to scan updates |
| `scan:unsubscribe` | `{ scanId }` | Unsubscribe |

---

## 5. Pagination, Filtering, Sorting

### Pagination
```
GET /v1/vulnerabilities?page=2&limit=20
```

### Filtering
```
GET /v1/vulnerabilities?severity=CRITICAL,HIGH&status=OPEN&targetId=clx...
```

### Sorting
```
GET /v1/vulnerabilities?sort=-cvssScore,createdAt
# Prefix - for descending
```

### Search
```
GET /v1/vulnerabilities?search=sql+injection
```

---

## 6. Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1679313600
```

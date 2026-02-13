# 🏗️ System Architecture — VulnScan ASM

## 1. Kiến trúc tổng quan (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Web App      │  │  CLI Tool    │  │  Browser Extension       │  │
│  │  (React/Next) │  │  (Node.js)   │  │  (Phase 3)               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Nginx/Traefik)                 │
│                    Rate Limiting │ Auth │ Load Balancing             │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────────┐
│                     SERVER LAYER                                     │
│  ┌──────────────────────┼──────────────────────────────────────┐    │
│  │              API Server (Node.js/Express)                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │    │
│  │  │ Auth     │ │ Scan     │ │ Asset     │ │ Report       │  │    │
│  │  │ Module   │ │ Manager  │ │ Manager   │ │ Generator    │  │    │
│  │  └──────────┘ └────┬─────┘ └───────────┘ └──────────────┘  │    │
│  └─────────────────────┼──────────────────────────────────────┘    │
│                        │                                            │
│  ┌─────────────────────┼──────────────────────────────────────┐    │
│  │            Message Queue (Redis/Bull)                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │    │
│  │  │ Scan     │ │ Discovery│ │ Alert     │ │ Report      │  │    │
│  │  │ Queue    │ │ Queue    │ │ Queue     │ │ Queue       │  │    │
│  │  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬──────┘  │    │
│  └───────┼────────────┼─────────────┼───────────────┼─────────┘    │
│          │            │             │               │               │
│  ┌───────┼────────────┼─────────────┼───────────────┼─────────┐    │
│  │       ▼            ▼             ▼               ▼          │    │
│  │              Worker Pool (Python)                           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │    │
│  │  │ Scan     │ │ Discovery│ │ Notifier  │ │ Report      │  │    │
│  │  │ Workers  │ │ Workers  │ │ Worker    │ │ Worker      │  │    │
│  │  └──────────┘ └──────────┘ └───────────┘ └─────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────────┐
│                     DATA LAYER                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ PostgreSQL   │ │ Redis        │ │ S3/MinIO     │                 │
│  │ (Main DB)    │ │ (Cache/Queue)│ │ (Reports/    │                 │
│  │              │ │              │ │  Artifacts)  │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Component Details

### 2.1 Client Layer

#### Web Application (React/Next.js)
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand / TanStack Query
- **Charts:** Recharts / D3.js
- **Chức năng:**
  - Dashboard tổng quan
  - Quản lý targets (domains, IPs)
  - Xem kết quả scan, vulnerability details
  - Cấu hình scan profiles
  - Báo cáo & export
  - Quản lý team & settings

#### CLI Tool (Phase 2)
- **Ngôn ngữ:** Node.js
- **Chức năng:** Quick scan từ terminal, CI/CD integration
- **Output:** JSON, Table, SARIF format

### 2.2 API Gateway
- **Nginx** hoặc **Traefik** (reverse proxy)
- Rate limiting: 100 req/min (free), 1000 req/min (paid)
- SSL termination
- Request/response logging
- CORS handling

### 2.3 API Server (Node.js)

```
server/
├── src/
│   ├── config/              # Environment, database config
│   ├── middleware/           # Auth, rate-limit, validation, error handling
│   ├── modules/
│   │   ├── auth/            # Authentication & authorization
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── users/           # User management
│   │   ├── targets/         # Target (domain/IP) management
│   │   ├── scans/           # Scan orchestration
│   │   ├── assets/          # Asset discovery results
│   │   ├── vulnerabilities/ # Vulnerability findings
│   │   ├── reports/         # Report generation
│   │   └── notifications/   # Alert & notification
│   ├── jobs/                # Queue job definitions
│   ├── utils/               # Helpers, logger, crypto
│   └── app.ts               # Express app bootstrap
├── tests/
├── package.json
└── tsconfig.json
```

**Modules chính:**

| Module | Trách nhiệm |
|---|---|
| **Auth** | JWT authentication, OAuth (Google/GitHub), API key management |
| **Users** | CRUD users, team management, roles & permissions |
| **Targets** | Quản lý domain/IP targets, domain verification |
| **Scans** | Tạo scan jobs, theo dõi trạng thái, lấy kết quả |
| **Assets** | Lưu trữ & quản lý discovered assets |
| **Vulnerabilities** | CRUD findings, risk scoring, status tracking |
| **Reports** | Generate PDF/HTML reports, compliance mapping |
| **Notifications** | Email, Slack, webhook alerts |

### 2.4 Scanner Engine (Python Workers)

```
server/scanner/
├── engine/
│   ├── __init__.py
│   ├── orchestrator.py      # Điều phối các scan modules
│   ├── result_parser.py     # Parse & normalize kết quả
│   └── risk_scorer.py       # Tính risk score (CVSS-based)
├── modules/
│   ├── discovery/
│   │   ├── subdomain_enum.py    # Subdomain enumeration
│   │   ├── port_scanner.py      # Port scanning (nmap wrapper)
│   │   ├── tech_detector.py     # Technology detection (Wappalyzer)
│   │   └── dns_resolver.py      # DNS records analysis
│   ├── web_scanner/
│   │   ├── sqli_scanner.py      # SQL Injection
│   │   ├── xss_scanner.py       # Cross-Site Scripting
│   │   ├── ssrf_scanner.py      # Server-Side Request Forgery
│   │   ├── header_checker.py    # Security headers analysis
│   │   ├── ssl_checker.py       # SSL/TLS configuration
│   │   ├── cors_checker.py      # CORS misconfiguration
│   │   └── directory_enum.py    # Directory/file enumeration
│   ├── api_scanner/
│   │   ├── endpoint_discovery.py
│   │   ├── auth_checker.py
│   │   └── data_exposure.py
│   └── infra_scanner/
│       ├── cloud_misconfig.py   # Cloud misconfiguration
│       ├── open_ports.py        # Dangerous open ports
│       └── service_version.py   # Outdated service detection
├── templates/                   # Nuclei-compatible templates
├── wordlists/                   # Subdomain, directory wordlists
├── worker.py                    # Celery/RQ worker entry point
└── requirements.txt
```

### 2.5 Message Queue System

```
Scan Flow:
                                                    
  API Request ──► Scan Manager ──► Redis Queue ──► Worker Pool
       │                                              │
       │              ┌───────────────────────────────┘
       │              ▼
       │         ┌──────────┐
       │         │ Worker 1 │──► Subdomain Discovery
       │         │ Worker 2 │──► Port Scanning
       │         │ Worker 3 │──► Web Vuln Scan
       │         │ Worker 4 │──► SSL/Header Check
       │         └──────────┘
       │              │
       │              ▼
       │      Results ──► PostgreSQL
       │              │
       ▼              ▼
  WebSocket ◄── Real-time Updates
  (Dashboard)
```

**Queue Types:**
| Queue | Priority | Concurrency | Mô tả |
|---|---|---|---|
| `discovery:high` | High | 5 | Asset discovery tasks |
| `scan:normal` | Normal | 3 | Vulnerability scanning |
| `scan:deep` | Low | 1 | Deep/intensive scans |
| `report:generate` | Low | 2 | Report generation |
| `notify:alert` | High | 5 | Critical alerts |

### 2.6 Data Layer

#### PostgreSQL (Primary Database)
- Structured data: users, targets, scans, vulnerabilities, reports
- Full-text search cho vulnerability descriptions
- Partitioning theo thời gian cho scan results

#### Redis
- **Caching:** API responses, scan status
- **Queue:** Bull MQ job queue
- **Session:** User session store
- **Rate limiting:** Request counting
- **Pub/Sub:** Real-time scan updates

#### Object Storage (S3/MinIO)
- Scan reports (PDF, HTML)
- Screenshots of vulnerabilities
- Raw scan artifacts/logs

## 3. Communication Patterns

### 3.1 Synchronous (REST API)
- Client ↔ API Server: CRUD operations
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response

### 3.2 Asynchronous (Message Queue)
- API Server → Worker: Scan jobs via Redis Queue
- Worker → API Server: Results via database + event

### 3.3 Real-time (WebSocket)
- Scan progress updates
- New vulnerability alerts
- Asset discovery live feed

## 4. Luồng xử lý chính (Key Flows)

### 4.1 Scan Flow

```
1. User tạo scan request (POST /api/scans)
2. API Server validate input, check quota
3. API Server tạo scan record (status: queued)
4. API Server push job vào Redis Queue
5. Worker pick up job từ queue
6. Worker chạy scan modules theo profile
   a. Asset Discovery (subdomain, ports, tech)
   b. Vulnerability Scanning (OWASP checks)
   c. Risk Scoring (CVSS calculation)
7. Worker lưu results vào PostgreSQL
8. Worker emit event qua Redis Pub/Sub
9. API Server forward event qua WebSocket
10. Client nhận real-time update
11. Worker update scan status: completed
12. Notification worker gửi alert nếu có critical findings
```

### 4.2 Domain Verification Flow

```
1. User thêm target domain
2. System generate verification token
3. User chứng minh ownership bằng 1 trong 3 cách:
   a. DNS TXT record: _vulnscan-verify.domain.com TXT "token"
   b. HTML file: domain.com/.well-known/vulnscan-verify.txt
   c. Meta tag: <meta name="vulnscan-verify" content="token">
4. System verify → domain activated
5. Scanning enabled cho domain
```

## 5. Deployment Architecture

### Development
```
Docker Compose:
  - api-server (Node.js)
  - scanner-worker (Python)
  - postgres (Database)
  - redis (Cache/Queue)
  - minio (Object Storage)
  - nginx (Reverse Proxy)
```

### Production
```
┌─────────────────────────────────────────────┐
│              Cloud Provider (AWS/GCP)        │
│                                             │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ CDN      │    │ Load Balancer        │   │
│  │(CloudFront)   │ (ALB/Cloud LB)      │   │
│  └────┬─────┘    └──────────┬───────────┘   │
│       │                     │               │
│  ┌────┴─────┐    ┌──────────┴───────────┐   │
│  │ Static   │    │ API Servers (2-4)    │   │
│  │ Frontend │    │ (ECS/Cloud Run)      │   │
│  │ (S3/GCS) │    └──────────┬───────────┘   │
│  └──────────┘               │               │
│                  ┌──────────┴───────────┐   │
│                  │ Scanner Workers (2-8)│   │
│                  │ (ECS/Cloud Run)      │   │
│                  └──────────┬───────────┘   │
│                             │               │
│  ┌──────────┐    ┌──────────┴───────────┐   │
│  │ Redis    │    │ PostgreSQL           │   │
│  │(ElastiC.)│    │ (RDS/Cloud SQL)      │   │
│  └──────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 6. Security Architecture

### Authentication & Authorization
- **JWT** với access token (15min) + refresh token (7d)
- **API Keys** cho programmatic access
- **RBAC:** Owner, Admin, Member, Viewer
- **OAuth 2.0:** Google, GitHub SSO

### Data Security
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Sensitive data hashing (bcrypt for passwords)
- API key encryption in database

### Scan Security
- Domain verification bắt buộc trước khi scan
- Rate limiting per scan target
- Scan isolation (containerized workers)
- No credential storage — scan external surface only

## 7. Scalability Considerations

| Component | Horizontal Scale | Vertical Scale |
|---|---|---|
| API Server | ✅ Stateless, load balanced | CPU/RAM tùy traffic |
| Scanner Workers | ✅ Add workers theo demand | RAM cho concurrent scans |
| PostgreSQL | Read replicas | CPU/RAM/Storage |
| Redis | Cluster mode | RAM |
| Object Storage | ✅ Auto-scaling | N/A |

### Auto-scaling Rules
- API Server: Scale khi CPU > 70% hoặc response time > 500ms
- Workers: Scale khi queue depth > 10 jobs pending > 5 min

# 🛠️ Tech Stack & Infrastructure — VulnScan ASM

## 1. Tổng quan Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: Next.js 14 + TypeScript + Tailwind + shadcn/ui│
├─────────────────────────────────────────────────────────┤
│ API Server: Node.js + Express + TypeScript              │
├─────────────────────────────────────────────────────────┤
│ Scanner Engine: Python 3.11+ + Celery                   │
├─────────────────────────────────────────────────────────┤
│ Database: PostgreSQL 16 + Redis 7                       │
├─────────────────────────────────────────────────────────┤
│ Infrastructure: Docker + Nginx + S3/MinIO               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Frontend (Client)

### Core
| Technology | Version | Mục đích |
|---|---|---|
| **Next.js** | 14+ | React framework, SSR, routing, API routes |
| **TypeScript** | 5.x | Type safety |
| **React** | 18+ | UI library |

### UI & Styling
| Technology | Mục đích |
|---|---|
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Accessible, customizable component library |
| **Lucide React** | Icon library |
| **Framer Motion** | Animations |

### Data & State
| Technology | Mục đích |
|---|---|
| **TanStack Query (React Query)** | Server state management, caching |
| **Zustand** | Client state management (lightweight) |
| **Axios** | HTTP client |
| **Socket.io Client** | WebSocket real-time updates |

### Visualization
| Technology | Mục đích |
|---|---|
| **Recharts** | Charts (bar, line, pie, area) |
| **D3.js** | Complex visualizations (asset map) — Phase 3 |

### Forms & Validation
| Technology | Mục đích |
|---|---|
| **React Hook Form** | Form management |
| **Zod** | Schema validation (shared với backend) |

### Dev Tools
| Technology | Mục đích |
|---|---|
| **ESLint** | Linting |
| **Prettier** | Code formatting |
| **Storybook** | Component documentation — Phase 2 |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing — Phase 2 |

### Client Folder Structure
```
client/
├── public/
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth layout group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── layout.tsx      # Sidebar + header layout
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── targets/        # Target management
│   │   │   ├── scans/          # Scan management
│   │   │   ├── assets/         # Asset discovery
│   │   │   ├── vulnerabilities/# Vulnerability list
│   │   │   ├── reports/        # Reports
│   │   │   └── settings/       # Settings
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Header, Sidebar, Footer
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── targets/            # Target-related components
│   │   ├── scans/              # Scan-related components
│   │   ├── vulnerabilities/    # Vuln-related components
│   │   └── common/             # Shared components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities, API client, helpers
│   ├── services/               # API service layer
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── styles/                 # Global styles
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Backend — API Server (Node.js)

### Core
| Technology | Version | Mục đích |
|---|---|---|
| **Node.js** | 20 LTS | Runtime |
| **Express.js** | 4.x | Web framework |
| **TypeScript** | 5.x | Type safety |

### Authentication
| Technology | Mục đích |
|---|---|
| **jsonwebtoken** | JWT token generation/verification |
| **bcryptjs** | Password hashing |
| **passport.js** | OAuth strategies (Google, GitHub) |

### Database & ORM
| Technology | Mục đích |
|---|---|
| **Prisma** | ORM, migrations, type-safe queries |
| **pg** | PostgreSQL driver |
| **ioredis** | Redis client |

### Queue & Workers
| Technology | Mục đích |
|---|---|
| **BullMQ** | Job queue (Redis-based) |
| **bull-board** | Queue monitoring dashboard |

### Real-time
| Technology | Mục đích |
|---|---|
| **Socket.io** | WebSocket server |

### Validation & Security
| Technology | Mục đích |
|---|---|
| **Zod** | Input validation |
| **helmet** | HTTP security headers |
| **cors** | CORS configuration |
| **express-rate-limit** | Rate limiting |
| **hpp** | HTTP parameter pollution protection |

### Email
| Technology | Mục đích |
|---|---|
| **nodemailer** | Send emails |
| **@react-email/components** | Email templates |
| **Resend** (hoặc SendGrid) | Email delivery service |

### File & Reports
| Technology | Mục đích |
|---|---|
| **@aws-sdk/client-s3** | S3/MinIO object storage |
| **puppeteer** | PDF report generation |

### Logging & Monitoring
| Technology | Mục đích |
|---|---|
| **winston** | Structured logging |
| **morgan** | HTTP request logging |
| **Sentry** | Error tracking — Phase 2 |

### Testing
| Technology | Mục đích |
|---|---|
| **Jest** | Unit & integration testing |
| **supertest** | API endpoint testing |

### Server Folder Structure
```
server/
├── src/
│   ├── config/
│   │   ├── database.ts         # Prisma client setup
│   │   ├── redis.ts            # Redis connection
│   │   ├── queue.ts            # BullMQ setup
│   │   ├── storage.ts          # S3/MinIO setup
│   │   └── env.ts              # Environment validation
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── validate.ts         # Zod validation middleware
│   │   ├── errorHandler.ts     # Global error handler
│   │   └── logger.ts           # Request logging
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts
│   │   ├── users/
│   │   ├── targets/
│   │   ├── scans/
│   │   ├── assets/
│   │   ├── vulnerabilities/
│   │   ├── reports/
│   │   └── notifications/
│   ├── jobs/
│   │   ├── scan.job.ts
│   │   ├── discovery.job.ts
│   │   ├── report.job.ts
│   │   └── notification.job.ts
│   ├── utils/
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   ├── crypto.ts
│   │   └── helpers.ts
│   ├── types/
│   │   └── index.ts
│   ├── socket/
│   │   └── index.ts            # WebSocket event handlers
│   └── app.ts
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/
│   └── seed.ts                 # Seed data
├── tests/
├── .env
├── Dockerfile
├── tsconfig.json
└── package.json
```

---

## 4. Backend — Scanner Engine (Python)

### Core
| Technology | Version | Mục đích |
|---|---|---|
| **Python** | 3.11+ | Scanner runtime |
| **Celery** | 5.x | Distributed task queue |
| **Redis** | — | Message broker cho Celery |

### Scanning Libraries
| Technology | Mục đích |
|---|---|
| **python-nmap** | Port scanning (nmap wrapper) |
| **dnspython** | DNS resolution & enumeration |
| **requests** / **httpx** | HTTP requests cho web scanning |
| **beautifulsoup4** | HTML parsing |
| **ssl** (stdlib) | SSL/TLS analysis |
| **Wappalyzer (python)** | Technology detection |
| **sublist3r** / custom | Subdomain enumeration |

### Vulnerability Detection
| Technology | Mục đích |
|---|---|
| **sqlmap** (subprocess) | SQL injection detection (reference) |
| **Custom modules** | XSS, SSRF, header checks, etc. |
| **nuclei** (subprocess) | Template-based vuln scanning |

### Data & Communication
| Technology | Mục đích |
|---|---|
| **psycopg2** / **SQLAlchemy** | PostgreSQL connection |
| **redis-py** | Redis communication |
| **pydantic** | Data validation |

### Scanner Folder Structure
```
server/scanner/
├── engine/
│   ├── __init__.py
│   ├── orchestrator.py         # Main scan orchestrator
│   ├── result_parser.py        # Normalize scan results
│   ├── risk_scorer.py          # CVSS scoring
│   └── config.py               # Scanner configuration
├── modules/
│   ├── __init__.py
│   ├── discovery/
│   │   ├── __init__.py
│   │   ├── subdomain_enum.py
│   │   ├── port_scanner.py
│   │   ├── tech_detector.py
│   │   └── dns_resolver.py
│   ├── web_scanner/
│   │   ├── __init__.py
│   │   ├── sqli_scanner.py
│   │   ├── xss_scanner.py
│   │   ├── header_checker.py
│   │   ├── ssl_checker.py
│   │   ├── cors_checker.py
│   │   ├── sensitive_files.py
│   │   └── directory_enum.py
│   └── infra_scanner/
│       ├── __init__.py
│       ├── email_security.py
│       ├── open_ports.py
│       └── service_version.py
├── templates/                  # Custom scan templates
├── wordlists/
│   ├── subdomains.txt
│   ├── directories.txt
│   └── common_files.txt
├── tasks.py                    # Celery task definitions
├── worker.py                   # Celery worker entry
├── requirements.txt
├── Dockerfile
└── pytest.ini
```

---

## 5. Database

### PostgreSQL 16
- **Role:** Primary data store
- **Features used:**
  - JSONB columns cho flexible scan results
  - Full-text search cho vulnerability search
  - Table partitioning cho scan_results (by date)
  - Materialized views cho dashboard aggregation
  - Row-Level Security (Phase 2)

### Redis 7
- **Role:** Multi-purpose
  - Cache (API responses, scan status) — TTL: 5-60 min
  - Queue (BullMQ jobs) — persistent
  - Session store — TTL: 7 days
  - Rate limiting counter — TTL: 1 min
  - Pub/Sub (real-time updates) — ephemeral

---

## 6. Infrastructure

### Development Environment
| Service | Implementation |
|---|---|
| **Containerization** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx (local) |
| **Object Storage** | MinIO (S3-compatible, local) |
| **Mail** | MailHog (local email testing) |

### Docker Compose Services
```yaml
services:
  client:         # Next.js dev server (port 3000)
  api:            # Express API server (port 4000)
  scanner-worker: # Python Celery worker
  postgres:       # PostgreSQL (port 5432)
  redis:          # Redis (port 6379)
  minio:          # MinIO S3 (port 9000)
  mailhog:        # Email testing (port 8025)
  nginx:          # Reverse proxy (port 80)
```

### Production Environment (Recommended)
| Service | AWS | GCP | Budget Option |
|---|---|---|---|
| **Frontend** | S3 + CloudFront | Cloud Storage + CDN | Vercel |
| **API Server** | ECS Fargate | Cloud Run | Railway / Render |
| **Scanner Workers** | ECS Fargate | Cloud Run | Railway / VPS |
| **Database** | RDS PostgreSQL | Cloud SQL | Supabase / Neon |
| **Cache/Queue** | ElastiCache Redis | Memorystore | Upstash Redis |
| **Storage** | S3 | Cloud Storage | Cloudflare R2 |
| **Email** | SES | — | Resend |
| **Monitoring** | CloudWatch | Cloud Monitoring | Sentry + Grafana Cloud |
| **CI/CD** | CodePipeline | Cloud Build | GitHub Actions |

### Estimated Monthly Cost (Production)
| Tier | Users | Estimated Cost |
|---|---|---|
| **Bootstrap** | <100 | $50-100/mo (Vercel + Railway + Supabase) |
| **Growth** | 100-500 | $200-500/mo (AWS/GCP small instances) |
| **Scale** | 500-2000 | $500-2000/mo (managed services) |

---

## 7. DevOps & CI/CD

### Version Control
- **Git** with GitHub
- **Branching:** GitHub Flow (main + feature branches)
- **Commit convention:** Conventional Commits

### CI/CD Pipeline (GitHub Actions)
```
Push to feature branch:
  → Lint (ESLint, Prettier, Pylint)
  → Type check (tsc)
  → Unit tests (Jest, Pytest)
  → Build check
  
Pull Request to main:
  → All above +
  → Integration tests
  → Security scan (Snyk/Trivy)
  → Preview deployment

Merge to main:
  → Build Docker images
  → Push to Container Registry
  → Deploy to staging
  → Run smoke tests
  → Manual approval → Deploy to production
```

### Monitoring & Observability
| Layer | Tool |
|---|---|
| **Error Tracking** | Sentry |
| **APM** | Sentry Performance |
| **Logging** | Winston → stdout → CloudWatch/Loki |
| **Metrics** | Prometheus + Grafana (Phase 2) |
| **Uptime** | UptimeRobot / Better Uptime |

---

## 8. Third-party Services

| Service | Provider | Mục đích | Tiers |
|---|---|---|---|
| **Email** | Resend | Transactional email | Free: 3000/mo |
| **Error Tracking** | Sentry | Error monitoring | Free: 5K events/mo |
| **Analytics** | PostHog (self-hosted) | Product analytics | Free |
| **Auth (backup)** | — | JWT self-managed | — |
| **Payments** | Stripe | Subscription billing | 2.9% + $0.30 |
| **CDN** | Cloudflare | DNS, CDN, DDoS protection | Free plan |
| **Vulnerability DB** | NVD / CVE | Known vulnerabilities | Free API |

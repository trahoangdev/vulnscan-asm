<div align="center">

# 🛡️ VulnScan ASM

### Vulnerability Scanner & Attack Surface Management Platform

Nền tảng quản lý bề mặt tấn công và quét lỗ hổng bảo mật toàn diện, giúp doanh nghiệp SME chủ động phát hiện và khắc phục rủi ro an ninh mạng.

[![CI](https://github.com/trahoangdev/vulnscan-asm/actions/workflows/ci.yml/badge.svg)](https://github.com/trahoangdev/vulnscan-asm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)

[English](README.en.md)

</div>

---

## ✨ Highlights

- **Discover** — Tự động phát hiện tất cả tài sản số (subdomains, APIs, services) từ domain gốc
- **Scan** — 15 scanner modules: port scan, SSL analysis, CVE matching, API security, IDOR detection, ...
- **Prioritize** — Risk scoring CVSS v3.1, phân loại Critical → Info, đề xuất thứ tự fix
- **Report** — Báo cáo compliance-ready (PDF/CSV) cho cả kỹ thuật và management
- **Monitor** — Giám sát liên tục, real-time alerts qua Email, Slack, Webhook
- **Billing** — Tích hợp Polar.sh cho subscription management

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client — Next.js 14 · TypeScript · Tailwind · shadcn/ui   │
├─────────────────────────────────────────────────────────────┤
│  API Server — Express · TypeScript · Prisma · BullMQ        │
├─────────────────────────────────────────────────────────────┤
│  Scanner Engine — Python 3.11 · Celery · 15 Modules         │
├─────────────────────────────────────────────────────────────┤
│  Data — PostgreSQL 16 · Redis 7 · S3/MinIO                  │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript 5, Tailwind CSS, shadcn/ui, Recharts, React Query, Zustand, Socket.io |
| **API Server** | Node.js 20, Express 4, TypeScript, Prisma ORM, BullMQ, Zod, JWT, Socket.io |
| **Scanner** | Python 3.11, Celery, nmap, httpx, dnspython, cryptography, BeautifulSoup |
| **Database** | PostgreSQL 16 (primary), Redis 7 (cache + queue) |
| **Storage** | S3-compatible (MinIO dev / AWS S3 prod) |
| **Billing** | Polar.sh SDK |
| **CI/CD** | GitHub Actions (lint, test, build, Storybook, Playwright E2E, Docker, security audit) |
| **Container** | Docker, Docker Compose, Nginx reverse proxy |

---

## 📦 Project Structure

```
vulnscan-asm/
├── client/                    # Next.js 14 frontend
│   ├── src/
│   │   ├── app/               # App Router (auth, dashboard, landing)
│   │   ├── components/        # UI components (shadcn/ui based)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities, API client, stores
│   │   └── styles/            # Global CSS
│   ├── e2e/                   # Playwright E2E tests
│   ├── .storybook/            # Storybook config
│   └── playwright.config.ts
│
├── server/                    # Express API server
│   ├── src/
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/          #   Authentication & JWT
│   │   │   ├── assets/        #   Asset management
│   │   │   ├── scans/         #   Scan orchestration
│   │   │   ├── vulnerabilities/ # Vulnerability tracking
│   │   │   ├── reports/       #   Report generation
│   │   │   ├── billing/       #   Polar.sh subscription
│   │   │   ├── integrations/  #   Slack, Webhook, Email
│   │   │   ├── organizations/ #   Multi-tenant orgs
│   │   │   └── ...            #   alerts, dashboard, users, etc.
│   │   ├── middleware/        # Auth, rate-limit, validation
│   │   ├── utils/             # Logger, helpers
│   │   └── app.ts             # Entry point
│   ├── prisma/                # Schema + migrations
│   └── tests/                 # Jest unit tests (83 tests)
│
├── scanner/                   # Python scanner engine
│   ├── scanner/
│   │   ├── modules/           # 15 scan modules
│   │   │   ├── port_scanner.py
│   │   │   ├── dns_enumerator.py
│   │   │   ├── ssl_analyzer.py
│   │   │   ├── web_crawler.py
│   │   │   ├── tech_detector.py
│   │   │   ├── vuln_checker.py
│   │   │   ├── subdomain_takeover.py
│   │   │   ├── admin_detector.py
│   │   │   ├── nvd_cve_matcher.py
│   │   │   ├── waf_detector.py
│   │   │   ├── recon_module.py
│   │   │   ├── default_creds.py
│   │   │   ├── api_discovery.py
│   │   │   └── api_security.py  # IDOR, broken auth, rate limit, data exposure
│   │   └── engine.py          # Orchestrator + CVSS scoring
│   ├── tests/                 # pytest test suite
│   └── requirements.txt
│
├── shared/                    # Shared TypeScript types & constants
├── docker/                    # Dockerfiles (server, client, scanner)
├── docs/                      # Full project documentation (8 docs)
├── .github/workflows/ci.yml   # CI/CD pipeline (9 jobs)
├── docker-compose.yml         # Dev infrastructure
├── .env.example               # Environment template
└── LICENSE                    # MIT + scanner usage terms
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Required |
|---|---|---|
| Node.js | 20+ | ✅ |
| Python | 3.11+ | ✅ |
| Docker & Compose | Latest | ✅ |
| Git | Latest | ✅ |

### 1. Clone & Configure

```bash
git clone https://github.com/trahoangdev/vulnscan-asm.git
cd vulnscan-asm
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

| Service | URL | Credentials |
|---|---|---|
| PostgreSQL | `localhost:5433` | vulnscan / vulnscan_password |
| Redis | `localhost:6379` | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MailHog (Email) | http://localhost:8025 | — |

### 3. Setup API Server

```bash
cd server
npm install
npx prisma generate          # Generate Prisma client
npx prisma migrate dev        # Run database migrations
npx prisma db seed            # Seed initial data (optional)
npm run dev                   # → http://localhost:4000
```

### 4. Setup Scanner Engine

```bash
cd scanner
python -m venv venv
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
celery -A tasks worker --loglevel=info
```

### 5. Setup Frontend

```bash
cd client
npm install
npm run dev                   # → http://localhost:3000
```

### One-Command Docker (Full Stack)

```bash
docker compose --profile full up -d
# API        → http://localhost:4000
# Client     → http://localhost:3000
# Nginx      → http://localhost:80
```

---

## 🧪 Testing

### Server (Jest — 83 tests)

```bash
cd server
npm test                      # Run all tests
npm test -- --verbose         # Verbose output
npm test -- --coverage        # With coverage report
```

### Scanner (pytest)

```bash
cd scanner
pytest tests/ -v              # Run all tests
pytest tests/ -v --cov=scanner --cov-report=term-missing   # With coverage
```

### Client

```bash
cd client
npm test                      # Unit tests
npm run e2e                   # Playwright E2E (all browsers)
npm run e2e:ui                # Playwright interactive UI mode
npm run e2e:report            # View last test report
```

### Storybook

```bash
cd client
npm run storybook             # → http://localhost:6006
npm run build-storybook       # Static build
```

### Type Checking

```bash
cd server && npm run type-check    # Server TypeScript
cd client && npm run type-check    # Client TypeScript
```

---

## 🔌 API Overview

- **Base URL:** `http://localhost:4000/v1`
- **Auth:** Bearer JWT token or API Key (`X-API-Key`)
- **Format:** JSON request & response

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new account |
| `POST` | `/auth/login` | Login (returns JWT) |
| `GET` | `/targets` | List scan targets |
| `POST` | `/targets` | Add new target |
| `POST` | `/scans` | Start a new scan |
| `GET` | `/scans/:id` | Get scan status & results |
| `GET` | `/vulnerabilities` | List vulnerabilities |
| `GET` | `/assets` | List discovered assets |
| `GET` | `/dashboard/stats` | Dashboard statistics |
| `POST` | `/reports/generate` | Generate PDF/CSV report |
| `GET` | `/organizations/members` | List org members |
| `POST` | `/integrations/slack/test` | Test Slack webhook |
| `POST` | `/billing/checkout` | Create Polar.sh checkout |

> Full API documentation: [`docs/06-api-design.md`](docs/06-api-design.md)

---

## 🔍 Scanner Modules

| # | Module | Description | Profile |
|---|---|---|---|
| 1 | **Port Scanner** | TCP/UDP port discovery via nmap | Quick, Standard, Deep |
| 2 | **DNS Enumerator** | DNS records, zone transfer detection | Quick, Standard, Deep |
| 3 | **SSL Analyzer** | Certificate validation, cipher analysis | Quick, Standard, Deep |
| 4 | **Web Crawler** | Sitemap discovery, link analysis | Standard, Deep |
| 5 | **Tech Detector** | Technology fingerprinting (frameworks, CMS) | Standard, Deep |
| 6 | **Vuln Checker** | Known vulnerability pattern matching | Standard, Deep |
| 7 | **Subdomain Takeover** | Dangling DNS, unclaimed services | Standard, Deep |
| 8 | **Admin Detector** | Admin panel & sensitive path discovery | Standard, Deep |
| 9 | **NVD CVE Matcher** | CVE database correlation (NVD/NIST) | Standard, Deep |
| 10 | **WAF Detector** | Web Application Firewall identification | Standard, Deep |
| 11 | **Recon Module** | OSINT, WHOIS, metadata collection | Deep |
| 12 | **Default Creds** | Default credential checking | Deep |
| 13 | **API Discovery** | REST/GraphQL endpoint enumeration | Deep |
| 14 | **API Security** | IDOR, broken auth, rate limiting, data exposure | Deep |

**Risk Scoring:** CVSS v3.1 base score estimation across 26 vulnerability categories.

---

## ⚙️ Environment Variables

<details>
<summary>Click to expand full .env template</summary>

```env
# General
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://vulnscan:vulnscan_password@localhost:5433/vulnscan_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=vulnscan-reports

# Email (MailHog for dev)
SMTP_HOST=localhost
SMTP_PORT=1025

# Scanner
CELERY_BROKER_URL=redis://localhost:6379/1
SCANNER_MAX_CONCURRENT=3
SCANNER_TIMEOUT=3600

# Billing (Polar.sh)
POLAR_ACCESS_TOKEN=polar_oat_xxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxx
POLAR_SERVER=sandbox

# Optional
# SHODAN_API_KEY=
# NVD_API_KEY=
# SENTRY_DSN=
```

</details>

> See [`.env.example`](.env.example) for the complete template with all options.

---

## 🚢 Deployment

### Docker Production Build

```bash
# Build all images
docker build -f docker/Dockerfile.server -t vulnscan-asm/server .
docker build -f docker/Dockerfile.client -t vulnscan-asm/client .
docker build -f docker/Dockerfile.scanner -t vulnscan-asm/scanner .

# Or use docker compose
docker compose up -d
```

### CI/CD Pipeline

The GitHub Actions pipeline ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs **9 jobs**:

| Job | Description |
|---|---|
| **Lint** | ESLint + TypeScript type checking (server & client) |
| **Test Server** | 83 Jest tests with PostgreSQL + Redis services |
| **Test Scanner** | pytest with coverage report |
| **Build Server** | TypeScript compilation |
| **Build Client** | Next.js production build |
| **Storybook** | Storybook static build + artifact upload |
| **E2E** | Playwright end-to-end tests (Chromium) |
| **Docker** | Docker image build validation (main branch) |
| **Security** | npm audit + pip-audit dependency scanning |

---

## 📖 Documentation

| Document | Description |
|---|---|
| [`01-project-overview.md`](docs/01-project-overview.md) | Vision, problem statement, business model, KPIs |
| [`02-system-architecture.md`](docs/02-system-architecture.md) | Architecture diagrams, data flow, scaling strategy |
| [`03-feature-specifications.md`](docs/03-feature-specifications.md) | 11 feature groups with detailed specs |
| [`04-tech-stack.md`](docs/04-tech-stack.md) | Technology choices, folder structures, justifications |
| [`05-database-schema.md`](docs/05-database-schema.md) | Prisma schema, ERD, table descriptions |
| [`06-api-design.md`](docs/06-api-design.md) | REST API endpoints, auth, pagination, WebSocket events |
| [`07-development-roadmap.md`](docs/07-development-roadmap.md) | 4-phase delivery plan with timeline |
| [`08-security-legal.md`](docs/08-security-legal.md) | Security measures, legal compliance, responsible use |

---

## 🤝 Contributing

Chào mừng mọi đóng góp! Vui lòng đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết chi tiết về:

- Thiết lập môi trường phát triển
- Coding standards (TypeScript & Python)
- Quy ước commit message
- Quy trình Pull Request
- Hướng dẫn thêm scanner module mới
- Báo cáo lỗ hổng bảo mật

### Bắt đầu nhanh

1. Fork repository
2. Tạo feature branch (`git checkout -b feat/amazing-feature`)
3. Viết code + tests theo [coding standards](CONTRIBUTING.md#-coding-standards)
4. Commit theo [Conventional Commits](https://www.conventionalcommits.org): `git commit -m 'feat: add amazing feature'`
5. Push lên branch (`git push origin feat/amazing-feature`)
6. Mở Pull Request

---

## 📄 License

This project is licensed under the **MIT License** with additional terms for vulnerability scanner usage — see the [LICENSE](LICENSE) file for details.

> **⚠️ Important:** This software must only be used to scan systems you own or have explicit written authorization to test. Unauthorized scanning may violate applicable laws.

---

<div align="center">

**VulnScan ASM** — *Biết rõ bề mặt tấn công · Phát hiện lỗ hổng tự động · Ưu tiên rủi ro thông minh*

</div>

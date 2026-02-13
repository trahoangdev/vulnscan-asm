# 🛡️ VulnScan ASM

**Vulnerability Scanner & Attack Surface Management Platform**

Nền tảng quản lý bề mặt tấn công và quét lỗ hổng bảo mật toàn diện cho doanh nghiệp SME.

---

## 📦 Project Structure

```
p001/
├── client/                 # Next.js 14 frontend (TypeScript)
├── server/                 # Node.js + Express API server (TypeScript)
├── scanner/                # Python scanner engine (Celery workers)
├── shared/                 # Shared types & constants
│   ├── types/              # TypeScript type definitions
│   └── constants/          # Shared configuration constants
├── docker/                 # Dockerfiles for each service
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── Dockerfile.scanner
├── docs/                   # Project documentation
│   ├── 01-project-overview.md
│   ├── 02-system-architecture.md
│   ├── 03-feature-specifications.md
│   ├── 04-tech-stack.md
│   ├── 05-database-schema.md
│   ├── 06-api-design.md
│   ├── 07-development-roadmap.md
│   └── 08-security-legal.md
├── .github/workflows/      # CI/CD pipelines
├── docker-compose.yml      # Dev environment (Postgres, Redis, MinIO, MailHog)
├── .env.example            # Environment variables template
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+
- **Docker** & Docker Compose
- **Git**

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/vulnscan-asm.git
cd vulnscan-asm

# Copy environment variables
cp .env.example .env
```

### 2. Start Infrastructure (Database, Redis, MinIO, MailHog)
```bash
docker compose up -d
```

Services sẽ chạy tại:
| Service | URL |
|---|---|
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MinIO Console | `http://localhost:9001` |
| MailHog (Email UI) | `http://localhost:8025` |

### 3. Setup API Server
```bash
cd server
npm install
npx prisma migrate dev    # Run database migrations
npx prisma db seed         # Seed initial data
npm run dev                # Start dev server → http://localhost:4000
```

### 4. Setup Scanner Workers
```bash
cd scanner
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
celery -A tasks worker --loglevel=info
```

### 5. Setup Frontend
```bash
cd client
npm install
npm run dev                # Start dev server → http://localhost:3000
```

## 🧪 Testing

```bash
# Server tests
cd server && npm test

# Scanner tests
cd scanner && pytest

# Client tests
cd client && npm test
```

## 📖 Documentation

Xem thư mục `docs/` để biết chi tiết về:
- Kiến trúc hệ thống
- Feature specifications
- Database schema
- API design
- Development roadmap

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| API Server | Node.js, Express, TypeScript, Prisma |
| Scanner | Python 3.11, Celery, nmap, httpx |
| Database | PostgreSQL 16, Redis 7 |
| Storage | S3 / MinIO |
| CI/CD | GitHub Actions |
| Container | Docker |

## 📄 License

MIT

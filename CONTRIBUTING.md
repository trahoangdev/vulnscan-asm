# 🤝 Contributing to VulnScan ASM

Cảm ơn bạn đã quan tâm đến việc đóng góp cho VulnScan ASM! Mọi đóng góp đều được chào đón — từ báo lỗi, đề xuất tính năng, cải thiện tài liệu, cho đến viết code.

Thank you for your interest in contributing to VulnScan ASM! All contributions are welcome — from bug reports and feature suggestions to documentation improvements and code contributions.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Project Architecture](#-project-architecture)
- [Coding Standards](#-coding-standards)
- [Commit Convention](#-commit-convention)
- [Pull Request Process](#-pull-request-process)
- [Bug Reports](#-bug-reports)
- [Feature Requests](#-feature-requests)
- [Scanner Module Contributions](#-scanner-module-contributions)
- [Security Vulnerabilities](#-security-vulnerabilities)

---

## 📜 Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and harassment-free experience for everyone. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community and the project
- Show empathy towards other community members

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Python | 3.11+ |
| Docker & Docker Compose | Latest |
| Git | Latest |

### Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/vulnscan-asm.git
cd vulnscan-asm

# 2. Add upstream remote
git remote add upstream https://github.com/original-owner/vulnscan-asm.git

# 3. Copy environment variables
cp .env.example .env

# 4. Start infrastructure
docker compose up -d

# 5. Setup server
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# 6. Setup client (new terminal)
cd client
npm install
npm run dev

# 7. Setup scanner (new terminal)
cd scanner
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Verify Setup

```bash
# Server tests (83 tests expected)
cd server && npm test

# Client type check
cd client && npm run type-check

# Scanner tests
cd scanner && pytest tests/ -v
```

---

## 🔄 Development Workflow

### 1. Sync with upstream

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Create a feature branch

```bash
git checkout -b <type>/<short-description>

# Examples:
git checkout -b feat/subdomain-monitoring
git checkout -b fix/jwt-refresh-race-condition
git checkout -b docs/api-examples
```

### 3. Make your changes

- Write code following the [coding standards](#-coding-standards)
- Add/update tests for your changes
- Update documentation if applicable

### 4. Test your changes

```bash
# Server
cd server
npm run type-check        # TypeScript check
npm run lint              # ESLint
npm test                  # Jest tests

# Client
cd client
npm run type-check
npm run lint
npm run e2e               # Playwright E2E (optional)

# Scanner
cd scanner
ruff check .              # Linting
mypy scanner/             # Type checking
pytest tests/ -v          # Tests
```

### 5. Commit & push

```bash
git add .
git commit -m "feat: add subdomain monitoring alerts"
git push origin feat/subdomain-monitoring
```

### 6. Open a Pull Request

Open a PR against the `main` branch on GitHub. Fill in the PR template completely.

---

## 🏗️ Project Architecture

```
vulnscan-asm/
├── client/          → Next.js 14 + TypeScript + Tailwind + shadcn/ui
├── server/          → Express + TypeScript + Prisma + BullMQ
├── scanner/         → Python 3.11 + Celery + 15 scan modules
├── shared/          → Shared TypeScript types & constants
├── docker/          → Dockerfiles for each service
└── docs/            → Project documentation
```

### Key Patterns

| Area | Pattern |
|---|---|
| **Server modules** | Each module has: `*.controller.ts`, `*.service.ts`, `*.routes.ts`, `*.schema.ts` |
| **Client pages** | Next.js App Router with `(auth)` and `(dashboard)` route groups |
| **Scanner modules** | Each module extends base class, registered in `MODULE_REGISTRY` |
| **Validation** | Zod schemas shared between client & server |
| **State management** | React Query (server state) + Zustand (client state) |
| **Database** | Prisma ORM with migration-based schema management |
| **Queue** | BullMQ for async jobs (scans, reports, notifications) |

### Module Structure (Server)

```
server/src/modules/<feature>/
├── <feature>.controller.ts    # Request handlers
├── <feature>.service.ts       # Business logic
├── <feature>.routes.ts        # Express router
└── <feature>.schema.ts        # Zod validation schemas
```

### Scanner Module Structure

```
scanner/scanner/modules/<module_name>.py
# Must implement:
#   - class MyModule(BaseModule)
#   - async def scan(self, target) -> list[Finding]
# Register in scanner/modules/__init__.py → MODULE_REGISTRY
```

---

## 📏 Coding Standards

### TypeScript (Server & Client)

- **Strict mode** enabled (`strict: true` in tsconfig)
- Use **named exports** over default exports
- Use **Zod** for all request/response validation
- Use `async/await` consistently — no raw Promises
- Error handling through `ApiResponse` utility class
- Prefer **interfaces** for object shapes, **types** for unions/intersections

```typescript
// ✅ Good
export const createTarget = async (req: Request, res: Response) => {
  const validated = createTargetSchema.parse(req.body);
  const result = await targetService.create(validated, req.user!.id);
  return ApiResponse.success(res, result, 'Target created', 201);
};

// ❌ Bad
export default function(req, res) {
  const data = req.body;
  // ...no validation, no types
}
```

### Python (Scanner)

- Follow **PEP 8** — enforced by `ruff`
- Type hints on all functions (`mypy` strict)
- Use `structlog` for structured logging
- Use `pydantic` for data models
- Async-first with `httpx` and `asyncio`

```python
# ✅ Good
async def scan(self, target: str) -> list[Finding]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(f"https://{target}")
        # ...

# ❌ Bad
def scan(self, target):
    import requests
    r = requests.get(target)
```

### CSS / Styling (Client)

- **Tailwind CSS** utility classes — avoid custom CSS where possible
- Use **shadcn/ui** components as base
- Follow mobile-first responsive design
- Dark mode support via `dark:` variants

### General

- Maximum line length: **100 characters** (flexible for templates)
- No `console.log` in production code — use `logger`
- No `any` type in TypeScript — use `unknown` and type-narrow
- All API endpoints require **authentication** (except auth routes)
- Environment variables accessed through config modules, never raw `process.env`

---

## 💬 Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|---|---|---|
| `feat` | New feature | `feat(scanner): add wordpress plugin detector` |
| `fix` | Bug fix | `fix(auth): resolve JWT refresh token race condition` |
| `docs` | Documentation | `docs(api): add WebSocket event examples` |
| `style` | Formatting (no code change) | `style(client): fix indentation in dashboard` |
| `refactor` | Code restructuring | `refactor(server): extract email service` |
| `test` | Add/update tests | `test(scans): add integration tests for scan queue` |
| `perf` | Performance improvement | `perf(scanner): batch DNS queries for speed` |
| `chore` | Build, CI, deps | `chore(deps): update prisma to 5.23` |
| `ci` | CI/CD changes | `ci: add Playwright E2E job` |
| `revert` | Revert commit | `revert: revert "feat(scanner): add wordpress detector"` |

### Scopes

| Scope | Area |
|---|---|
| `server` | API server |
| `client` | Frontend |
| `scanner` | Python scanner engine |
| `auth` | Authentication module |
| `scans` | Scan management |
| `billing` | Polar.sh billing |
| `docker` | Docker/infrastructure |
| `ci` | CI/CD pipeline |
| `deps` | Dependencies |
| `api` | API design/endpoints |

### Examples

```bash
feat(scanner): add SSRF detection module
fix(client): dashboard chart not rendering on mobile
docs: update README with Storybook instructions
test(server): add 15 tests for organization module
chore(deps): bump next.js to 14.3
ci: add security audit job to pipeline
perf(scanner): parallelize port scanning across subnets
refactor(server): migrate billing from Stripe to Polar.sh
```

---

## 🔀 Pull Request Process

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code compiles without errors (`npm run type-check` / `mypy`)
- [ ] All existing tests pass (`npm test` / `pytest`)
- [ ] New tests added for new functionality
- [ ] Linting passes (`npm run lint` / `ruff check`)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow [Conventional Commits](#-commit-convention)
- [ ] PR title follows the same convention
- [ ] No sensitive data (API keys, credentials) in the code

### PR Template

```markdown
## What does this PR do?

Brief description of the changes.

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing API)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## How has this been tested?

Describe the tests you ran to verify your changes.

## Screenshots (if applicable)

## Related Issues

Closes #<issue-number>
```

### Review Process

1. At least **1 approval** required to merge
2. All CI checks must pass (lint, test, build, type-check)
3. No merge conflicts
4. Squash merge preferred for feature branches

---

## 🐛 Bug Reports

Open a [GitHub Issue](https://github.com/your-username/vulnscan-asm/issues/new) with:

### Required Information

- **Title:** Clear, concise description
- **Environment:** OS, Node.js version, Python version, browser
- **Steps to reproduce:** Numbered steps to reproduce the issue
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Screenshots/logs:** Error messages, stack traces, screenshots

### Example

```markdown
**Title:** Scan results page crashes when vulnerability count exceeds 500

**Environment:** Windows 11, Node 20.10, Chrome 120

**Steps to reproduce:**
1. Create a target with domain `example.com`
2. Run a Deep scan
3. Wait for scan to complete (500+ vulnerabilities)
4. Navigate to scan results page

**Expected:** Results page loads with paginated vulnerability list
**Actual:** White screen with "Maximum update depth exceeded" error in console

**Console error:**
```
Error: Maximum update depth exceeded...
```
```

---

## 💡 Feature Requests

Open a [GitHub Issue](https://github.com/your-username/vulnscan-asm/issues/new) with label `enhancement`:

- **Problem:** What problem does this solve?
- **Proposed solution:** How should it work?
- **Alternatives considered:** Other approaches you thought of
- **Priority:** Must have / Nice to have

---

## 🔍 Scanner Module Contributions

Adding a new scanner module is one of the most impactful contributions. Here's how:

### 1. Create the module file

```python
# scanner/scanner/modules/my_module.py

from scanner.modules.base import BaseModule, Finding
from scanner.types import VulnCategory, Severity

class MyModule(BaseModule):
    """One-line description of what this module detects."""

    name = "my_module"
    description = "Detailed description of the module's purpose"

    async def scan(self, target: str) -> list[Finding]:
        findings = []
        # Your scanning logic here
        # Use self.http_client for HTTP requests
        # Use self.logger for logging
        return findings
```

### 2. Register in `__init__.py`

```python
# scanner/scanner/modules/__init__.py

from scanner.modules.my_module import MyModule

# Add to __all__
__all__ = [
    # ...existing modules
    "MyModule",
]

# Add to MODULE_REGISTRY
MODULE_REGISTRY = {
    # ...existing entries
    "my_module": MyModule,
}
```

### 3. Add to scan profile in `engine.py`

```python
# Add to the appropriate profile (QUICK, STANDARD, or DEEP)
SCAN_PROFILES = {
    "DEEP": [..., "my_module"],
}
```

### 4. Write tests

```python
# scanner/tests/test_my_module.py
import pytest
from scanner.modules.my_module import MyModule

@pytest.mark.asyncio
async def test_my_module_basic():
    module = MyModule()
    findings = await module.scan("example.com")
    assert isinstance(findings, list)
```

### Guidelines for Scanner Modules

- **Non-destructive only** — never modify the target system
- **Rate limiting** — respect target's resources, add delays between requests
- **Timeout handling** — all network calls must have timeouts
- **Error resilience** — catch and log exceptions, don't crash the scan
- **False positive awareness** — add confidence scoring where applicable
- **CVSS mapping** — map findings to appropriate CVSS categories in `engine.py`

---

## 🔒 Security Vulnerabilities

**Do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability, please report it responsibly:

1. **Email:** security@vulnscan.io (or open a private security advisory on GitHub)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. We will acknowledge within **48 hours** and provide an estimated fix timeline

See [docs/08-security-legal.md](docs/08-security-legal.md) for our full security policy.

---

## 🏷️ Labels

| Label | Description |
|---|---|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Documentation improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `scanner` | Related to Python scanner engine |
| `server` | Related to API server |
| `client` | Related to frontend |
| `security` | Security-related changes |
| `performance` | Performance improvements |
| `breaking` | Breaking API change |

---

## ❓ Questions?

- Open a [GitHub Discussion](https://github.com/your-username/vulnscan-asm/discussions) for general questions
- Check existing [issues](https://github.com/your-username/vulnscan-asm/issues) before creating a new one
- Read the [documentation](docs/) for architecture and API details

---

<div align="center">

**Thank you for helping make VulnScan ASM better!** 🛡️

</div>

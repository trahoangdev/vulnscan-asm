import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VulnScan ASM — API Documentation',
      version: '1.0.0',
      description:
        'Attack Surface Management platform API. Manage targets, run security scans, view vulnerabilities, generate reports.',
      contact: { name: 'VulnScan Team' },
    },
    servers: [
      { url: '/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from POST /auth/login',
        },
      },
      schemas: {
        // ---- Common ----
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation error' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },

        // ---- Auth ----
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'P@ssword1' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Alice Nguyen' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            orgName: { type: 'string', example: 'My Company' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },

        // ---- User ----
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
            orgId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ---- Target ----
        Target: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orgId: { type: 'string' },
            type: { type: 'string', enum: ['DOMAIN', 'IP', 'CIDR'] },
            value: { type: 'string', example: 'example.com' },
            label: { type: 'string' },
            verificationStatus: { type: 'string', enum: ['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTargetRequest: {
          type: 'object',
          required: ['type', 'value'],
          properties: {
            type: { type: 'string', enum: ['DOMAIN', 'IP', 'CIDR'] },
            value: { type: 'string', example: 'example.com' },
            label: { type: 'string' },
            scanProfile: { type: 'string', enum: ['QUICK', 'STANDARD', 'DEEP', 'CUSTOM'] },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },

        // ---- Scan ----
        Scan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            targetId: { type: 'string' },
            profile: { type: 'string', enum: ['QUICK', 'STANDARD', 'DEEP', 'CUSTOM'] },
            status: { type: 'string', enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
            progress: { type: 'integer', minimum: 0, maximum: 100 },
            modules: { type: 'array', items: { type: 'string' } },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            totalVulns: { type: 'integer', nullable: true },
            criticalCount: { type: 'integer' },
            highCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateScanRequest: {
          type: 'object',
          required: ['targetId'],
          properties: {
            targetId: { type: 'string' },
            profile: { type: 'string', enum: ['QUICK', 'STANDARD', 'DEEP'], default: 'STANDARD' },
            modules: { type: 'array', items: { type: 'string' } },
          },
        },

        // ---- Asset ----
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            targetId: { type: 'string' },
            type: { type: 'string', enum: ['SUBDOMAIN', 'IP_ADDRESS', 'URL', 'API_ENDPOINT'] },
            value: { type: 'string' },
            ip: { type: 'string', nullable: true },
            ports: { type: 'object', nullable: true },
            technologies: { type: 'object', nullable: true },
            httpStatus: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
            firstSeenAt: { type: 'string', format: 'date-time' },
            lastSeenAt: { type: 'string', format: 'date-time' },
          },
        },

        // ---- Vulnerability ----
        VulnFinding: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            scanId: { type: 'string' },
            assetId: { type: 'string', nullable: true },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
            cvssScore: { type: 'number', nullable: true },
            category: { type: 'string' },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE'] },
            affectedUrl: { type: 'string', nullable: true },
            remediation: { type: 'string', nullable: true },
            cveId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        UpdateVulnStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE'] },
            notes: { type: 'string' },
          },
        },

        // ---- Report ----
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orgId: { type: 'string' },
            type: { type: 'string', enum: ['EXECUTIVE_SUMMARY', 'TECHNICAL_DETAIL', 'COMPLIANCE_OWASP', 'COMPLIANCE_PCI', 'ASSET_INVENTORY', 'CUSTOM'] },
            title: { type: 'string' },
            format: { type: 'string', enum: ['PDF', 'HTML', 'CSV', 'JSON'] },
            status: { type: 'string' },
            fileUrl: { type: 'string', nullable: true },
            fileSize: { type: 'integer', nullable: true },
            generatedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        GenerateReportRequest: {
          type: 'object',
          required: ['type', 'title'],
          properties: {
            type: { type: 'string', enum: ['EXECUTIVE_SUMMARY', 'TECHNICAL_DETAIL', 'COMPLIANCE_OWASP', 'COMPLIANCE_PCI', 'ASSET_INVENTORY', 'CUSTOM'] },
            title: { type: 'string' },
            format: { type: 'string', enum: ['PDF', 'HTML', 'CSV', 'JSON'], default: 'PDF' },
            targetIds: { type: 'array', items: { type: 'string' } },
            dateRange: {
              type: 'object',
              properties: {
                from: { type: 'string', format: 'date-time' },
                to: { type: 'string', format: 'date-time' },
              },
            },
            includeSeverities: { type: 'array', items: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] } },
          },
        },

        // ---- Notification ----
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Targets', description: 'Target/domain management' },
      { name: 'Scans', description: 'Security scan operations' },
      { name: 'Assets', description: 'Discovered asset inventory' },
      { name: 'Vulnerabilities', description: 'Vulnerability findings' },
      { name: 'Reports', description: 'Report generation & download' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Dashboard', description: 'Dashboard statistics' },
    ],
  },
  apis: ['./src/modules/**/*.swagger.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

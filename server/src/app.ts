import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { swaggerSpec } from './config/swagger';
import { initializeSocket } from './socket';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { xssSanitizer } from './middleware/sanitize';
import { apiKeyAuth } from './middleware/apiKeyAuth';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import targetsRoutes from './modules/targets/targets.routes';
import scansRoutes from './modules/scans/scans.routes';
import vulnerabilitiesRoutes from './modules/vulnerabilities/vulnerabilities.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import assetsRoutes from './modules/assets/assets.routes';
import reportsRoutes from './modules/reports/reports.routes';
import organizationsRoutes from './modules/organizations/organizations.routes';
import apiKeysRoutes from './modules/apikeys/apikeys.routes';
import webhooksRoutes from './modules/webhooks/webhooks.routes';
import adminRoutes from './modules/admin/admin.routes';
import { subscribeScanResults } from './jobs/scan.worker';
import { startScanScheduler } from './jobs/scheduler';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
initializeSocket(httpServer);

// ===== Global Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', env.CLIENT_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Swagger UI to load resources
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
}));
app.use(hpp());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(xssSanitizer);
app.use(apiKeyAuth);
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));
app.use(apiRateLimiter);

// ===== Health Check =====
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: env.APP_NAME,
    version: '1.0.0',
  });
});

// ===== API Documentation (Swagger) =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'VulnScan ASM — API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ===== API Routes =====
const API_PREFIX = '/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/targets`, targetsRoutes);
app.use(`${API_PREFIX}/scans`, scansRoutes);
app.use(`${API_PREFIX}/vulnerabilities`, vulnerabilitiesRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/assets`, assetsRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/organizations`, organizationsRoutes);
app.use(`${API_PREFIX}/api-keys`, apiKeysRoutes);
app.use(`${API_PREFIX}/webhooks`, webhooksRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ===== Error Handling =====
app.use(notFoundHandler);
app.use(errorHandler);

// ===== Start Server =====
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    // Start scan results subscriber
    subscribeScanResults().catch((err) => {
      logger.error('Failed to start scan results subscriber', err);
    });

    // Start scan scheduler
    startScanScheduler();

    // Start HTTP server
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 ${env.APP_NAME} server running on port ${env.PORT}`);
      logger.info(`📡 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: ${env.APP_URL}${API_PREFIX}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  redis.disconnect();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  redis.disconnect();
  httpServer.close();
  process.exit(0);
});

startServer();

export default app;

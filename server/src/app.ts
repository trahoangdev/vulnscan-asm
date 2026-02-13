import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { createServer } from 'http';

import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { initializeSocket } from './socket';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import targetsRoutes from './modules/targets/targets.routes';
import scansRoutes from './modules/scans/scans.routes';
import vulnerabilitiesRoutes from './modules/vulnerabilities/vulnerabilities.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import { subscribeScanResults } from './jobs/scan.worker';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
initializeSocket(httpServer);

// ===== Global Middleware =====
app.use(helmet());
app.use(hpp());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
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

// ===== API Routes =====
const API_PREFIX = '/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/targets`, targetsRoutes);
app.use(`${API_PREFIX}/scans`, scansRoutes);
app.use(`${API_PREFIX}/vulnerabilities`, vulnerabilitiesRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

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

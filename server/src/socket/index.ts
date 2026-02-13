import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`WebSocket connected: ${user.userId}`);

    // Join user-specific room
    socket.join(`user:${user.userId}`);
    if (user.orgId) {
      socket.join(`org:${user.orgId}`);
    }

    // Subscribe to scan updates
    socket.on('scan:subscribe', (data: { scanId: string }) => {
      socket.join(`scan:${data.scanId}`);
      logger.debug(`User ${user.userId} subscribed to scan ${data.scanId}`);
    });

    // Unsubscribe from scan updates
    socket.on('scan:unsubscribe', (data: { scanId: string }) => {
      socket.leave(`scan:${data.scanId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`WebSocket disconnected: ${user.userId}`);
    });
  });

  logger.info('✅ WebSocket server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Helper functions for emitting events
export function emitScanProgress(scanId: string, data: {
  progress: number;
  currentModule?: string;
  message?: string;
}) {
  if (io) {
    io.to(`scan:${scanId}`).emit('scan:progress', { scanId, ...data });
  }
}

export function emitScanCompleted(scanId: string, summary: any) {
  if (io) {
    io.to(`scan:${scanId}`).emit('scan:completed', { scanId, summary });
  }
}

export function emitScanFailed(scanId: string, error: string) {
  if (io) {
    io.to(`scan:${scanId}`).emit('scan:failed', { scanId, error });
  }
}

export function emitNewFinding(scanId: string, finding: any) {
  if (io) {
    io.to(`scan:${scanId}`).emit('scan:finding', { scanId, finding });
  }
}

export function emitNotification(userId: string, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', { notification });
  }
}

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

let globalSocket: Socket | null = null;

/**
 * Hook to manage global Socket.io connection.
 * Connects when authenticated, disconnects on logout.
 */
export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect if not authenticated
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setConnected(false);
      }
      return;
    }

    // Already connected with same token
    if (globalSocket?.connected) {
      setConnected(true);
      return;
    }

    // Create new connection
    globalSocket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    globalSocket.on('connect', () => {
      console.log('[Socket] Connected');
      setConnected(true);
    });

    globalSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    globalSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    return () => {
      // Don't disconnect on unmount — keep global connection alive
    };
  }, [isAuthenticated, accessToken]);

  return { socket: globalSocket, connected };
}

/**
 * Subscribe to real-time scan progress updates.
 */
export function useScanProgress(scanId: string | null) {
  const { socket, connected } = useSocket();
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!socket || !connected || !scanId) return;

    // Subscribe to scan room
    socket.emit('scan:subscribe', { scanId });

    const onProgress = (data: { scanId: string; progress: number; currentModule?: string; message?: string }) => {
      if (data.scanId === scanId) {
        setProgress(data.progress);
        setCurrentModule(data.currentModule || '');
        setMessage(data.message || '');
        setStatus('running');
      }
    };

    const onCompleted = (data: { scanId: string; summary: any }) => {
      if (data.scanId === scanId) {
        setProgress(100);
        setStatus('completed');
        setSummary(data.summary);
      }
    };

    const onFailed = (data: { scanId: string; error: string }) => {
      if (data.scanId === scanId) {
        setStatus('failed');
        setError(data.error);
      }
    };

    socket.on('scan:progress', onProgress);
    socket.on('scan:completed', onCompleted);
    socket.on('scan:failed', onFailed);

    return () => {
      socket.emit('scan:unsubscribe', { scanId });
      socket.off('scan:progress', onProgress);
      socket.off('scan:completed', onCompleted);
      socket.off('scan:failed', onFailed);
    };
  }, [socket, connected, scanId]);

  return { progress, currentModule, message, status, summary, error };
}

/**
 * Subscribe to real-time notifications.
 */
export function useNotifications() {
  const { socket, connected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const callbackRef = useRef<((notification: any) => void) | null>(null);

  const onNewNotification = useCallback((callback: (notification: any) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleNotification = (data: { notification: any }) => {
      setUnreadCount((prev) => prev + 1);
      callbackRef.current?.(data.notification);
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket, connected]);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, setUnreadCount, resetUnread, onNewNotification };
}

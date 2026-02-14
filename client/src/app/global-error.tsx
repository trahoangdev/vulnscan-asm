'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#fafafa',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <AlertTriangle style={{ width: '32px', height: '32px', color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Critical Error
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              A critical error occurred and the application could not recover.
              Please refresh the page.
            </p>
            {error.digest && (
              <p
                style={{
                  color: '#71717a',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  marginBottom: '1rem',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#fafafa',
                color: '#0a0a0a',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

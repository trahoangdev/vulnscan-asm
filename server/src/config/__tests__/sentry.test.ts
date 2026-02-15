/**
 * Tests for Sentry configuration
 * - initSentry() with empty DSN (should be no-op)
 * - initSentry() with DSN (should call Sentry.init)
 * - Sensitive header scrubbing in beforeSend
 */

import * as Sentry from '@sentry/node';
import { initSentry } from '../sentry';
import { env } from '../env';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  httpIntegration: jest.fn(() => 'http-integration-mock'),
}));

// We need to make env mutable for testing
jest.mock('../env', () => ({
  env: {
    SENTRY_DSN: '',
    NODE_ENV: 'development',
  },
}));

describe('Sentry Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT call Sentry.init if SENTRY_DSN is empty', () => {
    (env as any).SENTRY_DSN = '';

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('should call Sentry.init when SENTRY_DSN is provided', () => {
    (env as any).SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
    (env as any).NODE_ENV = 'production';

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
        environment: 'production',
        release: 'vulnscan-server@1.0.0',
      }),
    );
  });

  it('should use 1.0 sample rate in development', () => {
    (env as any).SENTRY_DSN = 'https://test@sentry.io/0';
    (env as any).NODE_ENV = 'development';

    initSentry();

    const call = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(call.tracesSampleRate).toBe(1.0);
  });

  it('should use 0.2 sample rate in production', () => {
    (env as any).SENTRY_DSN = 'https://test@sentry.io/0';
    (env as any).NODE_ENV = 'production';

    initSentry();

    const call = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(call.tracesSampleRate).toBe(0.2);
  });

  it('should scrub sensitive headers in beforeSend', () => {
    (env as any).SENTRY_DSN = 'https://test@sentry.io/0';

    initSentry();

    const call = (Sentry.init as jest.Mock).mock.calls[0][0];
    const beforeSend = call.beforeSend;

    const event = {
      request: {
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=abc123',
          'x-api-key': 'api-key-secret',
          'content-type': 'application/json',
        },
      },
    };

    const result = beforeSend(event);

    expect(result.request.headers).not.toHaveProperty('authorization');
    expect(result.request.headers).not.toHaveProperty('cookie');
    expect(result.request.headers).not.toHaveProperty('x-api-key');
    expect(result.request.headers['content-type']).toBe('application/json');
  });

  it('should handle events without request headers', () => {
    (env as any).SENTRY_DSN = 'https://test@sentry.io/0';

    initSentry();

    const call = (Sentry.init as jest.Mock).mock.calls[0][0];
    const beforeSend = call.beforeSend;

    // Event without request
    const event1 = { message: 'test' };
    expect(beforeSend(event1)).toEqual(event1);

    // Event with request but no headers
    const event2 = { request: {} };
    expect(beforeSend(event2)).toEqual(event2);
  });
});

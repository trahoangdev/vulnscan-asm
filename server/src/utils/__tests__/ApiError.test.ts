import { ApiError } from '../ApiError';

describe('ApiError', () => {
  it('should create a not found error', () => {
    const err = ApiError.notFound('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
    expect(err.code).toBe('NOT_FOUND');
  });

  it('should create a bad request error', () => {
    const err = ApiError.badRequest('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid input');
  });

  it('should create a forbidden error', () => {
    const err = ApiError.forbidden('Access denied');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
  });

  it('should create an unauthorized error', () => {
    const err = ApiError.unauthorized('Not authenticated');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Not authenticated');
  });

  it('should create a conflict error', () => {
    const err = ApiError.conflict('Already exists');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Already exists');
  });

  it('should be an instance of Error', () => {
    const err = ApiError.notFound('test');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ApiError).toBe(true);
  });
});

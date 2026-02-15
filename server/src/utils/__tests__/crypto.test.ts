import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../crypto';
import jwt from 'jsonwebtoken';

describe('crypto utils', () => {
  describe('hashPassword / comparePassword', () => {
    it('should hash a password and verify it', async () => {
      const password = 'TestP@ss123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.startsWith('$2')).toBe(true); // bcrypt prefix

      const isMatch = await comparePassword(password, hashed);
      expect(isMatch).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hashed = await hashPassword('Correct@123');
      const isMatch = await comparePassword('Wrong@123', hashed);
      expect(isMatch).toBe(false);
    });
  });

  describe('generateAccessToken / generateRefreshToken', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      orgId: 'org-456',
      systemRole: 'USER' as const,
    };

    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.orgId).toBe('org-456');
    });

    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(payload);
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.userId).toBe('user-123');
    });
  });
});

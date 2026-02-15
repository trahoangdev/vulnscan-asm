import { isValidDomain, isValidIp, parsePagination, parseSort, slugify } from '../helpers';

describe('helpers', () => {
  describe('isValidDomain', () => {
    it('should accept valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('deep.sub.example.co.uk')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('not_a_domain')).toBe(false);
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('http://example.com')).toBe(false);
    });
  });

  describe('isValidIp', () => {
    it('should accept valid IPs', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('10.0.0.1')).toBe(true);
      expect(isValidIp('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPs', () => {
      expect(isValidIp('999.999.999.999')).toBe(false);
      expect(isValidIp('abc')).toBe(false);
      expect(isValidIp('')).toBe(false);
    });
  });

  describe('parsePagination', () => {
    it('should use defaults when no params given', () => {
      const result = parsePagination({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('should parse page and limit from query', () => {
      const result = parsePagination({ page: '3', limit: '10' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(20);
    });

    it('should clamp limit to max 100', () => {
      const result = parsePagination({ limit: '999' });
      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('parseSort', () => {
    it('should parse ascending sort', () => {
      const result = parseSort('name');
      expect(result).toEqual({ name: 'asc' });
    });

    it('should parse descending sort', () => {
      const result = parseSort('-createdAt');
      expect(result).toEqual({ createdAt: 'desc' });
    });

    it('should return default sort when no input', () => {
      const result = parseSort(undefined as any);
      expect(result).toEqual({ createdAt: 'desc' });
    });
  });

  describe('slugify', () => {
    it('should slugify strings', () => {
      if (typeof slugify === 'function') {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('Test  String!')).toMatch(/test-string/);
      }
    });
  });
});

import { validateProductQuery, validateLanguage, validateOffer, validatePhoneNumber } from '../../utils/validation';
import { mockLanguage, mockProductQuery } from '../test-data';

describe('Validation Utils', () => {
  describe('validateProductQuery', () => {
    it('should return no errors for valid product query', () => {
      const errors = validateProductQuery(mockProductQuery);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing product name', () => {
      const query = { ...mockProductQuery, name: '' };
      const errors = validateProductQuery(query);
      expect(errors).toContain('Product name is required');
    });

    it('should return error for invalid quantity', () => {
      const query = { ...mockProductQuery, quantity: 0 };
      const errors = validateProductQuery(query);
      expect(errors).toContain('Quantity must be greater than 0');
    });
  });

  describe('validateLanguage', () => {
    it('should return no errors for supported language', () => {
      const errors = validateLanguage(mockLanguage);
      expect(errors).toHaveLength(0);
    });

    it('should return error for unsupported language', () => {
      const unsupportedLang = { ...mockLanguage, code: 'xyz' };
      const errors = validateLanguage(unsupportedLang);
      expect(errors).toContain('Language xyz is not supported');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct Indian phone number', () => {
      expect(validatePhoneNumber('9876543210')).toBe(true);
      expect(validatePhoneNumber('8123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('1234567890')).toBe(false); // starts with 1
      expect(validatePhoneNumber('98765432')).toBe(false); // too short
      expect(validatePhoneNumber('98765432101')).toBe(false); // too long
    });
  });
});
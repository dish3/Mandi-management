import {
  validateProductQuery,
  validatePriceData,
  validatePriceRange,
  validateConfidence,
  validateProductCategory,
  validateUnit
} from '../../../services/price-discovery/price-validation';
import { ProductQuery, PriceInfo } from '../../../types';

describe('Price Validation', () => {
  describe('validateProductQuery', () => {
    const validQuery: ProductQuery = {
      name: 'tomato',
      category: 'vegetables',
      location: 'delhi',
      quantity: 10,
      unit: 'kg'
    };

    it('should validate correct product query', () => {
      const result = validateProductQuery(validQuery);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const invalidQuery = { ...validQuery, name: '' };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product name is required and must be a non-empty string');
    });

    it('should reject empty category', () => {
      const invalidQuery = { ...validQuery, category: '' };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product category is required and must be a non-empty string');
    });

    it('should reject empty location', () => {
      const invalidQuery = { ...validQuery, location: '' };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is required and must be a non-empty string');
    });

    it('should reject empty unit', () => {
      const invalidQuery = { ...validQuery, unit: '' };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unit is required and must be a non-empty string');
    });

    it('should reject negative quantity', () => {
      const invalidQuery = { ...validQuery, quantity: -5 };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be a positive number');
    });

    it('should reject zero quantity', () => {
      const invalidQuery = { ...validQuery, quantity: 0 };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be a positive number');
    });

    it('should reject very large quantity', () => {
      const invalidQuery = { ...validQuery, quantity: 2000000 };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be between 0.001 and 1,000,000');
    });

    it('should reject very small quantity', () => {
      const invalidQuery = { ...validQuery, quantity: 0.0001 };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be between 0.001 and 1,000,000');
    });

    it('should reject too long strings', () => {
      const longName = 'a'.repeat(101);
      const invalidQuery = { ...validQuery, name: longName };
      const result = validateProductQuery(invalidQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product name must be 100 characters or less');
    });

    it('should accept valid edge cases', () => {
      const edgeQuery = {
        ...validQuery,
        quantity: 0.001, // Minimum valid quantity
        name: 'a'.repeat(100), // Maximum valid name length
        category: 'b'.repeat(50), // Maximum valid category length
        location: 'c'.repeat(100), // Maximum valid location length
        unit: 'd'.repeat(20) // Maximum valid unit length
      };
      
      const result = validateProductQuery(edgeQuery);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePriceData', () => {
    const validPriceInfo: PriceInfo = {
      current: 25.50,
      minimum: 20.00,
      maximum: 30.00,
      average: 25.00,
      confidence: 0.85,
      source: 'official',
      lastUpdated: new Date()
    };

    it('should validate correct price data', () => {
      const result = validatePriceData(validPriceInfo);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative prices', () => {
      const invalidPrice = { ...validPriceInfo, current: -10 };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current price must be a non-negative number');
    });

    it('should reject invalid confidence values', () => {
      const invalidPrice = { ...validPriceInfo, confidence: 1.5 };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence must be a number between 0 and 1');
    });

    it('should reject invalid source', () => {
      const invalidPrice = { ...validPriceInfo, source: 'invalid' as any };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source must be either "official" or "estimated"');
    });

    it('should reject min > max', () => {
      const invalidPrice = { ...validPriceInfo, minimum: 35, maximum: 30 };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum price cannot be greater than maximum price');
    });

    it('should reject current price outside range', () => {
      const invalidPrice = { ...validPriceInfo, current: 35, maximum: 30 };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current price must be between minimum and maximum prices');
    });

    it('should reject unreasonably high prices', () => {
      const invalidPrice = {
        ...validPriceInfo,
        current: 200000,
        minimum: 200000,
        maximum: 200000,
        average: 200000
      };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prices seem unreasonably high (above ₹100000)');
    });

    it('should warn about stale data', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const stalePrice = { ...validPriceInfo, lastUpdated: staleDate };
      const result = validatePriceData(stalePrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price data is older than 24 hours and may be stale');
    });

    it('should reject invalid date', () => {
      const invalidPrice = { ...validPriceInfo, lastUpdated: new Date('invalid') };
      const result = validatePriceData(invalidPrice);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('LastUpdated must be a valid Date object');
    });
  });

  describe('validatePriceRange', () => {
    it('should validate correct price range', () => {
      const result = validatePriceRange(20, 30, 25);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject min > max', () => {
      const result = validatePriceRange(30, 20, 25);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum price cannot be greater than maximum price');
    });

    it('should reject current < min', () => {
      const result = validatePriceRange(20, 30, 15);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current price cannot be less than minimum price');
    });

    it('should reject current > max', () => {
      const result = validatePriceRange(20, 30, 35);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current price cannot be greater than maximum price');
    });

    it('should warn about unusually wide range', () => {
      const result = validatePriceRange(10, 40, 25); // 4x range
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price range seems unusually wide (max > 3x min)');
    });
  });

  describe('validateConfidence', () => {
    it('should validate correct confidence values', () => {
      expect(validateConfidence(0.5).isValid).toBe(true);
      expect(validateConfidence(0.1).isValid).toBe(true);
      expect(validateConfidence(1.0).isValid).toBe(true);
    });

    it('should reject confidence outside 0-1 range', () => {
      expect(validateConfidence(-0.1).isValid).toBe(false);
      expect(validateConfidence(1.1).isValid).toBe(false);
    });

    it('should reject exactly zero confidence', () => {
      const result = validateConfidence(0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence cannot be exactly 0');
    });

    it('should reject non-number values', () => {
      const result = validateConfidence('0.5' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence must be a number');
    });
  });

  describe('validateProductCategory', () => {
    it('should validate correct categories', () => {
      const validCategories = ['vegetables', 'fruits', 'grains', 'pulses', 'spices'];
      
      validCategories.forEach(category => {
        const result = validateProductCategory(category);
        expect(result.isValid).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      const result = validateProductCategory('VEGETABLES');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid categories', () => {
      const result = validateProductCategory('invalid-category');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Category must be one of:');
    });

    it('should reject empty category', () => {
      const result = validateProductCategory('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category must be a non-empty string');
    });
  });

  describe('validateUnit', () => {
    it('should validate correct units', () => {
      const validUnits = ['kg', 'gram', 'quintal', 'ton', 'liter', 'ml', 'piece', 'dozen'];
      
      validUnits.forEach(unit => {
        const result = validateUnit(unit);
        expect(result.isValid).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      const result = validateUnit('KG');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid units', () => {
      const result = validateUnit('invalid-unit');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unit must be one of:');
    });

    it('should reject empty unit', () => {
      const result = validateUnit('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unit must be a non-empty string');
    });
  });
});
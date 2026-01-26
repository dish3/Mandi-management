import {
  formatPrice,
  formatPriceForDisplay,
  formatPriceRange,
  formatConfidence,
  formatConfidenceAsPercentage,
  formatPriceChange,
  formatVolume,
  parseAndFormatUserPrice,
  formatPriceInfo,
  formatPriceSummary
} from '../../../services/price-discovery/price-formatting';
import { PriceInfo } from '../../../types';

describe('Price Formatting', () => {
  describe('formatPrice', () => {
    it('should format prices to 2 decimal places', () => {
      expect(formatPrice(25.123)).toBe(25.12);
      expect(formatPrice(25.999)).toBe(26.00);
      expect(formatPrice(25)).toBe(25.00);
    });

    it('should handle zero price', () => {
      expect(formatPrice(0)).toBe(0.00);
    });

    it('should throw error for negative prices', () => {
      expect(() => formatPrice(-10)).toThrow('Price cannot be negative');
    });

    it('should throw error for invalid input', () => {
      expect(() => formatPrice(NaN)).toThrow('Price must be a valid number');
      expect(() => formatPrice('invalid' as any)).toThrow('Price must be a valid number');
    });
  });

  describe('formatPriceForDisplay', () => {
    it('should format price with currency symbol', () => {
      expect(formatPriceForDisplay(25.50)).toBe('₹25.50');
      expect(formatPriceForDisplay(1000)).toBe('₹1,000.00');
    });

    it('should use custom currency symbol', () => {
      expect(formatPriceForDisplay(25.50, '$')).toBe('$25.50');
    });

    it('should format large numbers with Indian numbering system', () => {
      expect(formatPriceForDisplay(100000)).toBe('₹1,00,000.00');
      expect(formatPriceForDisplay(1000000)).toBe('₹10,00,000.00');
      expect(formatPriceForDisplay(10000000)).toBe('₹1,00,00,000.00');
    });

    it('should handle small numbers correctly', () => {
      expect(formatPriceForDisplay(1.23)).toBe('₹1.23');
      expect(formatPriceForDisplay(0.50)).toBe('₹0.50');
    });
  });

  describe('formatPriceRange', () => {
    it('should format price range correctly', () => {
      const result = formatPriceRange(20, 30);
      expect(result).toBe('₹20.00 - ₹30.00');
    });

    it('should use custom currency', () => {
      const result = formatPriceRange(20, 30, '$');
      expect(result).toBe('$20.00 - $30.00');
    });

    it('should handle large ranges', () => {
      const result = formatPriceRange(100000, 200000);
      expect(result).toBe('₹1,00,000.00 - ₹2,00,000.00');
    });
  });

  describe('formatConfidence', () => {
    it('should format confidence to 2 decimal places', () => {
      expect(formatConfidence(0.123)).toBe(0.12);
      expect(formatConfidence(0.999)).toBe(1.00);
      expect(formatConfidence(0.5)).toBe(0.50);
    });

    it('should throw error for invalid confidence', () => {
      expect(() => formatConfidence(-0.1)).toThrow('Confidence must be between 0 and 1');
      expect(() => formatConfidence(1.1)).toThrow('Confidence must be between 0 and 1');
      expect(() => formatConfidence(NaN)).toThrow('Confidence must be a valid number');
    });
  });

  describe('formatConfidenceAsPercentage', () => {
    it('should format confidence as percentage', () => {
      expect(formatConfidenceAsPercentage(0.85)).toBe('85%');
      expect(formatConfidenceAsPercentage(0.123)).toBe('12%');
      expect(formatConfidenceAsPercentage(1.0)).toBe('100%');
      expect(formatConfidenceAsPercentage(0.0)).toBe('0%');
    });
  });

  describe('formatPriceChange', () => {
    it('should calculate positive price change', () => {
      const result = formatPriceChange(20, 25);
      
      expect(result.change).toBe(5.00);
      expect(result.percentage).toBe(25.00);
      expect(result.formatted).toBe('+5.00 (+25%)');
    });

    it('should calculate negative price change', () => {
      const result = formatPriceChange(25, 20);
      
      expect(result.change).toBe(5.00);
      expect(result.percentage).toBe(-20.00);
      expect(result.formatted).toBe('-5.00 (-20%)');
    });

    it('should handle zero change', () => {
      const result = formatPriceChange(25, 25);
      
      expect(result.change).toBe(0.00);
      expect(result.percentage).toBe(0.00);
      expect(result.formatted).toBe('+0.00 (+0%)');
    });

    it('should throw error for invalid old price', () => {
      expect(() => formatPriceChange(0, 25)).toThrow('Old price must be positive');
      expect(() => formatPriceChange(-10, 25)).toThrow('Old price must be positive');
    });
  });

  describe('formatVolume', () => {
    it('should format large volumes with M suffix', () => {
      expect(formatVolume(1000000)).toBe('1M');
      expect(formatVolume(2500000)).toBe('2.5M');
    });

    it('should format medium volumes with K suffix', () => {
      expect(formatVolume(1000)).toBe('1K');
      expect(formatVolume(2500)).toBe('2.5K');
    });

    it('should format small volumes as-is', () => {
      expect(formatVolume(500)).toBe('500');
      expect(formatVolume(1)).toBe('1');
    });
  });

  describe('parseAndFormatUserPrice', () => {
    it('should parse string prices correctly', () => {
      expect(parseAndFormatUserPrice('25.50')).toBe(25.50);
      expect(parseAndFormatUserPrice('₹25.50')).toBe(25.50);
      expect(parseAndFormatUserPrice('$25.50')).toBe(25.50);
      expect(parseAndFormatUserPrice('1,000.00')).toBe(1000.00);
    });

    it('should handle numeric input', () => {
      expect(parseAndFormatUserPrice(25.50)).toBe(25.50);
      expect(parseAndFormatUserPrice(1000)).toBe(1000.00);
    });

    it('should throw error for invalid input', () => {
      expect(() => parseAndFormatUserPrice('invalid')).toThrow('Invalid price format');
      expect(() => parseAndFormatUserPrice('')).toThrow('Invalid price format');
      expect(() => parseAndFormatUserPrice(-10)).toThrow('Invalid price format');
    });
  });

  describe('formatPriceInfo', () => {
    it('should format all price fields in PriceInfo', () => {
      const priceInfo: PriceInfo = {
        current: 25.123,
        minimum: 20.999,
        maximum: 30.001,
        average: 25.555,
        confidence: 0.8567,
        source: 'official',
        lastUpdated: new Date()
      };

      const result = formatPriceInfo(priceInfo);

      expect(result.current).toBe(25.12);
      expect(result.minimum).toBe(21.00);
      expect(result.maximum).toBe(30.00);
      expect(result.average).toBe(25.56);
      expect(result.confidence).toBe(0.86);
      expect(result.source).toBe('official');
      expect(result.lastUpdated).toEqual(priceInfo.lastUpdated);
    });
  });

  describe('formatPriceSummary', () => {
    it('should create formatted price summary', () => {
      const priceInfo: PriceInfo = {
        current: 25.50,
        minimum: 20.00,
        maximum: 30.00,
        average: 25.00,
        confidence: 0.85,
        source: 'official',
        lastUpdated: new Date('2023-01-01T12:00:00Z')
      };

      const result = formatPriceSummary(priceInfo);

      expect(result.current).toBe('₹25.50');
      expect(result.range).toBe('₹20.00 - ₹30.00');
      expect(result.confidence).toBe('85%');
      expect(result.source).toBe('🏛️ Official');
      expect(result.lastUpdated).toContain('1/1/2023'); // Date format may vary by locale
    });

    it('should handle estimated source', () => {
      const priceInfo: PriceInfo = {
        current: 25.50,
        minimum: 20.00,
        maximum: 30.00,
        average: 25.00,
        confidence: 0.65,
        source: 'estimated',
        lastUpdated: new Date()
      };

      const result = formatPriceSummary(priceInfo);
      expect(result.source).toBe('🤖 Estimated');
    });
  });

  describe('edge cases', () => {
    it('should handle very small prices', () => {
      expect(formatPrice(0.001)).toBe(0.00);
      expect(formatPrice(0.005)).toBe(0.01);
    });

    it('should handle very large prices', () => {
      expect(formatPrice(999999.999)).toBe(1000000.00);
      expect(formatPriceForDisplay(999999.99)).toBe('₹9,99,999.99');
    });

    it('should handle precision edge cases', () => {
      expect(formatPrice(0.1 + 0.2)).toBe(0.30); // JavaScript floating point precision
      expect(formatConfidence(0.1 + 0.2)).toBe(0.30);
    });
  });
});
import { PriceDiscoveryService } from '../../../services/price-discovery/price-discovery-service';
import { MockPriceDiscoveryProvider } from '../../../services/price-discovery/mock-price-discovery-provider';
import { ProductQuery, PriceInfo } from '../../../types';

describe('PriceDiscoveryService', () => {
  let service: PriceDiscoveryService;
  let mockProvider: MockPriceDiscoveryProvider;

  beforeEach(() => {
    mockProvider = new MockPriceDiscoveryProvider();
    service = new PriceDiscoveryService(mockProvider);
  });

  describe('getCurrentPrice', () => {
    const validProductQuery: ProductQuery = {
      name: 'tomato',
      category: 'vegetables',
      location: 'delhi',
      quantity: 10,
      unit: 'kg'
    };

    it('should return current price for valid product query', async () => {
      const result = await service.getCurrentPrice(validProductQuery);

      expect(result).toBeDefined();
      expect(result.current).toBeGreaterThan(0);
      expect(result.minimum).toBeGreaterThan(0);
      expect(result.maximum).toBeGreaterThan(0);
      expect(result.average).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['official', 'estimated']).toContain(result.source);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should validate price data structure', async () => {
      const result = await service.getCurrentPrice(validProductQuery);

      expect(result.minimum).toBeLessThanOrEqual(result.maximum);
      expect(result.current).toBeGreaterThanOrEqual(result.minimum);
      expect(result.current).toBeLessThanOrEqual(result.maximum);
      expect(result.average).toBeGreaterThanOrEqual(result.minimum);
      expect(result.average).toBeLessThanOrEqual(result.maximum);
    });

    it('should throw error for invalid product query', async () => {
      const invalidQuery = { ...validProductQuery, name: '' };

      await expect(service.getCurrentPrice(invalidQuery))
        .rejects.toThrow('Invalid product query');
    });

    it('should throw error for negative quantity', async () => {
      const invalidQuery = { ...validProductQuery, quantity: -5 };

      await expect(service.getCurrentPrice(invalidQuery))
        .rejects.toThrow('Invalid product query');
    });

    it('should cache results for repeated queries', async () => {
      const result1 = await service.getCurrentPrice(validProductQuery);
      const result2 = await service.getCurrentPrice(validProductQuery);

      // Results should be identical due to caching
      expect(result1.current).toBe(result2.current);
      expect(result1.lastUpdated.getTime()).toBe(result2.lastUpdated.getTime());
    });

    it('should handle API failures gracefully', async () => {
      mockProvider.setHealthStatus(false);

      await expect(service.getCurrentPrice(validProductQuery))
        .rejects.toThrow('Failed to get price');
    });
  });

  describe('getPriceHistory', () => {
    const validProductQuery: ProductQuery = {
      name: 'tomato',
      category: 'vegetables',
      location: 'delhi',
      quantity: 10,
      unit: 'kg'
    };

    it('should return price history for valid inputs', async () => {
      const result = await service.getPriceHistory(validProductQuery, 30);

      expect(result).toBeDefined();
      expect(result.productId).toBe('tomato-vegetables');
      expect(result.location).toBe('delhi');
      expect(result.prices).toBeInstanceOf(Array);
      expect(result.prices.length).toBeGreaterThan(0);
      expect(['rising', 'falling', 'stable']).toContain(result.trend);
      expect(result.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should validate price history data structure', async () => {
      const result = await service.getPriceHistory(validProductQuery, 7);

      result.prices.forEach(point => {
        expect(point.date).toBeInstanceOf(Date);
        expect(point.price).toBeGreaterThan(0);
        expect(point.volume).toBeGreaterThan(0);
        expect(point.source).toBeDefined();
      });
    });

    it('should throw error for invalid days parameter', async () => {
      await expect(service.getPriceHistory(validProductQuery, 0))
        .rejects.toThrow('Days must be between 1 and 365');

      await expect(service.getPriceHistory(validProductQuery, 400))
        .rejects.toThrow('Days must be between 1 and 365');
    });

    it('should handle API failures gracefully', async () => {
      mockProvider.setHealthStatus(false);

      await expect(service.getPriceHistory(validProductQuery, 30))
        .rejects.toThrow('Failed to get price history');
    });
  });

  describe('estimatePrice', () => {
    const validProductQuery: ProductQuery = {
      name: 'tomato',
      category: 'vegetables',
      location: 'delhi',
      quantity: 10,
      unit: 'kg'
    };

    it('should return estimated price for valid product query', async () => {
      const result = await service.estimatePrice(validProductQuery);

      expect(result).toBeDefined();
      expect(result.current).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.source).toBe('estimated');
      expect(result.estimationMethod).toBeDefined();
      expect(result.historicalBasis).toBeInstanceOf(Array);
    });

    it('should have lower confidence than official data', async () => {
      const estimated = await service.estimatePrice(validProductQuery);
      
      // Estimated prices should have confidence <= 0.8
      expect(estimated.confidence).toBeLessThanOrEqual(0.8);
    });

    it('should provide estimation method information', async () => {
      const result = await service.estimatePrice(validProductQuery);

      expect(result.estimationMethod).toBeDefined();
      expect(typeof result.estimationMethod).toBe('string');
      expect(result.estimationMethod.length).toBeGreaterThan(0);
    });
  });

  describe('getMarketSentiment', () => {
    const validProductQuery: ProductQuery = {
      name: 'tomato',
      category: 'vegetables',
      location: 'delhi',
      quantity: 10,
      unit: 'kg'
    };

    it('should return market sentiment for valid product query', async () => {
      const result = await service.getMarketSentiment(validProductQuery);

      expect(result).toBeDefined();
      expect(result.product).toBe('tomato');
      expect(result.location).toBe('delhi');
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.factors).toBeInstanceOf(Array);
      expect(result.lastAnalyzed).toBeInstanceOf(Date);
    });

    it('should provide meaningful market factors', async () => {
      const result = await service.getMarketSentiment(validProductQuery);

      expect(result.factors.length).toBeGreaterThan(0);
      result.factors.forEach(factor => {
        expect(typeof factor).toBe('string');
        expect(factor.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validatePriceData', () => {
    it('should validate correct price data', () => {
      const validPriceInfo: PriceInfo = {
        current: 25.50,
        minimum: 20.00,
        maximum: 30.00,
        average: 25.00,
        confidence: 0.85,
        source: 'official',
        lastUpdated: new Date()
      };

      const result = service.validatePriceData(validPriceInfo);
      expect(result).toBe(true);
    });

    it('should reject invalid price data', () => {
      const invalidPriceInfo: PriceInfo = {
        current: 25.50,
        minimum: 30.00, // Invalid: min > max
        maximum: 20.00,
        average: 25.00,
        confidence: 0.85,
        source: 'official',
        lastUpdated: new Date()
      };

      const result = service.validatePriceData(invalidPriceInfo);
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock a timeout scenario
      mockProvider.setHealthStatus(false);

      const validProductQuery: ProductQuery = {
        name: 'tomato',
        category: 'vegetables',
        location: 'delhi',
        quantity: 10,
        unit: 'kg'
      };

      await expect(service.getCurrentPrice(validProductQuery))
        .rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const invalidQuery = {
        name: '',
        category: 'vegetables',
        location: 'delhi',
        quantity: 10,
        unit: 'kg'
      };

      try {
        await service.getCurrentPrice(invalidQuery);
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid product query');
        expect((error as Error).message).toContain('name');
      }
    });
  });
});
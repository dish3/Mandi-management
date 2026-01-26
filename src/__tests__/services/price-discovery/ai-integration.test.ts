import { PriceDiscoveryService } from '../../../services/price-discovery/price-discovery-service';
import { MockPriceDiscoveryProvider } from '../../../services/price-discovery/mock-price-discovery-provider';
import { MockAIService } from '../../../services/ai/mock-ai-service';
import { ProductQuery, EstimatedPrice, MarketSentiment } from '../../../types';
import { AIService, MarketContext } from '../../../interfaces/ai-service';

describe('PriceDiscoveryService AI Integration', () => {
  let priceService: PriceDiscoveryService;
  let mockMarketAdapter: MockPriceDiscoveryProvider;
  let mockAIService: MockAIService;
  let mockProductQuery: ProductQuery;

  beforeEach(() => {
    mockMarketAdapter = new MockPriceDiscoveryProvider();
    mockAIService = new MockAIService();
    priceService = new PriceDiscoveryService(mockMarketAdapter, mockAIService);

    mockProductQuery = {
      name: 'Onion',
      category: 'Vegetables',
      location: 'Mumbai',
      quantity: 100,
      unit: 'kg'
    };
  });

  describe('AI-enhanced price estimation', () => {
    it('should use AI service for price estimation with historical data', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      const result = await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('confidence');
      expect(result.source).toBe('estimated');
      expect(result.estimationMethod).toBe('mock_ai_estimation');
    });

    it('should fall back to statistical estimation when AI fails', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI')
        .mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('current');
      expect(result.estimationMethod).toBe('historical_average_with_trend');
    });

    it('should use AI for category-based estimation when no historical data', async () => {
      // Mock empty historical data
      jest.spyOn(mockMarketAdapter, 'getHistoricalData').mockResolvedValue([]);
      
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      const result = await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalledWith(mockProductQuery, [], expect.any(Object));
      expect(result).toHaveProperty('current');
      expect(result.source).toBe('estimated');
    });

    it('should build appropriate market context', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalledWith(
        mockProductQuery,
        expect.any(Array),
        expect.objectContaining({
          seasonality: expect.any(String),
          festivalSeason: expect.any(Boolean)
        })
      );
    });
  });

  describe('AI-enhanced market sentiment', () => {
    it('should use AI service for sentiment analysis', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'generateMarketSentiment');
      
      const result = await priceService.getMarketSentiment(mockProductQuery);

      expect(aiSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('factors');
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
    });

    it('should fall back to statistical sentiment when AI fails', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'generateMarketSentiment')
        .mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await priceService.getMarketSentiment(mockProductQuery);

      expect(aiSpy).toHaveBeenCalled();
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
    });

    it('should include external factors in AI sentiment analysis', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'generateMarketSentiment');
      
      await priceService.getMarketSentiment(mockProductQuery);

      expect(aiSpy).toHaveBeenCalledWith(
        mockProductQuery,
        expect.any(Array),
        expect.any(Array) // External factors
      );
    });
  });

  describe('AI service management', () => {
    it('should allow setting AI service', () => {
      const newAIService = new MockAIService();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      priceService.setAIService(newAIService);
      
      // Verify the service was set (we can't directly access private property)
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle AI service initialization', async () => {
      await expect(priceService.initialize()).resolves.not.toThrow();
    });

    it('should handle AI service cleanup', async () => {
      await expect(priceService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Market context building', () => {
    it('should determine seasonality for vegetables', async () => {
      const vegetableQuery = { ...mockProductQuery, category: 'Vegetables' };
      
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      await priceService.estimatePrice(vegetableQuery);

      expect(aiSpy).toHaveBeenCalledWith(
        vegetableQuery,
        expect.any(Array),
        expect.objectContaining({
          seasonality: expect.any(String),
          festivalSeason: expect.any(Boolean)
        })
      );
    });

    it('should detect festival season', async () => {
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalledWith(
        mockProductQuery,
        expect.any(Array),
        expect.objectContaining({
          festivalSeason: expect.any(Boolean)
        })
      );
    });

    it('should identify supply disruptions from volatility', async () => {
      // Mock high volatility historical data
      const volatileData = [
        { date: new Date('2024-01-01'), price: 20, volume: 1000, location: 'Mumbai' },
        { date: new Date('2024-01-02'), price: 40, volume: 1000, location: 'Mumbai' },
        { date: new Date('2024-01-03'), price: 15, volume: 1000, location: 'Mumbai' },
        { date: new Date('2024-01-04'), price: 45, volume: 1000, location: 'Mumbai' },
      ];
      
      jest.spyOn(mockMarketAdapter, 'getHistoricalData').mockResolvedValue(volatileData);
      
      const aiSpy = jest.spyOn(mockAIService, 'estimatePriceWithAI');
      
      await priceService.estimatePrice(mockProductQuery);

      expect(aiSpy).toHaveBeenCalledWith(
        mockProductQuery,
        expect.any(Array),
        expect.objectContaining({
          supplyDisruptions: expect.arrayContaining([
            expect.stringContaining('volatility')
          ])
        })
      );
    });
  });

  describe('Confidence scoring integration', () => {
    it('should use AI confidence scoring', async () => {
      const confidenceSpy = jest.spyOn(mockAIService, 'calculateConfidenceScore');
      
      await priceService.estimatePrice(mockProductQuery);

      expect(confidenceSpy).toHaveBeenCalled();
    });

    it('should apply AI confidence to estimates', async () => {
      const mockConfidence = 0.85;
      jest.spyOn(mockAIService, 'calculateConfidenceScore').mockResolvedValue(mockConfidence);
      
      const result = await priceService.estimatePrice(mockProductQuery);

      expect(result.confidence).toBe(mockConfidence);
    });
  });

  describe('Error handling', () => {
    it('should handle AI service errors gracefully', async () => {
      jest.spyOn(mockAIService, 'estimatePriceWithAI')
        .mockRejectedValue(new Error('AI service error'));
      
      const result = await priceService.estimatePrice(mockProductQuery);

      expect(result).toHaveProperty('current');
      expect(result.estimationMethod).not.toBe('mock_ai_estimation');
    });

    it('should handle AI sentiment errors gracefully', async () => {
      jest.spyOn(mockAIService, 'generateMarketSentiment')
        .mockRejectedValue(new Error('AI sentiment error'));
      
      const result = await priceService.getMarketSentiment(mockProductQuery);

      expect(result).toHaveProperty('sentiment');
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
    });

    it('should provide meaningful error messages', async () => {
      jest.spyOn(mockMarketAdapter, 'getHistoricalData')
        .mockRejectedValue(new Error('Data fetch failed'));
      
      await expect(priceService.estimatePrice(mockProductQuery))
        .rejects.toThrow('Failed to estimate price for Onion');
    });
  });
});
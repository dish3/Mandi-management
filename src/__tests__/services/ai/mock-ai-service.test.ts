import { MockAIService } from '../../../services/ai/mock-ai-service';
import { ProductQuery, PricePoint } from '../../../types';
import { MarketContext } from '../../../interfaces/ai-service';

describe('MockAIService', () => {
  let aiService: MockAIService;
  let mockProductQuery: ProductQuery;
  let mockHistoricalData: PricePoint[];

  beforeEach(() => {
    aiService = new MockAIService();
    
    mockProductQuery = {
      name: 'Onion',
      category: 'Vegetables',
      location: 'Mumbai',
      quantity: 100,
      unit: 'kg'
    };

    mockHistoricalData = [
      {
        date: new Date('2024-01-01'),
        price: 25.0,
        volume: 1000,
        source: 'historical'
      },
      {
        date: new Date('2024-01-02'),
        price: 26.0,
        volume: 1200,
        source: 'historical'
      },
      {
        date: new Date('2024-01-03'),
        price: 24.5,
        volume: 900,
        source: 'historical'
      }
    ];
  });

  describe('estimatePriceWithAI', () => {
    it('should estimate price with historical data', async () => {
      const result = await aiService.estimatePriceWithAI(mockProductQuery, mockHistoricalData);

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('minimum');
      expect(result).toHaveProperty('maximum');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('confidence');
      expect(result.source).toBe('estimated');
      expect(result.estimationMethod).toBe('mock_ai_estimation');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should estimate price without historical data', async () => {
      const result = await aiService.estimatePriceWithAI(mockProductQuery, []);

      expect(result).toHaveProperty('current');
      expect(result.current).toBeGreaterThan(0);
      expect(result.minimum).toBeLessThan(result.current);
      expect(result.maximum).toBeGreaterThan(result.current);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should apply market context adjustments', async () => {
      const marketContext: MarketContext = {
        seasonality: 'peak',
        festivalSeason: true,
        supplyDisruptions: ['Weather issues']
      };

      const baseResult = await aiService.estimatePriceWithAI(mockProductQuery, mockHistoricalData);
      const contextResult = await aiService.estimatePriceWithAI(mockProductQuery, mockHistoricalData, marketContext);

      // Peak season and festival should increase price
      expect(contextResult.current).toBeGreaterThan(baseResult.current);
    });

    it('should handle off-season pricing', async () => {
      const marketContext: MarketContext = {
        seasonality: 'off-season',
        festivalSeason: false
      };

      const baseResult = await aiService.estimatePriceWithAI(mockProductQuery, mockHistoricalData);
      const contextResult = await aiService.estimatePriceWithAI(mockProductQuery, mockHistoricalData, marketContext);

      // Off-season should decrease price
      expect(contextResult.current).toBeLessThan(baseResult.current);
    });
  });

  describe('analyzeMarketTrends', () => {
    it('should analyze trends with sufficient data', async () => {
      const result = await aiService.analyzeMarketTrends(mockProductQuery, mockHistoricalData);

      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('predictedDirection');
      expect(result).toHaveProperty('timeHorizon');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('reasoning');
      expect(['rising', 'falling', 'stable', 'volatile']).toContain(result.trend);
      expect(['up', 'down', 'stable']).toContain(result.predictedDirection);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data gracefully', async () => {
      const result = await aiService.analyzeMarketTrends(mockProductQuery, [mockHistoricalData[0]]);

      expect(result.trend).toBe('stable');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.factors).toContain('Insufficient historical data');
    });

    it('should detect rising trends', async () => {
      const risingData: PricePoint[] = [
        { date: new Date('2024-01-01'), price: 20.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-02'), price: 22.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-03'), price: 24.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-04'), price: 26.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-05'), price: 28.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-06'), price: 30.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-07'), price: 32.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-08'), price: 34.0, volume: 1000, source: 'historical' }
      ];

      const result = await aiService.analyzeMarketTrends(mockProductQuery, risingData);

      // Should detect rising or volatile trend for significant price increase
      expect(['rising', 'volatile']).toContain(result.trend);
      expect(result.predictedDirection).toBe('up');
    });

    it('should detect falling trends', async () => {
      const fallingData: PricePoint[] = [
        { date: new Date('2024-01-01'), price: 35.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-02'), price: 32.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-03'), price: 29.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-04'), price: 26.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-05'), price: 23.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-06'), price: 20.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-07'), price: 17.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-08'), price: 14.0, volume: 1000, source: 'historical' }
      ];

      const result = await aiService.analyzeMarketTrends(mockProductQuery, fallingData);

      expect(['falling', 'volatile']).toContain(result.trend);
      expect(result.predictedDirection).toBe('down');
    });
  });

  describe('generateMarketSentiment', () => {
    it('should generate sentiment with sufficient data', async () => {
      const result = await aiService.generateMarketSentiment(mockProductQuery, mockHistoricalData);

      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('lastAnalyzed');
      expect(result.product).toBe(mockProductQuery.name);
      expect(result.location).toBe(mockProductQuery.location);
      expect(['bullish', 'bearish', 'neutral']).toContain(result.sentiment);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data', async () => {
      const result = await aiService.generateMarketSentiment(mockProductQuery, [mockHistoricalData[0]]);

      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.factors).toContain('Insufficient data for sentiment analysis');
    });

    it('should incorporate external factors', async () => {
      const externalFactors = ['Weather disruption', 'Festival demand'];
      const result = await aiService.generateMarketSentiment(mockProductQuery, mockHistoricalData, externalFactors);

      expect(result.factors.some(factor => 
        externalFactors.some(extFactor => factor.includes(extFactor.split(' ')[0]))
      )).toBe(true);
    });

    it('should detect high volatility', async () => {
      const volatileData: PricePoint[] = [
        { date: new Date('2024-01-01'), price: 20.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-02'), price: 35.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-03'), price: 15.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-04'), price: 40.0, volume: 1000, source: 'historical' },
        { date: new Date('2024-01-05'), price: 10.0, volume: 1000, source: 'historical' }
      ];

      const result = await aiService.generateMarketSentiment(mockProductQuery, volatileData);

      expect(result.sentiment).toBe('neutral'); // High volatility should result in neutral sentiment
      expect(result.factors.some(factor => factor.toLowerCase().includes('volatility'))).toBe(true);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate confidence based on data availability', async () => {
      const lowDataConfidence = await aiService.calculateConfidenceScore(
        mockProductQuery, 
        mockHistoricalData.slice(0, 1), 
        'mock_estimation'
      );
      
      const highDataConfidence = await aiService.calculateConfidenceScore(
        mockProductQuery, 
        [...mockHistoricalData, ...mockHistoricalData, ...mockHistoricalData], 
        'mock_estimation'
      );

      expect(highDataConfidence).toBeGreaterThan(lowDataConfidence);
    });

    it('should consider data recency', async () => {
      const oldData: PricePoint[] = [
        {
          date: new Date('2023-01-01'), // Old data
          price: 25.0,
          volume: 1000,
          source: 'historical'
        }
      ];

      const recentData: PricePoint[] = [
        {
          date: new Date(), // Recent data
          price: 25.0,
          volume: 1000,
          source: 'historical'
        }
      ];

      const oldConfidence = await aiService.calculateConfidenceScore(mockProductQuery, oldData, 'mock_estimation');
      const recentConfidence = await aiService.calculateConfidenceScore(mockProductQuery, recentData, 'mock_estimation');

      expect(recentConfidence).toBeGreaterThan(oldConfidence);
    });

    it('should return confidence within valid range', async () => {
      const confidence = await aiService.calculateConfidenceScore(mockProductQuery, mockHistoricalData, 'mock_estimation');

      expect(confidence).toBeGreaterThanOrEqual(0.1);
      expect(confidence).toBeLessThanOrEqual(0.7); // Mock service max confidence
    });
  });

  describe('checkHealth', () => {
    it('should always return true for mock service', async () => {
      const health = await aiService.checkHealth();
      expect(health).toBe(true);
    });
  });
});
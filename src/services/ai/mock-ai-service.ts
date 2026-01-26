import { AIService, MarketContext, TrendAnalysis } from '../../interfaces/ai-service';
import { ProductQuery, PricePoint, EstimatedPrice, MarketSentiment } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Mock AI Service for testing and development
 * Provides deterministic responses for AI-based price estimation
 */
export class MockAIService implements AIService {
  private readonly categoryBasePrices: Record<string, number> = {
    'vegetables': 30,
    'fruits': 50,
    'grains': 25,
    'pulses': 80,
    'spices': 200,
    'dairy': 60,
    'meat': 300,
    'fish': 250
  };

  async estimatePriceWithAI(
    product: ProductQuery,
    historicalData: PricePoint[],
    marketContext?: MarketContext
  ): Promise<EstimatedPrice> {
    logger.info('Mock AI price estimation', { 
      product: product.name, 
      historicalDataPoints: historicalData.length 
    });

    let basePrice = this.categoryBasePrices[product.category.toLowerCase()] || 50;

    // Adjust based on historical data if available
    if (historicalData.length > 0) {
      const recentPrices = historicalData.slice(-5).map(d => d.price);
      const avgRecentPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      basePrice = avgRecentPrice;
    }

    // Apply market context adjustments
    if (marketContext) {
      if (marketContext.seasonality === 'peak') {
        basePrice *= 1.2;
      } else if (marketContext.seasonality === 'off-season') {
        basePrice *= 0.8;
      }

      if (marketContext.festivalSeason) {
        basePrice *= 1.15;
      }

      if (marketContext.supplyDisruptions?.length) {
        basePrice *= 1.1;
      }
    }

    // Add some realistic variation
    const variation = 0.1;
    const current = Math.round(basePrice * 100) / 100;
    const minimum = Math.round(current * (1 - variation) * 100) / 100;
    const maximum = Math.round(current * (1 + variation) * 100) / 100;
    const average = Math.round(((minimum + maximum) / 2) * 100) / 100;

    const confidence = await this.calculateConfidenceScore(product, historicalData, 'mock_estimation');

    return {
      current,
      minimum,
      maximum,
      average,
      confidence,
      source: 'estimated',
      lastUpdated: new Date(),
      estimationMethod: 'mock_ai_estimation',
      historicalBasis: historicalData.slice(-10) // Last 10 data points
    };
  }

  async analyzeMarketTrends(
    product: ProductQuery,
    historicalData: PricePoint[]
  ): Promise<TrendAnalysis> {
    logger.info('Mock AI trend analysis', { 
      product: product.name, 
      dataPoints: historicalData.length 
    });

    if (historicalData.length < 2) {
      return {
        trend: 'stable',
        confidence: 0.3,
        predictedDirection: 'stable',
        timeHorizon: 7,
        factors: ['Insufficient historical data'],
        reasoning: 'Not enough data points to determine trend'
      };
    }

    // Simple trend calculation
    const recentPrices = historicalData.slice(-7).map(d => d.price);
    const olderPrices = historicalData.slice(0, 7).map(d => d.price);
    
    const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    let trend: 'rising' | 'falling' | 'stable' | 'volatile';
    let predictedDirection: 'up' | 'down' | 'stable';
    
    if (Math.abs(change) < 0.05) {
      trend = 'stable';
      predictedDirection = 'stable';
    } else if (change > 0.15) {
      trend = 'volatile';
      predictedDirection = 'up';
    } else if (change < -0.15) {
      trend = 'volatile';
      predictedDirection = 'down';
    } else if (change > 0) {
      trend = 'rising';
      predictedDirection = 'up';
    } else {
      trend = 'falling';
      predictedDirection = 'down';
    }

    const factors = this.generateMockFactors(trend, product);
    const confidence = Math.min(0.8, historicalData.length / 30);

    return {
      trend,
      confidence,
      predictedDirection,
      timeHorizon: 14,
      factors,
      reasoning: `Based on ${historicalData.length} data points, the trend shows ${change > 0 ? 'upward' : change < 0 ? 'downward' : 'stable'} movement.`
    };
  }

  async generateMarketSentiment(
    product: ProductQuery,
    priceHistory: PricePoint[],
    externalFactors?: string[]
  ): Promise<MarketSentiment> {
    logger.info('Mock AI sentiment analysis', { 
      product: product.name,
      externalFactors: externalFactors?.length || 0
    });

    if (priceHistory.length < 2) {
      return {
        product: product.name,
        location: product.location,
        sentiment: 'neutral',
        confidence: 0.3,
        factors: ['Insufficient data for sentiment analysis'],
        lastAnalyzed: new Date()
      };
    }

    // Calculate price volatility
    const prices = priceHistory.map(p => p.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / mean;

    // Determine sentiment based on recent trend and volatility
    const recentPrices = prices.slice(-5);
    const trend = recentPrices[recentPrices.length - 1] - recentPrices[0];
    
    let sentiment: 'bullish' | 'bearish' | 'neutral';
    
    if (volatility > 0.2) {
      sentiment = 'neutral'; // High volatility = uncertain
    } else if (trend > mean * 0.1) {
      sentiment = 'bullish';
    } else if (trend < -mean * 0.1) {
      sentiment = 'bearish';
    } else {
      sentiment = 'neutral';
    }

    const factors = this.generateSentimentFactors(sentiment, volatility, externalFactors);
    const confidence = Math.min(0.7, priceHistory.length / 20);

    return {
      product: product.name,
      location: product.location,
      sentiment,
      confidence,
      factors,
      lastAnalyzed: new Date()
    };
  }

  async calculateConfidenceScore(
    product: ProductQuery,
    historicalData: PricePoint[],
    estimationMethod: string
  ): Promise<number> {
    let confidence = 0.4; // Base confidence for mock service

    // Data availability factor
    if (historicalData.length >= 20) {
      confidence += 0.2;
    } else if (historicalData.length >= 10) {
      confidence += 0.1;
    } else if (historicalData.length < 3) {
      confidence -= 0.1;
    }

    // Data recency factor
    if (historicalData.length > 0) {
      const mostRecentData = historicalData[historicalData.length - 1];
      const daysSinceLastData = Math.floor(
        (Date.now() - mostRecentData.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastData <= 7) {
        confidence += 0.1;
      } else if (daysSinceLastData > 30) {
        confidence -= 0.1;
      }
    }

    // Mock service has lower confidence than real AI
    confidence *= 0.8;

    return Math.max(0.1, Math.min(0.7, confidence));
  }

  async checkHealth(): Promise<boolean> {
    // Mock service is always healthy
    return true;
  }

  // Private helper methods

  private generateMockFactors(trend: string, product: ProductQuery): string[] {
    const factors: string[] = [];
    
    switch (trend) {
      case 'rising':
        factors.push('Increased demand', 'Supply constraints', 'Seasonal factors');
        break;
      case 'falling':
        factors.push('Market surplus', 'Reduced demand', 'Harvest season');
        break;
      case 'volatile':
        factors.push('Market uncertainty', 'Weather variations', 'Supply disruptions');
        break;
      default:
        factors.push('Stable market conditions', 'Balanced supply-demand');
    }

    // Add product-specific factors
    if (product.category.toLowerCase() === 'vegetables') {
      factors.push('Weather-dependent supply');
    } else if (product.category.toLowerCase() === 'grains') {
      factors.push('Government policy impact');
    }

    return factors;
  }

  private generateSentimentFactors(
    sentiment: string,
    volatility: number,
    externalFactors?: string[]
  ): string[] {
    const factors: string[] = [];
    
    switch (sentiment) {
      case 'bullish':
        factors.push('Positive price momentum', 'Strong demand indicators');
        break;
      case 'bearish':
        factors.push('Declining price trend', 'Oversupply concerns');
        break;
      default:
        factors.push('Mixed market signals', 'Balanced market conditions');
    }

    if (volatility > 0.2) {
      factors.push('High price volatility');
    } else if (volatility < 0.1) {
      factors.push('Stable price environment');
    }

    if (externalFactors?.length) {
      factors.push(...externalFactors.slice(0, 2)); // Add up to 2 external factors
    }

    return factors;
  }
}
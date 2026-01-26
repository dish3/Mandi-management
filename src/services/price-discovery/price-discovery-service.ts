import { PriceDiscoveryEngine } from '../../interfaces/price-discovery';
import { MarketDataAdapter } from '../../interfaces/market-data';
import { AIService, MarketContext } from '../../interfaces/ai-service';
import {
  ProductQuery,
  PriceInfo,
  PriceHistory,
  EstimatedPrice,
  MarketSentiment,
  PricePoint,
  MandiPrice,
  HistoricalPrice
} from '../../types';
import { validatePriceData, validateProductQuery } from './price-validation';
import { formatPriceInfo } from './price-formatting';
import { MarketDataFactory } from './market-data-factory';
import { AIServiceFactory } from '../ai/ai-service-factory';
import { logger } from '../../utils/logger';

/**
 * Core Price Discovery Service Implementation
 * Provides real-time market data and AI-based price estimation
 */
export class PriceDiscoveryService implements PriceDiscoveryEngine {
  private logger = logger;
  private marketDataAdapter: MarketDataAdapter;
  private aiService: AIService;
  private priceCache = new Map<string, { data: PriceInfo; timestamp: Date }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(marketDataAdapter?: MarketDataAdapter, aiService?: AIService) {
    // Use provided adapter or create a cached adapter by default
    this.marketDataAdapter = marketDataAdapter || this.createDefaultAdapter();
    // Use provided AI service or create auto service
    this.aiService = aiService || AIServiceFactory.createAuto();
  }

  /**
   * Initialize the service (async initialization for adapters that need it)
   */
  async initialize(): Promise<void> {
    try {
      // Initialize the market data adapter if it has an initialize method
      if ('initialize' in this.marketDataAdapter) {
        await (this.marketDataAdapter as any).initialize();
      }
      
      this.logger.info('Price Discovery Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Price Discovery Service', { error });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup the market data adapter if it has a cleanup method
      if ('cleanup' in this.marketDataAdapter) {
        await (this.marketDataAdapter as any).cleanup();
      }
      
      // Clear local cache
      this.priceCache.clear();
      
      this.logger.info('Price Discovery Service cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during Price Discovery Service cleanup', { error });
    }
  }

  /**
   * Create default market data adapter
   */
  private createDefaultAdapter(): MarketDataAdapter {
    // This will be replaced with the factory-created adapter
    // For now, return a placeholder that will be replaced during initialization
    return {} as MarketDataAdapter;
  }

  /**
   * Set market data adapter (useful for dependency injection)
   */
  setMarketDataAdapter(adapter: MarketDataAdapter): void {
    this.marketDataAdapter = adapter;
    this.logger.info('Market data adapter updated', { 
      adapterType: adapter.constructor.name 
    });
  }

  /**
   * Set AI service (useful for dependency injection)
   */
  setAIService(aiService: AIService): void {
    this.aiService = aiService;
    this.logger.info('AI service updated', { 
      serviceType: aiService.constructor.name 
    });
  }

  /**
   * Get current market price for a product
   */
  async getCurrentPrice(product: ProductQuery): Promise<PriceInfo> {
    this.logger.info('Getting current price', { product });
    
    // Validate input
    const validation = validateProductQuery(product);
    if (!validation.isValid) {
      throw new Error(`Invalid product query: ${validation.errors.join(', ')}`);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(product);
    const cached = this.priceCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      this.logger.debug('Returning cached price data', { cacheKey });
      return cached.data;
    }

    try {
      // Fetch from market data adapter
      const mandiPrices = await this.marketDataAdapter.fetchMandiPrices(
        product.location,
        new Date()
      );

      // Find matching product
      const matchingPrice = mandiPrices.find(price => 
        this.isProductMatch(price.product, product.name, product.category)
      );

      let priceInfo: PriceInfo;

      if (matchingPrice && this.marketDataAdapter.validateDataFreshness(matchingPrice)) {
        // Use official data
        priceInfo = this.convertMandiPriceToPriceInfo(matchingPrice, 'official');
      } else {
        // Fall back to estimation
        this.logger.warn('Official data not available, using estimation', { product });
        const estimated = await this.estimatePrice(product);
        priceInfo = {
          current: estimated.current,
          minimum: estimated.minimum,
          maximum: estimated.maximum,
          average: estimated.average,
          confidence: estimated.confidence * 0.8, // Reduce confidence for fallback
          source: 'estimated',
          lastUpdated: new Date()
        };
      }

      // Format and validate
      priceInfo = formatPriceInfo(priceInfo);
      if (!this.validatePriceData(priceInfo)) {
        throw new Error('Generated price data failed validation');
      }

      // Cache the result
      this.priceCache.set(cacheKey, { data: priceInfo, timestamp: new Date() });

      this.logger.info('Successfully retrieved price data', { 
        product: product.name, 
        source: priceInfo.source,
        price: priceInfo.current 
      });

      return priceInfo;
    } catch (error) {
      this.logger.error('Failed to get current price', { product, error });
      throw new Error(`Failed to get price for ${product.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Get price history for a product over specified days
   */
  async getPriceHistory(product: ProductQuery, days: number): Promise<PriceHistory> {
    this.logger.info('Getting price history', { product, days });

    // Validate input
    const validation = validateProductQuery(product);
    if (!validation.isValid) {
      throw new Error(`Invalid product query: ${validation.errors.join(', ')}`);
    }

    if (days <= 0 || days > 365) {
      throw new Error('Days must be between 1 and 365');
    }

    try {
      const historicalData = await this.marketDataAdapter.getHistoricalData(
        product.name,
        product.location,
        days
      );

      const pricePoints: PricePoint[] = historicalData.map(data => ({
        date: data.date,
        price: data.price,
        volume: data.volume,
        source: 'official'
      }));

      // Calculate trend and volatility
      const trend = this.calculateTrend(pricePoints);
      const volatility = this.calculateVolatility(pricePoints);

      const priceHistory: PriceHistory = {
        productId: `${product.name}-${product.category}`,
        location: product.location,
        prices: pricePoints,
        trend,
        volatility
      };

      this.logger.info('Successfully retrieved price history', {
        product: product.name,
        dataPoints: pricePoints.length,
        trend,
        volatility
      });

      return priceHistory;
    } catch (error) {
      this.logger.error('Failed to get price history', { product, days, error });
      throw new Error(`Failed to get price history for ${product.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate price when official data is unavailable
   */
  async estimatePrice(product: ProductQuery): Promise<EstimatedPrice> {
    this.logger.info('Estimating price', { product });

    // Validate input
    const validation = validateProductQuery(product);
    if (!validation.isValid) {
      throw new Error(`Invalid product query: ${validation.errors.join(', ')}`);
    }

    try {
      // Get historical data for estimation basis
      const historicalData = await this.marketDataAdapter.getHistoricalData(
        product.name,
        product.location,
        30 // Last 30 days
      );

      let estimatedPrice: EstimatedPrice;

      if (historicalData.length > 0) {
        // Use AI-based estimation with historical data
        const marketContext = await this.buildMarketContext(product, historicalData);
        
        try {
          // Try AI-based estimation first
          estimatedPrice = await this.aiService.estimatePriceWithAI(
            product,
            historicalData.map(d => ({
              date: d.date,
              price: d.price,
              volume: d.volume,
              source: 'historical'
            })),
            marketContext
          );

          this.logger.info('AI-based price estimation successful', {
            product: product.name,
            estimatedPrice: estimatedPrice.current,
            confidence: estimatedPrice.confidence,
            method: estimatedPrice.estimationMethod
          });

        } catch (aiError) {
          this.logger.warn('AI estimation failed, falling back to statistical method', { 
            product: product.name, 
            error: aiError 
          });
          
          // Fallback to statistical estimation
          estimatedPrice = await this.estimateFromHistoricalData(product, historicalData);
        }
      } else {
        // Try AI-based category estimation when no historical data
        try {
          const marketContext = await this.buildMarketContext(product, []);
          estimatedPrice = await this.aiService.estimatePriceWithAI(product, [], marketContext);
          
          this.logger.info('AI-based category estimation successful', {
            product: product.name,
            estimatedPrice: estimatedPrice.current,
            confidence: estimatedPrice.confidence
          });

        } catch (aiError) {
          this.logger.warn('AI category estimation failed, using fallback', { 
            product: product.name, 
            error: aiError 
          });
          
          // Final fallback to category-based estimation
          estimatedPrice = await this.estimateFromCategory(product);
        }
      }

      this.logger.info('Successfully estimated price', {
        product: product.name,
        estimatedPrice: estimatedPrice.current,
        confidence: estimatedPrice.confidence,
        method: estimatedPrice.estimationMethod
      });

      return estimatedPrice;
    } catch (error) {
      this.logger.error('Failed to estimate price', { product, error });
      throw new Error(`Failed to estimate price for ${product.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Get market sentiment analysis for a product
   */
  async getMarketSentiment(product: ProductQuery): Promise<MarketSentiment> {
    this.logger.info('Getting market sentiment', { product });

    // Validate input
    const validation = validateProductQuery(product);
    if (!validation.isValid) {
      throw new Error(`Invalid product query: ${validation.errors.join(', ')}`);
    }

    try {
      // Get recent price history for sentiment analysis
      const priceHistory = await this.getPriceHistory(product, 30);
      
      let marketSentiment: MarketSentiment;

      try {
        // Try AI-based sentiment analysis first
        const externalFactors = await this.identifyExternalFactors(product, priceHistory);
        marketSentiment = await this.aiService.generateMarketSentiment(
          product,
          priceHistory.prices,
          externalFactors
        );

        this.logger.info('AI-based sentiment analysis successful', {
          product: product.name,
          sentiment: marketSentiment.sentiment,
          confidence: marketSentiment.confidence
        });

      } catch (aiError) {
        this.logger.warn('AI sentiment analysis failed, using statistical method', { 
          product: product.name, 
          error: aiError 
        });

        // Fallback to statistical sentiment analysis
        const sentiment = this.analyzeSentiment(priceHistory);
        const factors = this.identifyMarketFactors(priceHistory);

        marketSentiment = {
          product: product.name,
          location: product.location,
          sentiment,
          confidence: this.calculateSentimentConfidence(priceHistory),
          factors,
          lastAnalyzed: new Date()
        };
      }

      this.logger.info('Successfully analyzed market sentiment', {
        product: product.name,
        sentiment: marketSentiment.sentiment,
        factors: marketSentiment.factors.length
      });

      return marketSentiment;
    } catch (error) {
      this.logger.error('Failed to get market sentiment', { product, error });
      throw new Error(`Failed to analyze market sentiment for ${product.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if price data is fresh and reliable
   */
  validatePriceData(priceInfo: PriceInfo): boolean {
    return validatePriceData(priceInfo).isValid;
  }

  // Private helper methods

  private generateCacheKey(product: ProductQuery): string {
    return `${product.name}-${product.category}-${product.location}`;
  }

  private isCacheValid(timestamp: Date): boolean {
    return Date.now() - timestamp.getTime() < this.CACHE_TTL_MS;
  }

  private isProductMatch(mandiProduct: string, queryName: string, queryCategory: string): boolean {
    const normalizedMandi = mandiProduct.toLowerCase().trim();
    const normalizedName = queryName.toLowerCase().trim();
    const normalizedCategory = queryCategory.toLowerCase().trim();

    return normalizedMandi.includes(normalizedName) || 
           normalizedMandi.includes(normalizedCategory) ||
           normalizedName.includes(normalizedMandi);
  }

  private convertMandiPriceToPriceInfo(mandiPrice: MandiPrice, source: 'official' | 'estimated'): PriceInfo {
    return {
      current: mandiPrice.price,
      minimum: mandiPrice.price * 0.95, // Assume 5% variation
      maximum: mandiPrice.price * 1.05,
      average: mandiPrice.price,
      confidence: mandiPrice.verified ? 0.95 : 0.75,
      source,
      lastUpdated: mandiPrice.date
    };
  }

  private calculateTrend(pricePoints: PricePoint[]): 'rising' | 'falling' | 'stable' {
    if (pricePoints.length < 2) return 'stable';

    const recent = pricePoints.slice(-7); // Last 7 points
    const older = pricePoints.slice(0, 7); // First 7 points

    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'rising';
    if (change < -0.05) return 'falling';
    return 'stable';
  }

  private calculateVolatility(pricePoints: PricePoint[]): number {
    if (pricePoints.length < 2) return 0;

    const prices = pricePoints.map(p => p.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculateTrendMultiplier(recentPrices: number[]): number {
    if (recentPrices.length < 2) return 1;

    const firstHalf = recentPrices.slice(0, Math.floor(recentPrices.length / 2));
    const secondHalf = recentPrices.slice(Math.floor(recentPrices.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;

    return secondAvg / firstAvg;
  }

  private calculateConfidence(dataPoints: number, maxPoints: number): number {
    const baseConfidence = Math.min(dataPoints / maxPoints, 1);
    return Math.round(baseConfidence * 0.8 * 100) / 100; // Max 80% confidence for estimates
  }

  private async estimateFromCategory(product: ProductQuery): Promise<EstimatedPrice> {
    // Fallback estimation based on category averages
    // This would typically integrate with an AI service
    const categoryBasePrices: Record<string, number> = {
      'vegetables': 30,
      'fruits': 50,
      'grains': 25,
      'pulses': 80,
      'spices': 200
    };

    const basePrice = categoryBasePrices[product.category.toLowerCase()] || 50;
    
    return {
      current: basePrice,
      minimum: basePrice * 0.8,
      maximum: basePrice * 1.2,
      average: basePrice,
      confidence: 0.3, // Low confidence for category-based estimates
      source: 'estimated',
      lastUpdated: new Date(),
      estimationMethod: 'category_baseline',
      historicalBasis: []
    };
  }

  private analyzeSentiment(priceHistory: PriceHistory): 'bullish' | 'bearish' | 'neutral' {
    const { trend, volatility } = priceHistory;
    
    if (trend === 'rising' && volatility < 0.1) return 'bullish';
    if (trend === 'falling' && volatility < 0.1) return 'bearish';
    if (volatility > 0.2) return 'neutral'; // High volatility = uncertain
    
    return 'neutral';
  }

  private identifyMarketFactors(priceHistory: PriceHistory): string[] {
    const factors: string[] = [];
    
    if (priceHistory.trend === 'rising') {
      factors.push('Increasing demand');
    } else if (priceHistory.trend === 'falling') {
      factors.push('Seasonal surplus');
    } else {
      factors.push('Stable market conditions');
    }
    
    if (priceHistory.volatility > 0.15) {
      factors.push('Market uncertainty');
    }
    
    if (priceHistory.prices.length < 10) {
      factors.push('Limited data availability');
    }
    
    // Ensure we always have at least one factor
    if (factors.length === 0) {
      factors.push('Normal market conditions');
    }
    
    return factors;
  }

  private calculateSentimentConfidence(priceHistory: PriceHistory): number {
    let confidence = 0.5; // Base confidence
    
    // More data points = higher confidence
    confidence += Math.min(priceHistory.prices.length / 30, 0.3);
    
    // Lower volatility = higher confidence
    confidence += Math.max(0.2 - priceHistory.volatility, 0);
    
    return Math.min(confidence, 1);
  }

  /**
   * Build market context for AI estimation
   */
  private async buildMarketContext(product: ProductQuery, historicalData: HistoricalPrice[]): Promise<MarketContext> {
    const currentMonth = new Date().getMonth();
    
    // Determine seasonality based on product category and month
    let seasonality: 'peak' | 'off-season' | 'normal' = 'normal';
    
    if (product.category.toLowerCase() === 'vegetables') {
      // Winter vegetables peak in Nov-Feb (months 10, 11, 0, 1)
      if ([10, 11, 0, 1].includes(currentMonth)) {
        seasonality = 'peak';
      } else if ([5, 6, 7, 8].includes(currentMonth)) {
        seasonality = 'off-season'; // Monsoon months
      }
    } else if (product.category.toLowerCase() === 'fruits') {
      // Summer fruits peak in Mar-Jun (months 2, 3, 4, 5)
      if ([2, 3, 4, 5].includes(currentMonth)) {
        seasonality = 'peak';
      }
    } else if (product.category.toLowerCase() === 'grains') {
      // Post-harvest season Oct-Dec (months 9, 10, 11)
      if ([9, 10, 11].includes(currentMonth)) {
        seasonality = 'off-season'; // Surplus after harvest
      } else if ([3, 4, 5].includes(currentMonth)) {
        seasonality = 'peak'; // Pre-harvest demand
      }
    }

    // Check for festival season (simplified - major Indian festivals)
    const festivalMonths = [8, 9, 10]; // Sep, Oct, Nov (Navratri, Diwali, etc.)
    const festivalSeason = festivalMonths.includes(currentMonth);

    // Identify potential supply disruptions based on recent price volatility
    const supplyDisruptions: string[] = [];
    if (historicalData.length > 0) {
      const prices = historicalData.map(d => d.price);
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const volatility = Math.sqrt(variance) / mean;
      
      if (volatility > 0.3) {
        supplyDisruptions.push('High price volatility indicating supply issues');
      }
    }

    return {
      seasonality,
      festivalSeason,
      supplyDisruptions: supplyDisruptions.length > 0 ? supplyDisruptions : undefined,
      demandFactors: festivalSeason ? ['Festival season increased demand'] : undefined
    };
  }

  /**
   * Estimate price from historical data using statistical methods
   */
  private async estimateFromHistoricalData(product: ProductQuery, historicalData: HistoricalPrice[]): Promise<EstimatedPrice> {
    const prices = historicalData.map(d => d.price);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    // Apply trend adjustment
    const recentPrices = historicalData.slice(-7).map(d => d.price); // Last 7 days
    const trendMultiplier = this.calculateTrendMultiplier(recentPrices);
    const current = average * trendMultiplier;

    return {
      current: Math.round(current * 100) / 100,
      minimum: Math.round(min * 0.9 * 100) / 100, // 10% buffer
      maximum: Math.round(max * 1.1 * 100) / 100, // 10% buffer
      average: Math.round(average * 100) / 100,
      confidence: this.calculateConfidence(historicalData.length, 30),
      source: 'estimated',
      lastUpdated: new Date(),
      estimationMethod: 'historical_average_with_trend',
      historicalBasis: historicalData.map(d => ({
        date: d.date,
        price: d.price,
        volume: d.volume,
        source: 'historical'
      }))
    };
  }

  /**
   * Identify external factors affecting market sentiment
   */
  private async identifyExternalFactors(product: ProductQuery, priceHistory: PriceHistory): Promise<string[]> {
    const factors: string[] = [];
    
    // Add seasonality factors
    const currentMonth = new Date().getMonth();
    if (product.category.toLowerCase() === 'vegetables' && [5, 6, 7, 8].includes(currentMonth)) {
      factors.push('Monsoon season affecting supply');
    }
    
    // Add volatility factors
    if (priceHistory.volatility > 0.2) {
      factors.push('High market volatility');
    }
    
    // Add trend factors
    if (priceHistory.trend === 'rising') {
      factors.push('Upward price trend');
    } else if (priceHistory.trend === 'falling') {
      factors.push('Downward price trend');
    }
    
    return factors;
  }
}
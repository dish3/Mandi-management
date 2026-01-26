import { ProductQuery, PricePoint, EstimatedPrice, MarketSentiment } from '../types';

/**
 * AI Service Interface for price estimation and market analysis
 * Provides LLM-based price estimation when official data is unavailable
 */
export interface AIService {
  /**
   * Estimate price using AI/LLM when historical data is limited
   */
  estimatePriceWithAI(
    product: ProductQuery,
    historicalData: PricePoint[],
    marketContext?: MarketContext
  ): Promise<EstimatedPrice>;

  /**
   * Analyze market trends using AI
   */
  analyzeMarketTrends(
    product: ProductQuery,
    historicalData: PricePoint[]
  ): Promise<TrendAnalysis>;

  /**
   * Generate market sentiment analysis using AI
   */
  generateMarketSentiment(
    product: ProductQuery,
    priceHistory: PricePoint[],
    externalFactors?: string[]
  ): Promise<MarketSentiment>;

  /**
   * Calculate confidence score for AI-based estimates
   */
  calculateConfidenceScore(
    product: ProductQuery,
    historicalData: PricePoint[],
    estimationMethod: string
  ): Promise<number>;

  /**
   * Check if AI service is available and healthy
   */
  checkHealth(): Promise<boolean>;
}

/**
 * Market context for AI price estimation
 */
export interface MarketContext {
  seasonality: 'peak' | 'off-season' | 'normal';
  weatherConditions?: string;
  festivalSeason?: boolean;
  supplyDisruptions?: string[];
  demandFactors?: string[];
}

/**
 * AI-based trend analysis result
 */
export interface TrendAnalysis {
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  confidence: number;
  predictedDirection: 'up' | 'down' | 'stable';
  timeHorizon: number; // days
  factors: string[];
  reasoning: string;
}

/**
 * AI estimation methods
 */
export type AIEstimationMethod = 
  | 'llm_with_historical'
  | 'llm_category_based'
  | 'llm_seasonal_adjusted'
  | 'llm_market_sentiment';
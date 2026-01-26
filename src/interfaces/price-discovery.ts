import { ProductQuery, PriceInfo, PriceHistory, EstimatedPrice, MarketSentiment } from '../types';

/**
 * Price Discovery Engine Interface
 * Fetches real-time market data and provides AI-based price estimation
 */
export interface PriceDiscoveryEngine {
  /**
   * Get current market price for a product
   */
  getCurrentPrice(product: ProductQuery): Promise<PriceInfo>;

  /**
   * Get price history for a product over specified days
   */
  getPriceHistory(product: ProductQuery, days: number): Promise<PriceHistory>;

  /**
   * Estimate price when official data is unavailable
   */
  estimatePrice(product: ProductQuery): Promise<EstimatedPrice>;

  /**
   * Get market sentiment analysis for a product
   */
  getMarketSentiment(product: ProductQuery): Promise<MarketSentiment>;

  /**
   * Check if price data is fresh and reliable
   */
  validatePriceData(priceInfo: PriceInfo): boolean;
}
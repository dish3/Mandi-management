import { MandiPrice, HistoricalPrice } from '../types';

/**
 * Market Data Adapter Interface
 * Integrates with government APIs and external data sources
 */
export interface MarketDataAdapter {
  /**
   * Fetch current mandi prices for a location and date
   */
  fetchMandiPrices(location: string, date: Date): Promise<MandiPrice[]>;

  /**
   * Get historical price data for a product and location
   */
  getHistoricalData(product: string, location: string, days: number): Promise<HistoricalPrice[]>;

  /**
   * Validate if market data is fresh and reliable
   */
  validateDataFreshness(data: MandiPrice): boolean;

  /**
   * Check if API is available and responsive
   */
  checkApiHealth(): Promise<boolean>;

  /**
   * Get supported locations for price data
   */
  getSupportedLocations(): Promise<string[]>;

  /**
   * Get supported product categories
   */
  getSupportedProducts(): Promise<string[]>;
}
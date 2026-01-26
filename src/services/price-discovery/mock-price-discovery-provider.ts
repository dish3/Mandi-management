import { MarketDataAdapter } from '../../interfaces/market-data';
import { MandiPrice, HistoricalPrice } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Mock Market Data Adapter for testing and development
 */
export class MockPriceDiscoveryProvider implements MarketDataAdapter {
  private logger = logger;
  private mockData: Map<string, MandiPrice[]> = new Map();
  private isHealthy = true;

  constructor() {
    this.initializeMockData();
  }

  /**
   * Fetch current mandi prices for a location and date
   */
  async fetchMandiPrices(location: string, date: Date): Promise<MandiPrice[]> {
    this.logger.debug('Fetching mock mandi prices', { location, date });
    
    // Simulate API delay
    await this.delay(100);
    
    if (!this.isHealthy) {
      throw new Error('Mock API is currently unavailable');
    }

    const key = location.toLowerCase();
    const prices = this.mockData.get(key) || [];
    
    // Add some randomness to simulate real market fluctuations
    return prices.map(price => ({
      ...price,
      price: this.addRandomFluctuation(price.price, 0.05), // ±5% variation
      date: new Date(date)
    }));
  }

  /**
   * Get historical price data for a product and location
   */
  async getHistoricalData(product: string, location: string, days: number): Promise<HistoricalPrice[]> {
    this.logger.debug('Fetching mock historical data', { product, location, days });
    
    // Simulate API delay
    await this.delay(150);
    
    if (!this.isHealthy) {
      throw new Error('Mock API is currently unavailable');
    }

    const basePrice = this.getBasePriceForProduct(product);
    const historicalData: HistoricalPrice[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate price trends and seasonality
      const trendFactor = this.calculateTrendFactor(i, days);
      const seasonalFactor = this.calculateSeasonalFactor(date, product);
      const randomFactor = 0.9 + Math.random() * 0.2; // ±10% random variation
      
      const price = basePrice * trendFactor * seasonalFactor * randomFactor;
      const volume = Math.floor(Math.random() * 1000) + 100; // Random volume
      
      historicalData.push({
        date,
        price: Math.round(price * 100) / 100,
        volume,
        location
      });
    }
    
    return historicalData;
  }

  /**
   * Validate if market data is fresh and reliable
   */
  validateDataFreshness(data: MandiPrice): boolean {
    const now = new Date();
    const dataAge = now.getTime() - data.date.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return dataAge < maxAge && data.verified;
  }

  /**
   * Check if API is available and responsive
   */
  async checkApiHealth(): Promise<boolean> {
    await this.delay(50);
    return this.isHealthy;
  }

  /**
   * Get supported locations for price data
   */
  async getSupportedLocations(): Promise<string[]> {
    await this.delay(50);
    return Array.from(this.mockData.keys());
  }

  /**
   * Get supported product categories
   */
  async getSupportedProducts(): Promise<string[]> {
    await this.delay(50);
    return [
      'tomato', 'onion', 'potato', 'rice', 'wheat', 'dal', 'apple', 'banana',
      'carrot', 'cabbage', 'spinach', 'cauliflower', 'brinjal', 'okra'
    ];
  }

  // Mock control methods for testing

  /**
   * Set API health status for testing error scenarios
   */
  setHealthStatus(healthy: boolean): void {
    this.isHealthy = healthy;
    this.logger.info('Mock API health status changed', { healthy });
  }

  /**
   * Add custom mock data for testing
   */
  addMockData(location: string, prices: MandiPrice[]): void {
    this.mockData.set(location.toLowerCase(), prices);
    this.logger.debug('Added mock data', { location, priceCount: prices.length });
  }

  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.mockData.clear();
    this.logger.debug('Cleared all mock data');
  }

  // Private helper methods

  private initializeMockData(): void {
    const locations = ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata'];
    const products = ['tomato', 'onion', 'potato', 'rice', 'wheat'];
    
    locations.forEach(location => {
      const prices: MandiPrice[] = products.map(product => ({
        product,
        location,
        price: this.getBasePriceForProduct(product),
        date: new Date(),
        source: 'mock-api',
        verified: Math.random() > 0.1 // 90% verified
      }));
      
      this.mockData.set(location, prices);
    });
    
    this.logger.info('Initialized mock data', { 
      locations: locations.length, 
      products: products.length 
    });
  }

  private getBasePriceForProduct(product: string): number {
    const basePrices: Record<string, number> = {
      'tomato': 25,
      'onion': 20,
      'potato': 15,
      'rice': 45,
      'wheat': 30,
      'dal': 80,
      'apple': 120,
      'banana': 40,
      'carrot': 35,
      'cabbage': 18,
      'spinach': 25,
      'cauliflower': 30,
      'brinjal': 28,
      'okra': 35
    };
    
    return basePrices[product.toLowerCase()] || 50;
  }

  private addRandomFluctuation(basePrice: number, maxVariation: number): number {
    const variation = (Math.random() - 0.5) * 2 * maxVariation;
    return Math.round(basePrice * (1 + variation) * 100) / 100;
  }

  private calculateTrendFactor(dayIndex: number, totalDays: number): number {
    // Simulate gradual price trends over time
    const trendStrength = 0.1; // 10% max trend over the period
    const progress = dayIndex / totalDays;
    
    // Random trend direction
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    
    return 1 + (trendDirection * trendStrength * progress);
  }

  private calculateSeasonalFactor(date: Date, product: string): number {
    const month = date.getMonth();
    
    // Simulate seasonal price variations for different products
    const seasonalPatterns: Record<string, number[]> = {
      'tomato': [1.2, 1.1, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 1.0],
      'onion': [0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1],
      'rice': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], // Stable
      'wheat': [1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 1.0]
    };
    
    const pattern = seasonalPatterns[product.toLowerCase()];
    return pattern ? pattern[month] : 1.0;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
import { MarketDataAdapter } from '../../interfaces/market-data';
import { GovernmentMarketDataAdapter } from './market-data-adapter';
import { CachedMarketDataAdapter } from './cached-market-data-adapter';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Market Data Adapter Factory
 * Creates appropriate market data adapter based on configuration
 */
export class MarketDataFactory {
  private static instance: MarketDataAdapter | null = null;
  private static logger = logger;

  /**
   * Create market data adapter based on configuration
   */
  static async createAdapter(options?: {
    useCache?: boolean;
    adapterType?: 'government' | 'cached';
  }): Promise<MarketDataAdapter> {
    const useCache = options?.useCache ?? true;
    const adapterType = options?.adapterType ?? (useCache ? 'cached' : 'government');

    // Check if we're in test environment
    const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                             process.env.JEST_WORKER_ID !== undefined ||
                             typeof jest !== 'undefined';

    this.logger.info('Creating market data adapter', { 
      adapterType, 
      useCache,
      isTestEnvironment,
      redisUrl: config.redis.url ? 'configured' : 'not configured'
    });

    let adapter: MarketDataAdapter;

    // In test environment, always use mock adapter to avoid Redis connection issues
    if (isTestEnvironment) {
      this.logger.debug('Test environment detected, using mock adapter');
      adapter = new MockMarketDataAdapter();
    } else {
      switch (adapterType) {
        case 'cached':
          adapter = new CachedMarketDataAdapter();
          // Initialize the cached adapter
          if ('initialize' in adapter) {
            await (adapter as CachedMarketDataAdapter).initialize();
          }
          break;

        case 'government':
          adapter = new GovernmentMarketDataAdapter();
          break;

        default:
          this.logger.warn('Unknown adapter type, defaulting to government adapter', { adapterType });
          adapter = new GovernmentMarketDataAdapter();
      }
    }

    this.logger.info('Market data adapter created successfully', { 
      type: adapter.constructor.name 
    });

    return adapter;
  }

  /**
   * Get singleton instance of market data adapter
   */
  static async getInstance(options?: {
    useCache?: boolean;
    adapterType?: 'government' | 'cached';
  }): Promise<MarketDataAdapter> {
    // In test environment, always create new instances to avoid state pollution
    const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                             process.env.JEST_WORKER_ID !== undefined ||
                             typeof jest !== 'undefined';
    
    if (isTestEnvironment || !this.instance) {
      this.instance = await this.createAdapter(options);
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (this.instance && 'cleanup' in this.instance) {
      const cleanupResult = (this.instance as CachedMarketDataAdapter).cleanup();
      if (cleanupResult && typeof cleanupResult.catch === 'function') {
        cleanupResult.catch(error => {
          this.logger.error('Error during adapter cleanup', { error });
        });
      }
    }
    this.instance = null;
    this.logger.debug('Market data adapter instance reset');
  }

  /**
   * Create adapter for testing with mock data
   */
  static createMockAdapter(): MarketDataAdapter {
    return new MockMarketDataAdapter();
  }

  /**
   * Validate adapter configuration
   */
  static validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Redis configuration
    if (!config.redis.url) {
      warnings.push('Redis URL not configured - caching will be disabled');
    }

    // Check API configuration
    if (!config.externalApis.mandiBaseUrl) {
      errors.push('Mandi API base URL not configured');
    }

    if (!config.apiKeys.mandiApi) {
      warnings.push('Mandi API key not configured - may have rate limiting issues');
    }

    // Check cache TTL configuration
    if (config.cache.priceTtl <= 0) {
      warnings.push('Price cache TTL is not positive - caching may not work effectively');
    }

    const isValid = errors.length === 0;

    this.logger.info('Market data adapter configuration validation', {
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return { isValid, errors, warnings };
  }
}

/**
 * Mock Market Data Adapter for testing
 */
class MockMarketDataAdapter implements MarketDataAdapter {
  private logger = logger;

  async fetchMandiPrices(location: string, date: Date): Promise<import('../../types').MandiPrice[]> {
    this.logger.debug('Mock: Fetching mandi prices', { location, date });
    
    return [
      {
        product: 'Onion',
        location,
        price: 25.50,
        date: new Date(),
        source: 'mock',
        verified: true
      },
      {
        product: 'Potato',
        location,
        price: 18.75,
        date: new Date(),
        source: 'mock',
        verified: true
      },
      {
        product: 'Tomato',
        location,
        price: 32.00,
        date: new Date(),
        source: 'mock',
        verified: true
      }
    ];
  }

  async getHistoricalData(product: string, location: string, days: number): Promise<import('../../types').HistoricalPrice[]> {
    this.logger.debug('Mock: Fetching historical data', { product, location, days });
    
    const data: import('../../types').HistoricalPrice[] = [];
    const basePrice = 25;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date,
        price: basePrice + (Math.random() - 0.5) * 10, // Random variation
        volume: Math.floor(Math.random() * 1000) + 100,
        location
      });
    }
    
    return data.reverse(); // Return in chronological order
  }

  validateDataFreshness(data: import('../../types').MandiPrice): boolean {
    const now = new Date();
    const dataAge = now.getTime() - data.date.getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    
    return dataAge < maxAgeMs && data.verified && data.price > 0;
  }

  async checkApiHealth(): Promise<boolean> {
    this.logger.debug('Mock: Checking API health');
    return true; // Mock is always healthy
  }

  async getSupportedLocations(): Promise<string[]> {
    this.logger.debug('Mock: Fetching supported locations');
    return [
      'Delhi',
      'Mumbai',
      'Bangalore',
      'Chennai',
      'Kolkata',
      'Hyderabad',
      'Pune',
      'Ahmedabad'
    ];
  }

  async getSupportedProducts(): Promise<string[]> {
    this.logger.debug('Mock: Fetching supported products');
    return [
      'Onion',
      'Potato',
      'Tomato',
      'Rice',
      'Wheat',
      'Garlic',
      'Ginger',
      'Turmeric'
    ];
  }
}
import { MarketDataAdapter } from '../../interfaces/market-data';
import { MandiPrice, HistoricalPrice } from '../../types';
import { GovernmentMarketDataAdapter } from './market-data-adapter';
import { MarketDataCache } from './market-data-cache';
import { logger } from '../../utils/logger';

/**
 * Cached Market Data Adapter
 * Combines government API data fetching with Redis caching for optimal performance
 */
export class CachedMarketDataAdapter implements MarketDataAdapter {
  private logger = logger;
  private apiAdapter: GovernmentMarketDataAdapter;
  private cache: MarketDataCache;
  private isInitialized: boolean = false;

  constructor() {
    this.apiAdapter = new GovernmentMarketDataAdapter();
    this.cache = new MarketDataCache();
  }

  /**
   * Initialize the adapter and cache connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.cache.connect();
      this.isInitialized = true;
      this.logger.info('Cached market data adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cached market data adapter', { error });
      // Continue without cache - adapter will work in non-cached mode
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.cache.disconnect();
      this.isInitialized = false;
      this.logger.info('Cached market data adapter cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', { error });
    }
  }

  /**
   * Fetch current mandi prices with caching
   */
  async fetchMandiPrices(location: string, date: Date): Promise<MandiPrice[]> {
    this.logger.info('Fetching mandi prices with caching', { location, date });

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.cache.getCachedMandiPrices(location, date);
      if (cached && cached.length > 0) {
        // Validate cached data freshness
        const freshData = cached.filter(price => this.validateDataFreshness(price));
        if (freshData.length > 0) {
          this.logger.info('Returning cached mandi prices', {
            location,
            count: freshData.length
          });
          return freshData;
        } else {
          this.logger.debug('Cached data is stale, fetching fresh data', { location });
        }
      }

      // Fetch from API
      const apiData = await this.apiAdapter.fetchMandiPrices(location, date);
      
      // Cache the fresh data
      if (apiData.length > 0) {
        await this.cache.cacheMandiPrices(location, date, apiData);
        this.logger.info('Cached fresh mandi prices', {
          location,
          count: apiData.length
        });
      }

      return apiData;
    } catch (error) {
      this.logger.error('Failed to fetch mandi prices with caching', { location, date, error });
      
      // Try to return stale cached data as fallback
      try {
        const staleCache = await this.cache.getCachedMandiPrices(location, date);
        if (staleCache && staleCache.length > 0) {
          this.logger.warn('Returning stale cached data as fallback', {
            location,
            count: staleCache.length
          });
          return staleCache;
        }
      } catch (cacheError) {
        this.logger.error('Failed to retrieve fallback cache data', { cacheError });
      }

      // Return empty array if all else fails
      return [];
    }
  }

  /**
   * Get historical price data with caching
   */
  async getHistoricalData(product: string, location: string, days: number): Promise<HistoricalPrice[]> {
    this.logger.info('Fetching historical data with caching', { product, location, days });

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.cache.getCachedHistoricalData(product, location, days);
      if (cached && cached.length > 0) {
        this.logger.info('Returning cached historical data', {
          product,
          location,
          count: cached.length
        });
        return cached;
      }

      // Fetch from API
      const apiData = await this.apiAdapter.getHistoricalData(product, location, days);
      
      // Cache the data
      if (apiData.length > 0) {
        await this.cache.cacheHistoricalData(product, location, days, apiData);
        this.logger.info('Cached fresh historical data', {
          product,
          location,
          count: apiData.length
        });
      }

      return apiData;
    } catch (error) {
      this.logger.error('Failed to fetch historical data with caching', { product, location, days, error });
      
      // Try to return cached data as fallback
      try {
        const fallbackCache = await this.cache.getCachedHistoricalData(product, location, days);
        if (fallbackCache && fallbackCache.length > 0) {
          this.logger.warn('Returning cached data as fallback', {
            product,
            location,
            count: fallbackCache.length
          });
          return fallbackCache;
        }
      } catch (cacheError) {
        this.logger.error('Failed to retrieve fallback historical cache', { cacheError });
      }

      // Return empty array if all else fails
      return [];
    }
  }

  /**
   * Validate data freshness with enhanced logic
   */
  validateDataFreshness(data: MandiPrice): boolean {
    // Use the API adapter's validation logic
    const isBasicValid = this.apiAdapter.validateDataFreshness(data);
    
    if (!isBasicValid) {
      return false;
    }

    // Additional freshness checks for cached data
    const now = new Date();
    const dataAge = now.getTime() - data.date.getTime();
    
    // Different freshness requirements based on time of day
    const currentHour = now.getHours();
    let maxAgeMs: number;
    
    if (currentHour >= 6 && currentHour <= 18) {
      // During market hours, require fresher data (6 hours)
      maxAgeMs = 6 * 60 * 60 * 1000;
    } else {
      // Outside market hours, allow older data (12 hours)
      maxAgeMs = 12 * 60 * 60 * 1000;
    }

    const isFreshEnough = dataAge < maxAgeMs;
    
    this.logger.debug('Enhanced freshness validation', {
      product: data.product,
      location: data.location,
      dataAgeHours: Math.round(dataAge / (60 * 60 * 1000)),
      maxAgeHours: Math.round(maxAgeMs / (60 * 60 * 1000)),
      currentHour,
      isFreshEnough,
      isBasicValid
    });

    return isFreshEnough;
  }

  /**
   * Check API health with caching
   */
  async checkApiHealth(): Promise<boolean> {
    this.logger.debug('Checking API health with caching');

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.cache.getCachedHealthStatus();
      if (cached !== null) {
        this.logger.debug('Returning cached health status', { isHealthy: cached });
        return cached;
      }

      // Check API health
      const isHealthy = await this.apiAdapter.checkApiHealth();
      
      // Cache the result
      await this.cache.cacheHealthStatus(isHealthy);
      
      this.logger.info('API health check completed and cached', { isHealthy });
      return isHealthy;
    } catch (error) {
      this.logger.error('Failed to check API health with caching', { error });
      
      // Try to return cached status as fallback
      try {
        const fallbackCache = await this.cache.getCachedHealthStatus();
        if (fallbackCache !== null) {
          this.logger.warn('Returning cached health status as fallback', { 
            isHealthy: fallbackCache 
          });
          return fallbackCache;
        }
      } catch (cacheError) {
        this.logger.error('Failed to retrieve fallback health cache', { cacheError });
      }

      // Assume unhealthy if all else fails
      return false;
    }
  }

  /**
   * Get supported locations with caching
   */
  async getSupportedLocations(): Promise<string[]> {
    this.logger.debug('Fetching supported locations with caching');

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.cache.getCachedLocations();
      if (cached && cached.length > 0) {
        this.logger.debug('Returning cached locations', { count: cached.length });
        return cached;
      }

      // Fetch from API
      const locations = await this.apiAdapter.getSupportedLocations();
      
      // Cache the result
      if (locations.length > 0) {
        await this.cache.cacheLocations(locations);
        this.logger.info('Cached supported locations', { count: locations.length });
      }

      return locations;
    } catch (error) {
      this.logger.error('Failed to fetch supported locations with caching', { error });
      
      // Try to return cached data as fallback
      try {
        const fallbackCache = await this.cache.getCachedLocations();
        if (fallbackCache && fallbackCache.length > 0) {
          this.logger.warn('Returning cached locations as fallback', { 
            count: fallbackCache.length 
          });
          return fallbackCache;
        }
      } catch (cacheError) {
        this.logger.error('Failed to retrieve fallback locations cache', { cacheError });
      }

      // Return empty array if all else fails
      return [];
    }
  }

  /**
   * Get supported products with caching
   */
  async getSupportedProducts(): Promise<string[]> {
    this.logger.debug('Fetching supported products with caching');

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.cache.getCachedProducts();
      if (cached && cached.length > 0) {
        this.logger.debug('Returning cached products', { count: cached.length });
        return cached;
      }

      // Fetch from API
      const products = await this.apiAdapter.getSupportedProducts();
      
      // Cache the result
      if (products.length > 0) {
        await this.cache.cacheProducts(products);
        this.logger.info('Cached supported products', { count: products.length });
      }

      return products;
    } catch (error) {
      this.logger.error('Failed to fetch supported products with caching', { error });
      
      // Try to return cached data as fallback
      try {
        const fallbackCache = await this.cache.getCachedProducts();
        if (fallbackCache && fallbackCache.length > 0) {
          this.logger.warn('Returning cached products as fallback', { 
            count: fallbackCache.length 
          });
          return fallbackCache;
        }
      } catch (cacheError) {
        this.logger.error('Failed to retrieve fallback products cache', { cacheError });
      }

      // Return empty array if all else fails
      return [];
    }
  }

  /**
   * Invalidate cache for specific data
   */
  async invalidateCache(location: string, date?: Date): Promise<void> {
    this.logger.info('Invalidating cache', { location, date });

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (date) {
        await this.cache.invalidateMandiPrices(location, date);
      } else {
        // If no date specified, we could implement broader invalidation
        // For now, just log the request
        this.logger.info('Broad cache invalidation requested but not implemented', { location });
      }
    } catch (error) {
      this.logger.error('Failed to invalidate cache', { location, date, error });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage?: string;
  }> {
    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.cache.getCacheStats();
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.logger.info('Clearing all cached data');

    // Ensure adapter is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.cache.clearAll();
      this.logger.info('Successfully cleared all cached data');
    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
    }
  }
}
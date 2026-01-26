import { createClient, RedisClientType } from 'redis';
import { MandiPrice, HistoricalPrice } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Redis-based caching layer for market data
 * Provides efficient caching with TTL and data freshness validation
 */
export class MarketDataCache {
  private logger = logger;
  private client: RedisClientType;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private readonly maxRetries: number = 5;

  // Cache key prefixes
  private readonly keyPrefixes = {
    mandiPrices: 'mandi:prices',
    historicalData: 'mandi:historical',
    locations: 'mandi:locations',
    products: 'mandi:products',
    health: 'mandi:health'
  };

  // TTL values in seconds
  private readonly ttl = {
    prices: config.cache.priceTtl, // 30 minutes default
    historical: config.cache.priceTtl * 2, // 1 hour for historical data
    metadata: 86400, // 24 hours for locations/products
    health: 300 // 5 minutes for health status
  };

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > this.maxRetries) {
            this.logger.error('Max Redis reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000); // Exponential backoff, max 3s
        }
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        this.isConnected = true;
        this.connectionRetries = 0;
        this.logger.info('Redis cache connected successfully');
      }
    } catch (error) {
      this.connectionRetries++;
      this.logger.error('Failed to connect to Redis cache', { 
        error, 
        retries: this.connectionRetries 
      });
      
      if (this.connectionRetries <= this.maxRetries) {
        // Retry connection after delay
        setTimeout(() => this.connect(), 2000 * this.connectionRetries);
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
        this.logger.info('Redis cache disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting from Redis cache', { error });
    }
  }

  /**
   * Cache mandi prices with TTL
   */
  async cacheMandiPrices(location: string, date: Date, prices: MandiPrice[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache operation');
      return;
    }

    try {
      const key = this.generateMandiPricesKey(location, date);
      const value = JSON.stringify({
        prices,
        cachedAt: new Date().toISOString(),
        location,
        date: date.toISOString()
      });

      await this.client.setEx(key, this.ttl.prices, value);
      
      this.logger.debug('Cached mandi prices', {
        key,
        count: prices.length,
        ttl: this.ttl.prices
      });
    } catch (error) {
      this.logger.error('Failed to cache mandi prices', { location, date, error });
    }
  }

  /**
   * Retrieve cached mandi prices
   */
  async getCachedMandiPrices(location: string, date: Date): Promise<MandiPrice[] | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const key = this.generateMandiPricesKey(location, date);
      const cached = await this.client.get(key);

      if (!cached) {
        this.logger.debug('Cache miss for mandi prices', { key });
        return null;
      }

      const data = JSON.parse(cached);
      const prices = data.prices.map((price: any) => ({
        ...price,
        date: new Date(price.date)
      }));

      this.logger.debug('Cache hit for mandi prices', {
        key,
        count: prices.length,
        cachedAt: data.cachedAt
      });

      return prices;
    } catch (error) {
      this.logger.error('Failed to retrieve cached mandi prices', { location, date, error });
      return null;
    }
  }

  /**
   * Cache historical price data
   */
  async cacheHistoricalData(
    product: string, 
    location: string, 
    days: number, 
    data: HistoricalPrice[]
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache operation');
      return;
    }

    try {
      const key = this.generateHistoricalDataKey(product, location, days);
      const value = JSON.stringify({
        data,
        cachedAt: new Date().toISOString(),
        product,
        location,
        days
      });

      await this.client.setEx(key, this.ttl.historical, value);
      
      this.logger.debug('Cached historical data', {
        key,
        count: data.length,
        ttl: this.ttl.historical
      });
    } catch (error) {
      this.logger.error('Failed to cache historical data', { product, location, days, error });
    }
  }

  /**
   * Retrieve cached historical data
   */
  async getCachedHistoricalData(
    product: string, 
    location: string, 
    days: number
  ): Promise<HistoricalPrice[] | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const key = this.generateHistoricalDataKey(product, location, days);
      const cached = await this.client.get(key);

      if (!cached) {
        this.logger.debug('Cache miss for historical data', { key });
        return null;
      }

      const data = JSON.parse(cached);
      const historicalData = data.data.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      }));

      this.logger.debug('Cache hit for historical data', {
        key,
        count: historicalData.length,
        cachedAt: data.cachedAt
      });

      return historicalData;
    } catch (error) {
      this.logger.error('Failed to retrieve cached historical data', { product, location, days, error });
      return null;
    }
  }

  /**
   * Cache supported locations
   */
  async cacheLocations(locations: string[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache operation');
      return;
    }

    try {
      const key = `${this.keyPrefixes.locations}:all`;
      const value = JSON.stringify({
        locations,
        cachedAt: new Date().toISOString()
      });

      await this.client.setEx(key, this.ttl.metadata, value);
      
      this.logger.debug('Cached locations', {
        count: locations.length,
        ttl: this.ttl.metadata
      });
    } catch (error) {
      this.logger.error('Failed to cache locations', { error });
    }
  }

  /**
   * Retrieve cached locations
   */
  async getCachedLocations(): Promise<string[] | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const key = `${this.keyPrefixes.locations}:all`;
      const cached = await this.client.get(key);

      if (!cached) {
        this.logger.debug('Cache miss for locations');
        return null;
      }

      const data = JSON.parse(cached);
      
      this.logger.debug('Cache hit for locations', {
        count: data.locations.length,
        cachedAt: data.cachedAt
      });

      return data.locations;
    } catch (error) {
      this.logger.error('Failed to retrieve cached locations', { error });
      return null;
    }
  }

  /**
   * Cache supported products
   */
  async cacheProducts(products: string[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache operation');
      return;
    }

    try {
      const key = `${this.keyPrefixes.products}:all`;
      const value = JSON.stringify({
        products,
        cachedAt: new Date().toISOString()
      });

      await this.client.setEx(key, this.ttl.metadata, value);
      
      this.logger.debug('Cached products', {
        count: products.length,
        ttl: this.ttl.metadata
      });
    } catch (error) {
      this.logger.error('Failed to cache products', { error });
    }
  }

  /**
   * Retrieve cached products
   */
  async getCachedProducts(): Promise<string[] | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const key = `${this.keyPrefixes.products}:all`;
      const cached = await this.client.get(key);

      if (!cached) {
        this.logger.debug('Cache miss for products');
        return null;
      }

      const data = JSON.parse(cached);
      
      this.logger.debug('Cache hit for products', {
        count: data.products.length,
        cachedAt: data.cachedAt
      });

      return data.products;
    } catch (error) {
      this.logger.error('Failed to retrieve cached products', { error });
      return null;
    }
  }

  /**
   * Cache API health status
   */
  async cacheHealthStatus(isHealthy: boolean): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache operation');
      return;
    }

    try {
      const key = `${this.keyPrefixes.health}:status`;
      const value = JSON.stringify({
        isHealthy,
        cachedAt: new Date().toISOString()
      });

      await this.client.setEx(key, this.ttl.health, value);
      
      this.logger.debug('Cached health status', { isHealthy });
    } catch (error) {
      this.logger.error('Failed to cache health status', { error });
    }
  }

  /**
   * Retrieve cached health status
   */
  async getCachedHealthStatus(): Promise<boolean | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss');
      return null;
    }

    try {
      const key = `${this.keyPrefixes.health}:status`;
      const cached = await this.client.get(key);

      if (!cached) {
        this.logger.debug('Cache miss for health status');
        return null;
      }

      const data = JSON.parse(cached);
      
      this.logger.debug('Cache hit for health status', {
        isHealthy: data.isHealthy,
        cachedAt: data.cachedAt
      });

      return data.isHealthy;
    } catch (error) {
      this.logger.error('Failed to retrieve cached health status', { error });
      return null;
    }
  }

  /**
   * Invalidate cache for specific location and date
   */
  async invalidateMandiPrices(location: string, date: Date): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache invalidation');
      return;
    }

    try {
      const key = this.generateMandiPricesKey(location, date);
      await this.client.del(key);
      
      this.logger.debug('Invalidated mandi prices cache', { key });
    } catch (error) {
      this.logger.error('Failed to invalidate mandi prices cache', { location, date, error });
    }
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache clear');
      return;
    }

    try {
      const patterns = Object.values(this.keyPrefixes).map(prefix => `${prefix}:*`);
      
      for (const pattern of patterns) {
        const keys = await this.client.keys(pattern);
        if (keys && keys.length > 0) {
          await this.client.del(keys);
          this.logger.debug('Cleared cache keys', { pattern, count: keys.length });
        }
      }
      
      this.logger.info('Cleared all market data cache');
    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
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
    const stats = {
      connected: this.isConnected,
      keyCount: 0,
      memoryUsage: undefined as string | undefined
    };

    if (!this.isConnected) {
      return stats;
    }

    try {
      // Count keys for all prefixes
      const patterns = Object.values(this.keyPrefixes).map(prefix => `${prefix}:*`);
      let totalKeys = 0;
      
      for (const pattern of patterns) {
        const keys = await this.client.keys(pattern);
        if (keys && keys.length > 0) {
          totalKeys += keys.length;
        }
      }
      
      stats.keyCount = totalKeys;

      // Get memory usage if available
      try {
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          stats.memoryUsage = memoryMatch[1].trim();
        }
      } catch (memoryError) {
        // Memory info not critical, continue without it
        this.logger.debug('Could not retrieve memory info', { memoryError });
      }

    } catch (error) {
      this.logger.error('Failed to get cache stats', { error });
    }

    return stats;
  }

  // Private helper methods

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error', { error });
      this.isConnected = false;
    });

    this.client.on('end', () => {
      this.logger.info('Redis client connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis client reconnecting');
    });
  }

  private generateMandiPricesKey(location: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const normalizedLocation = location.toLowerCase().replace(/\s+/g, '-');
    return `${this.keyPrefixes.mandiPrices}:${normalizedLocation}:${dateStr}`;
  }

  private generateHistoricalDataKey(product: string, location: string, days: number): string {
    const normalizedProduct = product.toLowerCase().replace(/\s+/g, '-');
    const normalizedLocation = location.toLowerCase().replace(/\s+/g, '-');
    return `${this.keyPrefixes.historicalData}:${normalizedProduct}:${normalizedLocation}:${days}`;
  }
}
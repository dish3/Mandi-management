import { MarketDataCache } from '../../../services/price-discovery/market-data-cache';
import { MandiPrice, HistoricalPrice } from '../../../types';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis');
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  info: jest.fn(),
  on: jest.fn()
};

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
mockedCreateClient.mockReturnValue(mockRedisClient as any);

describe('MarketDataCache', () => {
  let cache: MarketDataCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new MarketDataCache();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await cache.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await cache.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      // Should not throw, but log error
    });

    it('should not connect if already connected', async () => {
      // First connection
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();

      // Reset mock
      mockRedisClient.connect.mockClear();

      // Second connection attempt
      await cache.connect();

      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('cacheMandiPrices', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should cache mandi prices successfully', async () => {
      const prices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date('2024-01-15'),
          source: 'government_api',
          verified: true
        }
      ];

      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.cacheMandiPrices('Delhi', new Date('2024-01-15'), prices);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'mandi:prices:delhi:2024-01-15',
        expect.any(Number),
        expect.stringContaining('Onion')
      );
    });

    it('should handle caching errors gracefully', async () => {
      const prices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date('2024-01-15'),
          source: 'government_api',
          verified: true
        }
      ];

      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(cache.cacheMandiPrices('Delhi', new Date('2024-01-15'), prices))
        .resolves.not.toThrow();
    });
  });

  describe('getCachedMandiPrices', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should retrieve cached mandi prices successfully', async () => {
      const cachedData = {
        prices: [
          {
            product: 'Onion',
            location: 'Delhi',
            price: 25.50,
            date: '2024-01-15T00:00:00.000Z',
            source: 'government_api',
            verified: true
          }
        ],
        cachedAt: '2024-01-15T10:00:00.000Z',
        location: 'Delhi',
        date: '2024-01-15T00:00:00.000Z'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cache.getCachedMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toHaveLength(1);
      expect(result![0].product).toBe('Onion');
      expect(result![0].price).toBe(25.50);
      expect(result![0].date).toBeInstanceOf(Date);
    });

    it('should return null for cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.getCachedMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cache.getCachedMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await cache.getCachedMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toBeNull();
    });
  });

  describe('cacheHistoricalData', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should cache historical data successfully', async () => {
      const data: HistoricalPrice[] = [
        {
          date: new Date('2024-01-10'),
          price: 25.50,
          volume: 100,
          location: 'Delhi'
        }
      ];

      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.cacheHistoricalData('Onion', 'Delhi', 7, data);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'mandi:historical:onion:delhi:7',
        expect.any(Number),
        expect.stringContaining('25.5')
      );
    });
  });

  describe('getCachedHistoricalData', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should retrieve cached historical data successfully', async () => {
      const cachedData = {
        data: [
          {
            date: '2024-01-10T00:00:00.000Z',
            price: 25.50,
            volume: 100,
            location: 'Delhi'
          }
        ],
        cachedAt: '2024-01-15T10:00:00.000Z',
        product: 'Onion',
        location: 'Delhi',
        days: 7
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cache.getCachedHistoricalData('Onion', 'Delhi', 7);

      expect(result).toHaveLength(1);
      expect(result![0].price).toBe(25.50);
      expect(result![0].volume).toBe(100);
      expect(result![0].date).toBeInstanceOf(Date);
    });
  });

  describe('cacheLocations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should cache locations successfully', async () => {
      const locations = ['Delhi', 'Mumbai', 'Bangalore'];

      mockRedisClient.setEx.mockResolvedValue('OK');

      await cache.cacheLocations(locations);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'mandi:locations:all',
        86400, // 24 hours TTL
        expect.stringContaining('Delhi')
      );
    });
  });

  describe('getCachedLocations', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should retrieve cached locations successfully', async () => {
      const cachedData = {
        locations: ['Delhi', 'Mumbai', 'Bangalore'],
        cachedAt: '2024-01-15T10:00:00.000Z'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cache.getCachedLocations();

      expect(result).toEqual(['Delhi', 'Mumbai', 'Bangalore']);
    });
  });

  describe('invalidateMandiPrices', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should invalidate cache successfully', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cache.invalidateMandiPrices('Delhi', new Date('2024-01-15'));

      expect(mockRedisClient.del).toHaveBeenCalledWith('mandi:prices:delhi:2024-01-15');
    });
  });

  describe('clearAll', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();
    });

    it('should clear all cache data successfully', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['mandi:prices:key1', 'mandi:prices:key2'])
        .mockResolvedValueOnce(['mandi:historical:key1'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockRedisClient.del.mockResolvedValue(2);

      await cache.clearAll();

      expect(mockRedisClient.keys).toHaveBeenCalledTimes(5);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return stats when not connected', async () => {
      const stats = await cache.getCacheStats();

      expect(stats).toEqual({
        connected: false,
        keyCount: 0,
        memoryUsage: undefined
      });
    });

    it('should return stats when connected', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      await cache.connect();

      mockRedisClient.keys
        .mockResolvedValueOnce(['key1', 'key2'])
        .mockResolvedValueOnce(['key3'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\nother_info:value');

      const stats = await cache.getCacheStats();

      expect(stats.connected).toBe(true);
      expect(stats.keyCount).toBe(3);
      expect(stats.memoryUsage).toBe('1.5M');
    });
  });

  describe('event handlers', () => {
    it('should setup event handlers on creation', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });
});
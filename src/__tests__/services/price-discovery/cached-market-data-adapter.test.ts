import { CachedMarketDataAdapter } from '../../../services/price-discovery/cached-market-data-adapter';
import { GovernmentMarketDataAdapter } from '../../../services/price-discovery/market-data-adapter';
import { MarketDataCache } from '../../../services/price-discovery/market-data-cache';
import { MandiPrice, HistoricalPrice } from '../../../types';

// Mock the dependencies
jest.mock('../../../services/price-discovery/market-data-adapter');
jest.mock('../../../services/price-discovery/market-data-cache');

const MockedGovernmentAdapter = GovernmentMarketDataAdapter as jest.MockedClass<typeof GovernmentMarketDataAdapter>;
const MockedMarketDataCache = MarketDataCache as jest.MockedClass<typeof MarketDataCache>;

describe('CachedMarketDataAdapter', () => {
  let adapter: CachedMarketDataAdapter;
  let mockApiAdapter: jest.Mocked<GovernmentMarketDataAdapter>;
  let mockCache: jest.Mocked<MarketDataCache>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockApiAdapter = new MockedGovernmentAdapter() as jest.Mocked<GovernmentMarketDataAdapter>;
    mockCache = new MockedMarketDataCache() as jest.Mocked<MarketDataCache>;

    // Setup mock implementations
    mockCache.connect.mockResolvedValue();
    mockCache.disconnect.mockResolvedValue();

    adapter = new CachedMarketDataAdapter();
    
    // Replace the internal instances with our mocks
    (adapter as any).apiAdapter = mockApiAdapter;
    (adapter as any).cache = mockCache;
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize();

      expect(mockCache.connect).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockCache.connect.mockRejectedValue(new Error('Connection failed'));

      // Should not throw
      await expect(adapter.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await adapter.initialize();
      mockCache.connect.mockClear();

      await adapter.initialize();

      expect(mockCache.connect).not.toHaveBeenCalled();
    });
  });

  describe('fetchMandiPrices', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached data when available and fresh', async () => {
      const cachedPrices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date(),
          source: 'government_api',
          verified: true
        }
      ];

      mockCache.getCachedMandiPrices.mockResolvedValue(cachedPrices);
      mockApiAdapter.validateDataFreshness.mockReturnValue(true);

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual(cachedPrices);
      expect(mockApiAdapter.fetchMandiPrices).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is empty', async () => {
      const apiPrices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date(),
          source: 'government_api',
          verified: true
        }
      ];

      mockCache.getCachedMandiPrices.mockResolvedValue(null);
      mockApiAdapter.fetchMandiPrices.mockResolvedValue(apiPrices);
      mockCache.cacheMandiPrices.mockResolvedValue();

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual(apiPrices);
      expect(mockApiAdapter.fetchMandiPrices).toHaveBeenCalled();
      expect(mockCache.cacheMandiPrices).toHaveBeenCalledWith('Delhi', expect.any(Date), apiPrices);
    });

    it('should fetch from API when cached data is stale', async () => {
      const stalePrices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
          source: 'government_api',
          verified: true
        }
      ];

      const freshPrices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 26.00,
          date: new Date(),
          source: 'government_api',
          verified: true
        }
      ];

      mockCache.getCachedMandiPrices.mockResolvedValue(stalePrices);
      mockApiAdapter.validateDataFreshness.mockReturnValue(false);
      mockApiAdapter.fetchMandiPrices.mockResolvedValue(freshPrices);
      mockCache.cacheMandiPrices.mockResolvedValue();

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual(freshPrices);
      expect(mockApiAdapter.fetchMandiPrices).toHaveBeenCalled();
    });

    it('should return stale cache as fallback when API fails', async () => {
      const stalePrices: MandiPrice[] = [
        {
          product: 'Onion',
          location: 'Delhi',
          price: 25.50,
          date: new Date(Date.now() - 25 * 60 * 60 * 1000),
          source: 'government_api',
          verified: true
        }
      ];

      mockCache.getCachedMandiPrices
        .mockResolvedValueOnce(stalePrices) // First call for freshness check
        .mockResolvedValueOnce(stalePrices); // Second call for fallback

      mockApiAdapter.validateDataFreshness.mockReturnValue(false);
      mockApiAdapter.fetchMandiPrices.mockRejectedValue(new Error('API Error'));

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual(stalePrices);
    });

    it('should return empty array when both API and cache fail', async () => {
      mockCache.getCachedMandiPrices.mockResolvedValue(null);
      mockApiAdapter.fetchMandiPrices.mockRejectedValue(new Error('API Error'));

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual([]);
    });
  });

  describe('getHistoricalData', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached historical data when available', async () => {
      const cachedData: HistoricalPrice[] = [
        {
          date: new Date('2024-01-10'),
          price: 25.50,
          volume: 100,
          location: 'Delhi'
        }
      ];

      mockCache.getCachedHistoricalData.mockResolvedValue(cachedData);

      const result = await adapter.getHistoricalData('Onion', 'Delhi', 7);

      expect(result).toEqual(cachedData);
      expect(mockApiAdapter.getHistoricalData).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is empty', async () => {
      const apiData: HistoricalPrice[] = [
        {
          date: new Date('2024-01-10'),
          price: 25.50,
          volume: 100,
          location: 'Delhi'
        }
      ];

      mockCache.getCachedHistoricalData.mockResolvedValue(null);
      mockApiAdapter.getHistoricalData.mockResolvedValue(apiData);
      mockCache.cacheHistoricalData.mockResolvedValue();

      const result = await adapter.getHistoricalData('Onion', 'Delhi', 7);

      expect(result).toEqual(apiData);
      expect(mockApiAdapter.getHistoricalData).toHaveBeenCalledWith('Onion', 'Delhi', 7);
      expect(mockCache.cacheHistoricalData).toHaveBeenCalledWith('Onion', 'Delhi', 7, apiData);
    });
  });

  describe('validateDataFreshness', () => {
    it('should use enhanced freshness validation during market hours', () => {
      const data: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        source: 'government_api',
        verified: true
      };

      mockApiAdapter.validateDataFreshness.mockReturnValue(true);

      // Mock current time to be during market hours (10 AM)
      const mockDate = new Date();
      mockDate.setHours(10, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = adapter.validateDataFreshness(data);

      expect(result).toBe(true);
      expect(mockApiAdapter.validateDataFreshness).toHaveBeenCalledWith(data);

      // Restore Date
      (global.Date as any).mockRestore();
    });

    it('should reject data that fails basic validation', () => {
      const data: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(),
        source: 'government_api',
        verified: false
      };

      mockApiAdapter.validateDataFreshness.mockReturnValue(false);

      const result = adapter.validateDataFreshness(data);

      expect(result).toBe(false);
    });
  });

  describe('checkApiHealth', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached health status when available', async () => {
      mockCache.getCachedHealthStatus.mockResolvedValue(true);

      const result = await adapter.checkApiHealth();

      expect(result).toBe(true);
      expect(mockApiAdapter.checkApiHealth).not.toHaveBeenCalled();
    });

    it('should check API and cache result when cache is empty', async () => {
      mockCache.getCachedHealthStatus.mockResolvedValue(null);
      mockApiAdapter.checkApiHealth.mockResolvedValue(true);
      mockCache.cacheHealthStatus.mockResolvedValue();

      const result = await adapter.checkApiHealth();

      expect(result).toBe(true);
      expect(mockApiAdapter.checkApiHealth).toHaveBeenCalled();
      expect(mockCache.cacheHealthStatus).toHaveBeenCalledWith(true);
    });

    it('should return cached status as fallback when API check fails', async () => {
      mockCache.getCachedHealthStatus
        .mockResolvedValueOnce(null) // First call
        .mockResolvedValueOnce(false); // Fallback call

      mockApiAdapter.checkApiHealth.mockRejectedValue(new Error('API Error'));

      const result = await adapter.checkApiHealth();

      expect(result).toBe(false);
    });
  });

  describe('getSupportedLocations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached locations when available', async () => {
      const cachedLocations = ['Delhi', 'Mumbai', 'Bangalore'];

      mockCache.getCachedLocations.mockResolvedValue(cachedLocations);

      const result = await adapter.getSupportedLocations();

      expect(result).toEqual(cachedLocations);
      expect(mockApiAdapter.getSupportedLocations).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache when cache is empty', async () => {
      const apiLocations = ['Delhi', 'Mumbai', 'Bangalore'];

      mockCache.getCachedLocations.mockResolvedValue(null);
      mockApiAdapter.getSupportedLocations.mockResolvedValue(apiLocations);
      mockCache.cacheLocations.mockResolvedValue();

      const result = await adapter.getSupportedLocations();

      expect(result).toEqual(apiLocations);
      expect(mockApiAdapter.getSupportedLocations).toHaveBeenCalled();
      expect(mockCache.cacheLocations).toHaveBeenCalledWith(apiLocations);
    });
  });

  describe('getSupportedProducts', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached products when available', async () => {
      const cachedProducts = ['Onion', 'Potato', 'Tomato'];

      mockCache.getCachedProducts.mockResolvedValue(cachedProducts);

      const result = await adapter.getSupportedProducts();

      expect(result).toEqual(cachedProducts);
      expect(mockApiAdapter.getSupportedProducts).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache when cache is empty', async () => {
      const apiProducts = ['Onion', 'Potato', 'Tomato'];

      mockCache.getCachedProducts.mockResolvedValue(null);
      mockApiAdapter.getSupportedProducts.mockResolvedValue(apiProducts);
      mockCache.cacheProducts.mockResolvedValue();

      const result = await adapter.getSupportedProducts();

      expect(result).toEqual(apiProducts);
      expect(mockApiAdapter.getSupportedProducts).toHaveBeenCalled();
      expect(mockCache.cacheProducts).toHaveBeenCalledWith(apiProducts);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should invalidate cache for specific location and date', async () => {
      mockCache.invalidateMandiPrices.mockResolvedValue();

      await adapter.invalidateCache('Delhi', new Date('2024-01-15'));

      expect(mockCache.invalidateMandiPrices).toHaveBeenCalledWith('Delhi', new Date('2024-01-15'));
    });

    it('should get cache statistics', async () => {
      const mockStats = {
        connected: true,
        keyCount: 10,
        memoryUsage: '1.5M'
      };

      mockCache.getCacheStats.mockResolvedValue(mockStats);

      const result = await adapter.getCacheStats();

      expect(result).toEqual(mockStats);
    });

    it('should clear all cached data', async () => {
      mockCache.clearAll.mockResolvedValue();

      await adapter.clearCache();

      expect(mockCache.clearAll).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await adapter.initialize();
      mockCache.disconnect.mockResolvedValue();

      await adapter.cleanup();

      expect(mockCache.disconnect).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      await adapter.initialize();
      mockCache.disconnect.mockRejectedValue(new Error('Cleanup error'));

      // Should not throw
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });
});
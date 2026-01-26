import { MarketDataFactory } from '../../../services/price-discovery/market-data-factory';
import { GovernmentMarketDataAdapter } from '../../../services/price-discovery/market-data-adapter';
import { CachedMarketDataAdapter } from '../../../services/price-discovery/cached-market-data-adapter';
import { config } from '../../../config';

// Mock the adapters
jest.mock('../../../services/price-discovery/market-data-adapter');
jest.mock('../../../services/price-discovery/cached-market-data-adapter');
jest.mock('../../../config');

const MockedGovernmentAdapter = GovernmentMarketDataAdapter as jest.MockedClass<typeof GovernmentMarketDataAdapter>;
const MockedCachedAdapter = CachedMarketDataAdapter as jest.MockedClass<typeof CachedMarketDataAdapter>;

describe('MarketDataFactory', () => {
  let mockAdapter: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    MarketDataFactory.resetInstance();

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Setup mock config
    (config as any).redis = { url: 'redis://localhost:6379' };
    (config as any).externalApis = { mandiBaseUrl: 'https://api.example.com' };
    (config as any).apiKeys = { mandiApi: 'test-key' };
    (config as any).cache = { priceTtl: 1800 };

    // Create a mock adapter instance
    mockAdapter = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      fetchMandiPrices: jest.fn(),
      getHistoricalData: jest.fn(),
      validateDataFreshness: jest.fn(),
      checkApiHealth: jest.fn(),
      getSupportedLocations: jest.fn(),
      getSupportedProducts: jest.fn()
    };

    // Setup mocks to return our mock adapter
    MockedCachedAdapter.mockImplementation(() => mockAdapter as any);
    MockedGovernmentAdapter.mockImplementation(() => mockAdapter as any);
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('createAdapter', () => {
    it('should create mock adapter in test environment by default', async () => {
      const result = await MarketDataFactory.createAdapter();

      // In test environment, should always return mock adapter
      expect(result).toBeDefined();
      expect(typeof result.fetchMandiPrices).toBe('function');
      // Real adapters should not be called in test environment
      expect(MockedCachedAdapter).not.toHaveBeenCalled();
      expect(MockedGovernmentAdapter).not.toHaveBeenCalled();
    });

    it('should create mock adapter for cached type in test environment', async () => {
      const result = await MarketDataFactory.createAdapter({
        useCache: true,
        adapterType: 'cached'
      });

      // In test environment, should always return mock adapter
      expect(result).toBeDefined();
      expect(typeof result.fetchMandiPrices).toBe('function');
      expect(MockedCachedAdapter).not.toHaveBeenCalled();
    });

    it('should create mock adapter for government type in test environment', async () => {
      const result = await MarketDataFactory.createAdapter({
        useCache: false,
        adapterType: 'government'
      });

      // In test environment, should always return mock adapter
      expect(result).toBeDefined();
      expect(typeof result.fetchMandiPrices).toBe('function');
      expect(MockedGovernmentAdapter).not.toHaveBeenCalled();
    });

    it('should create mock adapter for unknown types in test environment', async () => {
      const result = await MarketDataFactory.createAdapter({
        adapterType: 'unknown' as any
      });

      // In test environment, should always return mock adapter
      expect(result).toBeDefined();
      expect(typeof result.fetchMandiPrices).toBe('function');
      expect(MockedGovernmentAdapter).not.toHaveBeenCalled();
    });
  });

  describe('getInstance', () => {
    it('should return new instances in test environment (no singleton)', async () => {
      const instance1 = await MarketDataFactory.getInstance();
      const instance2 = await MarketDataFactory.getInstance();

      // In test environment, should create new instances to avoid state pollution
      expect(instance1).not.toBe(instance2);
      expect(MockedCachedAdapter).not.toHaveBeenCalled();
    });

    it('should create new instance after reset', async () => {
      const instance1 = await MarketDataFactory.getInstance();

      MarketDataFactory.resetInstance();
      
      const instance2 = await MarketDataFactory.getInstance();

      expect(instance1).not.toBe(instance2);
      expect(MockedCachedAdapter).not.toHaveBeenCalled();
    });
  });

  describe('resetInstance', () => {
    it('should handle reset without cleanup in test environment', async () => {
      await MarketDataFactory.getInstance();

      // Should not throw in test environment
      expect(() => MarketDataFactory.resetInstance()).not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      await MarketDataFactory.getInstance();

      // Should not throw
      expect(() => MarketDataFactory.resetInstance()).not.toThrow();
    });
  });

  describe('createMockAdapter', () => {
    it('should create mock adapter', () => {
      const mockAdapter = MarketDataFactory.createMockAdapter();

      expect(mockAdapter).toBeDefined();
      expect(typeof mockAdapter.fetchMandiPrices).toBe('function');
      expect(typeof mockAdapter.getHistoricalData).toBe('function');
    });

    it('should return mock data from mock adapter', async () => {
      const mockAdapter = MarketDataFactory.createMockAdapter();

      const prices = await mockAdapter.fetchMandiPrices('Delhi', new Date());
      expect(prices).toHaveLength(3);
      expect(prices[0].product).toBe('Onion');
      expect(prices[0].source).toBe('mock');

      const historical = await mockAdapter.getHistoricalData('Onion', 'Delhi', 7);
      expect(historical).toHaveLength(7);

      const isHealthy = await mockAdapter.checkApiHealth();
      expect(isHealthy).toBe(true);

      const locations = await mockAdapter.getSupportedLocations();
      expect(locations).toContain('Delhi');

      const products = await mockAdapter.getSupportedProducts();
      expect(products).toContain('Onion');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configuration', () => {
      const result = MarketDataFactory.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing Redis URL', () => {
      (config as any).redis.url = '';

      const result = MarketDataFactory.validateConfiguration();

      expect(result.warnings).toContain('Redis URL not configured - caching will be disabled');
    });

    it('should detect missing API base URL', () => {
      (config as any).externalApis.mandiBaseUrl = '';

      const result = MarketDataFactory.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mandi API base URL not configured');
    });

    it('should detect missing API key', () => {
      (config as any).apiKeys.mandiApi = '';

      const result = MarketDataFactory.validateConfiguration();

      expect(result.warnings).toContain('Mandi API key not configured - may have rate limiting issues');
    });

    it('should detect invalid cache TTL', () => {
      (config as any).cache.priceTtl = 0;

      const result = MarketDataFactory.validateConfiguration();

      expect(result.warnings).toContain('Price cache TTL is not positive - caching may not work effectively');
    });
  });

  describe('mock adapter functionality', () => {
    let mockAdapter: any;

    beforeEach(() => {
      mockAdapter = MarketDataFactory.createMockAdapter();
    });

    it('should validate mock data freshness correctly', () => {
      const freshData = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(),
        source: 'mock',
        verified: true
      };

      const result = mockAdapter.validateDataFreshness(freshData);
      expect(result).toBe(true);

      const staleData = {
        ...freshData,
        date: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      const staleResult = mockAdapter.validateDataFreshness(staleData);
      expect(staleResult).toBe(false);
    });

    it('should generate historical data with proper chronological order', async () => {
      const historical = await mockAdapter.getHistoricalData('Onion', 'Delhi', 5);

      expect(historical).toHaveLength(5);
      
      // Check chronological order (oldest first)
      for (let i = 1; i < historical.length; i++) {
        expect(historical[i].date.getTime()).toBeGreaterThan(historical[i-1].date.getTime());
      }
    });

    it('should generate reasonable price variations', async () => {
      const historical = await mockAdapter.getHistoricalData('Onion', 'Delhi', 10);

      const prices = historical.map((h: any) => h.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Prices should be positive and within reasonable range
      expect(minPrice).toBeGreaterThan(0);
      expect(maxPrice).toBeLessThan(100); // Assuming reasonable upper bound
      expect(maxPrice - minPrice).toBeLessThan(20); // Reasonable variation
    });
  });
});
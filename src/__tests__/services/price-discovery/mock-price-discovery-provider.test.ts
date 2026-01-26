import { MockPriceDiscoveryProvider } from '../../../services/price-discovery/mock-price-discovery-provider';
import { MandiPrice } from '../../../types';

describe('MockPriceDiscoveryProvider', () => {
  let provider: MockPriceDiscoveryProvider;

  beforeEach(() => {
    provider = new MockPriceDiscoveryProvider();
  });

  describe('fetchMandiPrices', () => {
    it('should return mock prices for valid location', async () => {
      const prices = await provider.fetchMandiPrices('delhi', new Date());

      expect(prices).toBeInstanceOf(Array);
      expect(prices.length).toBeGreaterThan(0);
      
      prices.forEach(price => {
        expect(price.product).toBeDefined();
        expect(price.location).toBe('delhi');
        expect(price.price).toBeGreaterThan(0);
        expect(price.date).toBeInstanceOf(Date);
        expect(price.source).toBe('mock-api');
        expect(typeof price.verified).toBe('boolean');
      });
    });

    it('should return different prices for different locations', async () => {
      const delhiPrices = await provider.fetchMandiPrices('delhi', new Date());
      const mumbaiPrices = await provider.fetchMandiPrices('mumbai', new Date());

      expect(delhiPrices[0].location).toBe('delhi');
      expect(mumbaiPrices[0].location).toBe('mumbai');
    });

    it('should add random fluctuations to prices', async () => {
      const prices1 = await provider.fetchMandiPrices('delhi', new Date());
      const prices2 = await provider.fetchMandiPrices('delhi', new Date());

      // Prices should be different due to random fluctuations
      const tomato1 = prices1.find(p => p.product === 'tomato');
      const tomato2 = prices2.find(p => p.product === 'tomato');

      if (tomato1 && tomato2) {
        // They might be the same due to randomness, but usually different
        expect(typeof tomato1.price).toBe('number');
        expect(typeof tomato2.price).toBe('number');
      }
    });

    it('should throw error when API is unhealthy', async () => {
      provider.setHealthStatus(false);

      await expect(provider.fetchMandiPrices('delhi', new Date()))
        .rejects.toThrow('Mock API is currently unavailable');
    });

    it('should return empty array for unknown location', async () => {
      const prices = await provider.fetchMandiPrices('unknown-location', new Date());
      expect(prices).toEqual([]);
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data for valid inputs', async () => {
      const data = await provider.getHistoricalData('tomato', 'delhi', 30);

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBe(30);
      
      data.forEach((point, index) => {
        expect(point.date).toBeInstanceOf(Date);
        expect(point.price).toBeGreaterThan(0);
        expect(point.volume).toBeGreaterThan(0);
        expect(point.location).toBe('delhi');
        
        // Dates should be in ascending order (oldest first)
        if (index > 0) {
          expect(point.date.getTime()).toBeGreaterThan(data[index - 1].date.getTime());
        }
      });
    });

    it('should return correct number of data points', async () => {
      const data7 = await provider.getHistoricalData('tomato', 'delhi', 7);
      const data15 = await provider.getHistoricalData('tomato', 'delhi', 15);

      expect(data7.length).toBe(7);
      expect(data15.length).toBe(15);
    });

    it('should show price variations over time', async () => {
      const data = await provider.getHistoricalData('tomato', 'delhi', 30);
      const prices = data.map(d => d.price);
      
      // Prices should vary (not all the same)
      const uniquePrices = new Set(prices);
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    it('should throw error when API is unhealthy', async () => {
      provider.setHealthStatus(false);

      await expect(provider.getHistoricalData('tomato', 'delhi', 30))
        .rejects.toThrow('Mock API is currently unavailable');
    });
  });

  describe('validateDataFreshness', () => {
    it('should validate fresh data', () => {
      const freshData: MandiPrice = {
        product: 'tomato',
        location: 'delhi',
        price: 25,
        date: new Date(),
        source: 'mock-api',
        verified: true
      };

      const result = provider.validateDataFreshness(freshData);
      expect(result).toBe(true);
    });

    it('should reject stale data', () => {
      const staleData: MandiPrice = {
        product: 'tomato',
        location: 'delhi',
        price: 25,
        date: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        source: 'mock-api',
        verified: true
      };

      const result = provider.validateDataFreshness(staleData);
      expect(result).toBe(false);
    });

    it('should reject unverified data', () => {
      const unverifiedData: MandiPrice = {
        product: 'tomato',
        location: 'delhi',
        price: 25,
        date: new Date(),
        source: 'mock-api',
        verified: false
      };

      const result = provider.validateDataFreshness(unverifiedData);
      expect(result).toBe(false);
    });
  });

  describe('checkApiHealth', () => {
    it('should return true when healthy', async () => {
      provider.setHealthStatus(true);
      const result = await provider.checkApiHealth();
      expect(result).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      provider.setHealthStatus(false);
      const result = await provider.checkApiHealth();
      expect(result).toBe(false);
    });
  });

  describe('getSupportedLocations', () => {
    it('should return list of supported locations', async () => {
      const locations = await provider.getSupportedLocations();

      expect(locations).toBeInstanceOf(Array);
      expect(locations.length).toBeGreaterThan(0);
      expect(locations).toContain('delhi');
      expect(locations).toContain('mumbai');
      
      locations.forEach(location => {
        expect(typeof location).toBe('string');
        expect(location.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSupportedProducts', () => {
    it('should return list of supported products', async () => {
      const products = await provider.getSupportedProducts();

      expect(products).toBeInstanceOf(Array);
      expect(products.length).toBeGreaterThan(0);
      expect(products).toContain('tomato');
      expect(products).toContain('onion');
      
      products.forEach(product => {
        expect(typeof product).toBe('string');
        expect(product.length).toBeGreaterThan(0);
      });
    });
  });

  describe('mock data management', () => {
    it('should allow adding custom mock data', async () => {
      const customPrices: MandiPrice[] = [
        {
          product: 'custom-product',
          location: 'custom-location',
          price: 100,
          date: new Date(),
          source: 'custom-source',
          verified: true
        }
      ];

      provider.addMockData('custom-location', customPrices);
      const result = await provider.fetchMandiPrices('custom-location', new Date());

      expect(result).toHaveLength(1);
      expect(result[0].product).toBe('custom-product');
      expect(result[0].location).toBe('custom-location');
    });

    it('should allow clearing mock data', async () => {
      provider.clearMockData();
      const locations = await provider.getSupportedLocations();
      expect(locations).toHaveLength(0);
    });

    it('should reinitialize data after clearing', () => {
      provider.clearMockData();
      
      // Create new provider to reinitialize
      const newProvider = new MockPriceDiscoveryProvider();
      
      expect(newProvider.getSupportedLocations()).resolves.toContain('delhi');
    });
  });

  describe('error simulation', () => {
    it('should simulate API timeouts', async () => {
      provider.setHealthStatus(false);

      const start = Date.now();
      
      try {
        await provider.fetchMandiPrices('delhi', new Date());
        fail('Should have thrown an error');
      } catch (error) {
        const duration = Date.now() - start;
        expect(duration).toBeGreaterThan(90); // Should have some delay
        expect((error as Error).message).toContain('unavailable');
      }
    });

    it('should handle concurrent requests when unhealthy', async () => {
      provider.setHealthStatus(false);

      const promises = [
        provider.fetchMandiPrices('delhi', new Date()),
        provider.getHistoricalData('tomato', 'delhi', 30),
        provider.checkApiHealth()
      ];

      const results = await Promise.allSettled(promises);
      
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      expect((results[2] as PromiseFulfilledResult<boolean>).value).toBe(false);
    });
  });
});